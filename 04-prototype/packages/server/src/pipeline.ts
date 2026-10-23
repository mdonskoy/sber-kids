import { randomUUID } from 'node:crypto';
import {
  CATALOGS,
  toModelJsonSchema,
  type AttemptView,
  type ForceState,
  type Handoff,
  type Outcome,
  type Refusal,
  type Role,
  type ScreenDebug,
  type ScreenResult,
  type Usage,
} from '@proto/catalog';
import { buildDataModel, type DataModel, type Store } from '@proto/mocks';
import { ZERO_USAGE } from './adapters/types';
import { ruleBasedScreen } from './fallback';
import { INJECTED_RECIPE, INJECTION_TEXT } from './injections';
import { screenMessages } from './messages';
import type { Models } from './models';
import { buildSystemPrompt, buildUserTurn } from './prompt';
import type { ScenarioRegistry } from './scenarios';
import { handoffScreen, refusalScreen, type StaticScreen } from './staticScreens';
import type { Surfaces } from './surfaces';
import { costUsd, type Telemetry } from './telemetry';
import { validateRecipe, type Recipe } from './validate';

export interface Deps {
  store: Store;
  models: Models;
  telemetry: Telemetry;
  scenarios: ScenarioRegistry;
  surfaces: Surfaces;
  sleep: (ms: number) => Promise<void>;
}
export interface ScreenInput { role: Role; scenarioId: string; userText?: string; force?: ForceState; model?: string; history?: string[] }

export const LOADING_DELAY_MS = 3000;

/**
 * `store`, `surfaces` and `ticket` are captured when the request starts: after /api/reset swaps them,
 * an in-flight generation lands in the discarded objects and cannot touch the fresh demo.
 */
interface Ctx { requestId: string; role: Role; scenarioId: string; clock: string; started: number; store: Store; surfaces: Surfaces; ticket: number }

const begin = (deps: Deps) => ({ store: deps.store, surfaces: deps.surfaces, ticket: deps.surfaces.ticket() });
/** `model` starts as the requested model and becomes the one that answered (server-side fallback may switch it). */
interface Run { outcome: Outcome; model: string; attempts: AttemptView[]; usage: Usage; costUsd: number }

const noModel = (outcome: Outcome): Run => ({ outcome, model: 'none', attempts: [], usage: { ...ZERO_USAGE }, costUsd: 0 });
const failed = (latencyMs: number, error: string, stopReason?: string): AttemptView => ({
  recipe: null,
  issues: [],
  valid: false,
  policyViolation: false,
  latencyMs,
  error,
  stopReason,
});

function addUsage(into: Usage, u: Usage) {
  into.inputTokens += u.inputTokens;
  into.outputTokens += u.outputTokens;
  into.cacheReadTokens += u.cacheReadTokens;
  into.cacheWriteTokens += u.cacheWriteTokens;
}

export function refusalFor(role: Role, dataModel: DataModel): Refusal {
  const refusals = dataModel.refusals as Record<string, Refusal>;
  return refusals.notAvailable;
}

export async function generateScreen(input: ScreenInput, deps: Deps): Promise<ScreenResult> {
  const scenario = deps.scenarios.get(input.scenarioId, input.role);
  const force = input.force ?? 'none';
  const ctx: Ctx = {
    requestId: randomUUID(),
    role: input.role,
    scenarioId: scenario.id,
    clock: scenario.clock,
    started: performance.now(),
    ...begin(deps),
  };
  const dataModel = buildDataModel(input.role, ctx.store, { clock: ctx.clock });
  if (force === 'loading') await deps.sleep(LOADING_DELAY_MS);
  if (force === 'refusal') return emit(ctx, refusalScreen(refusalFor(input.role, dataModel)), dataModel, deps, noModel('static'));
  if (force === 'handoff') return emit(ctx, handoffScreen(dataModel.handoff as Handoff), dataModel, deps, noModel('static'));

  const catalog = CATALOGS[input.role];
  const modelName = input.model ?? (input.role === 'young-adult' ? deps.models.chat : deps.models.screen);
  const system = buildSystemPrompt(catalog);
  const schema = toModelJsonSchema(catalog);
  const userText = force === 'injection_text' ? INJECTION_TEXT[input.role] : input.userText;
  const user = buildUserTurn({ scenario, dataModel, userText, history: input.history });
  const run: Run = { outcome: 'fallback', model: modelName, attempts: [], usage: { ...ZERO_USAGE }, costUsd: 0 };
  let recipe: Recipe | null = null;

  for (let i = 0; i < 2 && recipe === null && run.outcome !== 'blocked'; i++) {
    const t0 = performance.now();
    const prev = run.attempts[i - 1];
    try {
      if (force === 'model_error') throw new Error('Forced model error (debug toggle)');
      const res = await deps.models.get(modelName).generate({
        role: input.role,
        system,
        user,
        schema,
        retry: prev && { previousJson: JSON.stringify(prev.recipe), errors: prev.issues.map((x) => x.message) },
      });
      addUsage(run.usage, res.usage);
      run.costUsd += costUsd(res.model, res.usage); // priced per call by the model that answered
      run.model = res.model;
      if (res.stopReason === 'refusal') {
        run.attempts.push(failed(res.latencyMs, `Model refused (${res.refusalCategory ?? 'no category'})`, res.stopReason));
        break;
      }
      const candidate = force === 'injection_recipe' ? INJECTED_RECIPE[input.role] : res.recipe;
      const v = validateRecipe(candidate, catalog, dataModel);
      run.attempts.push({ recipe: candidate, issues: v.issues, valid: v.ok, policyViolation: v.policyViolation, latencyMs: res.latencyMs, stopReason: res.stopReason });
      if (v.policyViolation) run.outcome = 'blocked';
      else if (v.ok) {
        recipe = candidate as Recipe;
        run.outcome = i === 0 ? 'model' : 'retry';
      }
    } catch (err) {
      // A failed call is not retried: the fallback shows at once.
      run.attempts.push(failed(Math.round(performance.now() - t0), err instanceof Error ? err.message : String(err)));
      break;
    }
  }

  // The store may have changed while the model was thinking (the user picked a goal, FR-011):
  // emit the data as it is now, and re-check the chosen recipe against it.
  const fresh = buildDataModel(input.role, ctx.store, { clock: ctx.clock });
  if (run.outcome === 'blocked') return emit(ctx, refusalScreen(refusalFor(input.role, fresh)), fresh, deps, run);
  if (recipe && !validateRecipe(recipe, catalog, fresh).ok) {
    recipe = null;
    run.outcome = 'fallback';
  }
  const screen = { recipe: recipe ?? ruleBasedScreen(input.role, fresh, { notice: true, scenarioId: scenario.id }) };
  return emit(ctx, screen, fresh, deps, run);
}

