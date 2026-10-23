import { z } from 'zod';
import { ALL_COMPONENTS, type CatalogDef, type ComponentDef } from '@proto/catalog';
import { MISSING, resolvePointer } from './pointer';

export type RecipeComponent = { id: string; component: string; [prop: string]: unknown };
export interface Recipe { components: RecipeComponent[] }

export type IssueCode =
  | 'shape'
  | 'unknown_component'
  | 'forbidden_component'
  | 'static_only'
  | 'literal_in_bound'
  | 'bad_path'
  | 'bad_bound_value'
  | 'digits_in_text'
  | 'money_words_in_text'
  | 'link_in_text'
  | 'text_too_long'
  | 'shared_child'
  | 'duplicate_id'
  | 'root'
  | 'missing_child'
  | 'unreachable'
  | 'cycle'
  | 'max_components';

/** Violations that would harm if shown: block and refuse, never retry. */
export const POLICY_CODES: ReadonlySet<IssueCode> = new Set(['forbidden_component', 'static_only', 'literal_in_bound']);

export interface Issue { code: IssueCode; message: string; componentId?: string; prop?: string }
export interface ValidationResult { ok: boolean; issues: Issue[]; policyViolation: boolean }

const MAX_COMPONENTS = 40;
const MAX_TEXT = 200;
const DIGITS = /\p{Nd}/u;
// Amounts, rates and returns written in words. Literal copy is conversation; figures come from bound components.
// Short words are bounded by non-Cyrillic letters, so «просто» or «рубашка» pass; small counts («два способа») are fine.
const NUMBER_WORDS =
  'сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто';
const MONEY_WORDS = new RegExp(
  String.raw`₽|\$|€|%|копе|тысяч|миллион|миллиард|процент|доходност|гарант|обещ|(?<![а-яё])(?:руб(?:л|\.|(?![а-яё]))|сотн|(?:тыс\.?|млн|млрд|${NUMBER_WORDS})(?![а-яё]))`,
  'iu',
);
const LINK = /http|www\.|@/i;
const RecipeShape = z
  .object({ components: z.array(z.object({ id: z.string().min(1), component: z.string() }).passthrough()).min(1) })
  .strict();

const isPath = (v: unknown): v is { path: string } =>
  typeof v === 'object' && v !== null && Object.keys(v).length === 1 && typeof (v as { path?: unknown }).path === 'string';

export function validateRecipe(
  recipe: unknown,
  catalog: CatalogDef,
  dataModel: unknown,
  opts: { allowStatic?: boolean } = {},
): ValidationResult {
  const parsed = RecipeShape.safeParse(recipe);
  if (!parsed.success) {
    return result([{ code: 'shape', message: `Expected {"components": [...]}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` }]);
  }
  const comps = parsed.data.components as RecipeComponent[];
  const issues: Issue[] = [];
  if (comps.length > MAX_COMPONENTS) issues.push({ code: 'max_components', message: `Use at most ${MAX_COMPONENTS} components` });

  const byId = new Map<string, RecipeComponent>();
  for (const c of comps) {
    if (byId.has(c.id)) issues.push({ code: 'duplicate_id', componentId: c.id, message: `Duplicate id "${c.id}"` });
    byId.set(c.id, c);
  }

  const allowed = new Map(catalog.components.map((d) => [d.name, d]));
  for (const c of comps) {
    const def = allowed.get(c.component);
    if (!def) {
      issues.push(
        ALL_COMPONENTS.has(c.component)
          ? { code: 'forbidden_component', componentId: c.id, message: `Component ${c.component} is not allowed for role ${catalog.role}` }
          : { code: 'unknown_component', componentId: c.id, message: `Unknown component ${c.component}` },
      );
      continue;
    }
    if (def.staticOnly && !opts.allowStatic) {
      issues.push({ code: 'static_only', componentId: c.id, message: `Component ${c.component} is built by the server only` });
      continue;
    }
    checkProps(c, def, dataModel, byId, issues);
  }

  checkTree(comps, byId, allowed, issues);
  return result(issues);
}

function result(issues: Issue[]): ValidationResult {
  return { ok: issues.length === 0, issues, policyViolation: issues.some((i) => POLICY_CODES.has(i.code)) };
}

