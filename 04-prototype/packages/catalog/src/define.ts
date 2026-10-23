import { z } from 'zod';
import { DataBindingSchema, childList } from '@a2ui/web_core/v0_9';

// Prop kinds. Each carries the Zod schema the A2UI binder reads and the metadata
// the server uses to build the model schema and the validator. Descriptions stay
// here, not in Zod: .describe() would clobber A2UI's REF markers.

/** Literal Russian copy, or a {path} to a string. Literal copy must not contain digits (validator). */
export function text(description: string) {
  return { kind: 'text' as const, description, schema: z.union([z.string(), DataBindingSchema]) };
}

/** Path-only binding to backend data; the value at the path must satisfy `value`. */
export function bound<V extends z.ZodTypeAny>(value: V, description: string) {
  return { kind: 'bound' as const, description, value, schema: z.union([DataBindingSchema, value]) };
}

/** Ordered child component ids. */
export function children(description = 'Ids of child components in display order') {
  return { kind: 'children' as const, description, schema: childList() };
}

export function oneOf<const T extends readonly [string, ...string[]]>(values: T, description: string) {
  return { kind: 'enum' as const, description, values, schema: z.enum(values) };
}

export type TextProp = ReturnType<typeof text>;
export type BoundProp = ReturnType<typeof bound>;
export type ChildrenProp = ReturnType<typeof children>;
export type EnumProp = ReturnType<typeof oneOf<readonly [string, ...string[]]>>;
export type PropDef = TextProp | BoundProp | ChildrenProp | EnumProp;

export interface ComponentDef<P extends Record<string, PropDef> = Record<string, PropDef>> {
  name: string;
  description: string;
  props: P;
  /** Rendered only on server-built static screens; never offered to the model. */
  staticOnly: boolean;
  api: { name: string; schema: z.ZodObject<{ [K in keyof P]: P[K]['schema'] }> };
}

export function defineComponent<P extends Record<string, PropDef>>(
  name: string,
  description: string,
  props: P,
  opts: { staticOnly?: boolean } = {},
): ComponentDef<P> {
  const shape = Object.fromEntries(Object.entries(props).map(([key, prop]) => [key, prop.schema])) as {
    [K in keyof P]: P[K]['schema'];
  };
  return { name, description, props, staticOnly: opts.staticOnly ?? false, api: { name, schema: z.object(shape) } };
}