/** A server-built screen for an action result. */
export function staticScreenFor(role: Role, screen: StaticScreen, deps: Deps): ScreenResult {
  const cur = deps.surfaces.currentOf(role);
  const ctx: Ctx = { requestId: randomUUID(), role, scenarioId: cur?.scenarioId ?? 'action', clock: cur?.clock ?? '19:30', started: performance.now(), ...begin(deps) };
  return emit(ctx, screen, buildDataModel(role, ctx.store, { clock: ctx.clock }), deps, noModel('static'));
}

/** The plan in the chat again — the ways to the goal and the quick replies — laid out by the fixed rules, without a model call. */
export function planScreen(role: Role, scenarioId: string, reply: string, deps: Deps): ScreenResult {
  const cur = deps.surfaces.currentOf(role);
  const ctx: Ctx = { requestId: randomUUID(), role, scenarioId, clock: cur?.clock ?? '19:30', started: performance.now(), ...begin(deps) };
  const dataModel = buildDataModel(role, ctx.store, { clock: ctx.clock });
  return emit(ctx, { recipe: ruleBasedScreen(role, dataModel, { notice: false, scenarioId, waysReply: reply }) }, dataModel, deps, noModel('cached'));
}

/** Re-emits the last generated screen of a role with fresh data, without a model call. */
export function rerenderHome(role: Role, deps: Deps): ScreenResult | null {
  const home = deps.surfaces.homeOf(role);
  if (!home) return null;
  const ctx: Ctx = { requestId: randomUUID(), role, scenarioId: home.scenarioId, clock: home.clock, started: performance.now(), ...begin(deps) };
  const dataModel = buildDataModel(role, ctx.store, { clock: home.clock });
  const stillValid = validateRecipe(home.recipe, CATALOGS[role], dataModel).ok;
  const recipe = stillValid ? home.recipe : ruleBasedScreen(role, dataModel, { notice: false, scenarioId: home.scenarioId });
  return emit(ctx, { recipe }, dataModel, deps, noModel('cached'));
}

function emit(ctx: Ctx, screen: { recipe: Recipe; data?: Record<string, unknown> }, dataModel: DataModel, deps: Deps, run: Run): ScreenResult {
  const catalog = CATALOGS[ctx.role];
  const isStatic = screen.data !== undefined;
  const data = isStatic ? { ...dataModel, ...screen.data } : dataModel;
  const check = validateRecipe(screen.recipe, catalog, data, { allowStatic: isStatic });
  if (!check.ok) throw new Error(`Server-built screen is invalid: ${check.issues.map((i) => i.message).join('; ')}`);

  const surfaceId = ctx.surfaces.nextId(ctx.role);
  ctx.surfaces.add({
    surfaceId,
    role: ctx.role,
    scenarioId: ctx.scenarioId,
    clock: ctx.clock,
    recipe: screen.recipe,
    staticData: screen.data,
    generated: !isStatic,
  }, ctx.ticket);
  const latencyMs = Math.round(performance.now() - ctx.started);
  const cost = run.costUsd;
  const debug: ScreenDebug = {
    requestId: ctx.requestId,
    role: ctx.role,
    scenarioId: ctx.scenarioId,
    model: run.model,
    outcome: run.outcome,
    attempts: run.attempts,
    recipe: screen.recipe,
    latencyMs,
    usage: run.usage,
    costUsd: cost,
  };
  deps.telemetry.record({
    ts: new Date().toISOString(),
    requestId: ctx.requestId,
    role: ctx.role,
    scenarioId: ctx.scenarioId,
    model: run.model,
    outcome: run.outcome,
    modelCalled: run.attempts.length > 0,
    firstTryValid: run.attempts[0]?.valid === true,
    retried: run.attempts.length > 1,
    policyViolations: run.attempts.filter((a) => a.policyViolation).length,
    issueCodes: run.attempts.flatMap((a) => a.issues.map((i) => i.code)),
    latencyMs,
    modelLatencyMs: run.attempts.reduce((sum, a) => sum + a.latencyMs, 0),
    usage: run.usage,
    costUsd: cost,
  });
  return { surfaceId, messages: screenMessages(surfaceId, catalog.id, screen.recipe, data), debug };
}