function checkProps(c: RecipeComponent, def: ComponentDef, dataModel: unknown, byId: Map<string, RecipeComponent>, issues: Issue[]) {
  const { id, component, ...props } = c;
  for (const key of Object.keys(props)) {
    if (!Object.hasOwn(def.props, key)) issues.push({ code: 'shape', componentId: id, prop: key, message: `Unknown prop "${key}" on ${component}` });
  }
  for (const [name, prop] of Object.entries(def.props)) {
    const value = props[name];
    const at = { componentId: id, prop: name };
    const label = `${component}.${name}`;
    if (value === undefined) {
      issues.push({ code: 'shape', ...at, message: `Missing prop ${label}` });
      continue;
    }
    switch (prop.kind) {
      case 'bound': {
        if (!isPath(value)) {
          issues.push({ code: 'literal_in_bound', ...at, message: `${label} must be a {"path": ...} binding to backend data, not a literal` });
          break;
        }
        const resolved = resolvePointer(dataModel, value.path);
        if (resolved === MISSING) issues.push({ code: 'bad_path', ...at, message: `${label}: path ${value.path} does not exist in the data model` });
        else if (!prop.value.safeParse(resolved).success) {
          issues.push({ code: 'bad_bound_value', ...at, message: `${label}: ${value.path} does not hold the data this prop expects` });
        }
        break;
      }
      case 'text': {
        if (typeof value === 'string') {
          if (DIGITS.test(value)) issues.push({ code: 'digits_in_text', ...at, message: `${label}: literal text must not contain digits; bind numbers via a path` });
          else if (MONEY_WORDS.test(value)) {
            issues.push({ code: 'money_words_in_text', ...at, message: `${label}: literal text must not name amounts, rates or returns; show them with a bound component` });
          } else if (LINK.test(value)) issues.push({ code: 'link_in_text', ...at, message: `${label}: literal text must not contain links or addresses` });
          else if (value.length > MAX_TEXT) issues.push({ code: 'text_too_long', ...at, message: `${label}: keep literal text under ${MAX_TEXT} characters` });
        } else if (isPath(value)) {
          if (typeof resolvePointer(dataModel, value.path) !== 'string') {
            issues.push({ code: 'bad_path', ...at, message: `${label}: ${value.path} must point to a string` });
          }
        } else {
          issues.push({ code: 'shape', ...at, message: `${label} must be a string or {"path": ...}` });
        }
        break;
      }
      case 'children': {
        if (!Array.isArray(value) || !value.every((x) => typeof x === 'string')) {
          issues.push({ code: 'shape', ...at, message: `${label} must be an array of component ids` });
          break;
        }
        for (const childId of value) {
          if (!byId.has(childId)) issues.push({ code: 'missing_child', ...at, message: `${label}: child "${childId}" is not defined` });
        }
        break;
      }
      case 'enum':
        if (!prop.values.includes(value as string)) {
          issues.push({ code: 'shape', ...at, message: `${label} must be one of: ${prop.values.join(', ')}` });
        }
        break;
    }
  }
}

function childIds(c: RecipeComponent, allowed: Map<string, ComponentDef>): string[] {
  const def = allowed.get(c.component);
  if (!def) return [];
  return Object.entries(def.props)
    .filter(([, prop]) => prop.kind === 'children')
    .flatMap(([key]) => (Array.isArray(c[key]) ? (c[key] as unknown[]).filter((x): x is string => typeof x === 'string') : []));
}

function checkTree(comps: RecipeComponent[], byId: Map<string, RecipeComponent>, allowed: Map<string, ComponentDef>, issues: Issue[]) {
  const root = byId.get('root');
  if (!root || root.component !== 'Column') {
    issues.push({ code: 'root', message: 'Exactly one component must have id "root" and it must be a Column' });
    return;
  }
  // A tree, not a DAG: a component shown twice would bypass per-screen limits such as one offer.
  const incoming = new Map<string, number>();
  for (const c of comps) for (const child of childIds(c, allowed)) incoming.set(child, (incoming.get(child) ?? 0) + 1);
  for (const [id, n] of incoming) {
    if (n > 1) issues.push({ code: 'shared_child', componentId: id, message: `"${id}" is used as a child ${n} times; each component may appear once` });
  }
  const seen = new Set<string>();
  const onPath = new Set<string>();
  const visit = (id: string) => {
    if (onPath.has(id)) {
      issues.push({ code: 'cycle', componentId: id, message: `Cycle through "${id}"` });
      return;
    }
    const c = byId.get(id);
    if (!c || seen.has(id)) return;
    seen.add(id);
    onPath.add(id);
    for (const child of childIds(c, allowed)) visit(child);
    onPath.delete(id);
  };
  visit('root');
  for (const c of comps) {
    if (!seen.has(c.id)) issues.push({ code: 'unreachable', componentId: c.id, message: `"${c.id}" is not reachable from root` });
  }
}
