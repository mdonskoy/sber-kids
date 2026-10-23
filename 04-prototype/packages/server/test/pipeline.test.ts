import { describe, expect, it, vi } from 'vitest';
import { CATALOGS, toModelJsonSchema } from '@proto/catalog';
import { createStore, selectGoal } from '@proto/mocks';
import { FakeScreenModel, type FakeStep } from '../src/adapters/fake';
import { ZERO_USAGE, type ScreenModel } from '../src/adapters/types';
import { INJECTION_TEXT } from '../src/injections';
import { LOADING_DELAY_MS, generateScreen, rerenderHome, type Deps } from '../src/pipeline';
import { SCENARIOS_DIR, ScenarioRegistry } from '../src/scenarios';
import { Surfaces } from '../src/surfaces';
import { Telemetry } from '../src/telemetry';

function makeDeps(model: ScreenModel): Deps {
  return {
    store: createStore(),
    models: { screen: 'fake', chat: 'fake-chat', get: vi.fn(() => model) },
    telemetry: new Telemetry(),
    scenarios: new ScenarioRegistry(SCENARIOS_DIR),
    surfaces: new Surfaces(),
    sleep: vi.fn(async () => {}),
  };
}
const scripted = (steps: FakeStep[]) => {
  const fake = new FakeScreenModel(steps);
  return { fake, deps: makeDeps(fake) };
};
const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });
const valid = { components: [root('t'), { id: 't', component: 'Text', text: { path: '/me/greeting' }, variant: 'title' }] };
const invalid = { components: [root('t'), { id: 't', component: 'GoalPicker', goals: { path: '/nope' } }] };
const ways = { components: [root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }] };
const literalWays = { components: [root('w'), { id: 'w', component: 'WaysToGoal', ways: { title: 'Как копить', target: 10000000 }, set: 'big' }] };
const ya = { role: 'young-adult', scenarioId: 'first-money-home' } as const;
const comps = (r: { messages: any[] }) => r.messages[2].updateComponents.components.map((c: any) => c.component);
const data = (r: { messages: any[] }) => r.messages[1].updateDataModel.value;

/** A model step that answers only when the test says so. */
function held(recipe: unknown) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return { step: async () => (await gate, recipe), release };
}

describe('generateScreen and time', () => {
  it('emits the data as it is when the model answers, not when it was asked (FR-011)', async () => {
    const h = held(valid);
    const { deps } = scripted([h.step]);
    const pending = generateScreen(ya, deps);
    selectGoal(deps.store, 'cushion'); // the user picks a goal meanwhile
    h.release();
    expect(data(await pending).goal.id).toBe('cushion');
  });

  it('a request that started earlier never replaces a later screen; reset drops in-flight work', async () => {
    const a = held(valid);
    const b = held(valid);
    const { deps } = scripted([a.step, b.step]);
    const first = generateScreen(ya, deps);
    const second = generateScreen({ role: 'young-adult', scenarioId: 'first-money-chat' }, deps);
    b.release();
    const later = await second;
    a.release();
    await first;
    expect(deps.surfaces.currentOf('young-adult')!.surfaceId).toBe(later.surfaceId);
    expect(deps.surfaces.homeOf('young-adult')!.surfaceId).toBe(later.surfaceId);

    const c = held(valid);
    const again = scripted([c.step]);
    const inFlight = generateScreen(ya, again.deps);
    again.deps.surfaces = new Surfaces(); // /api/reset
    c.release();
    await inFlight;
    expect(again.deps.surfaces.currentOf('young-adult')).toBeUndefined();
  });
});

describe('generateScreen', () => {
  it('returns a valid first-try screen as A2UI messages from the role catalog (FR-001, FR-002)', async () => {
    const { fake, deps } = scripted([valid]);
    const r = await generateScreen(ya, deps);
    expect(r.debug.outcome).toBe('model');
    expect((r.messages[0] as any).createSurface.catalogId).toBe(CATALOGS['young-adult'].id);
    expect(comps(r)).toEqual(['Column', 'Text']);
    expect(data(r).banner.amount).toBe(45000);
    expect(fake.calls[0].schema).toEqual(toModelJsonSchema(CATALOGS['young-adult']));
    expect(fake.calls[0].system).toContain('- GoalPicker:');
    expect(deps.telemetry.summary().firstTryValidRate).toBe(1);
  });

  it('retries once with the validation errors, then accepts (FR-004)', async () => {
    const { fake, deps } = scripted([invalid, valid]);
    const r = await generateScreen(ya, deps);
    expect(r.debug.outcome).toBe('retry');
    expect(fake.calls[1].retry?.errors[0]).toContain('/nope');
  });

  it('falls back to the rule-based screen after two invalid answers (FR-004)', async () => {
    const { deps } = scripted([invalid, invalid]);
    const r = await generateScreen(ya, deps);
    expect(r.debug.outcome).toBe('fallback');
    expect(comps(r)).toEqual(expect.arrayContaining(['Notice', 'FirstMoneyBanner']));
  });

  it('falls back at once when the call fails, well within 1 s', async () => {
    const { fake, deps } = scripted([new Error('boom')]);
    const r = await generateScreen(ya, deps);
    expect(r.debug.outcome).toBe('fallback');
    expect(r.debug.attempts).toEqual([expect.objectContaining({ error: 'boom' })]);
    expect(r.debug.latencyMs).toBeLessThan(1000);
    expect(fake.calls).toHaveLength(1);
  });

  it('falls back when the model refuses', async () => {
    const refusing: ScreenModel = {
      name: 'r',
      generate: async () => ({ recipe: null, model: 'r', latencyMs: 1, usage: { ...ZERO_USAGE }, stopReason: 'refusal', refusalCategory: 'cyber' }),
    };
    const r = await generateScreen(ya, makeDeps(refusing));
    expect(r.debug.outcome).toBe('fallback');
    expect(r.debug.attempts[0].error).toContain('cyber');
  });

  it('blocks a policy violation with a refusal screen and does not retry (FR-031)', async () => {
    const { fake, deps } = scripted([literalWays]);
    const r = await generateScreen(ya, deps);
    expect(r.debug.outcome).toBe('blocked');
    expect(fake.calls).toHaveLength(1);
    expect(comps(r)).toEqual(['Column', 'Refusal']);
    expect(data(r).static.refusal.code).toBe('not_available');
    expect(deps.telemetry.summary().blocked).toBe(1);
  });

  it('uses the chat model for the young adult', async () => {
    const { deps } = scripted([{ components: [root('t'), { id: 't', component: 'Text', text: { path: '/me/greeting' }, variant: 'title' }] }]);
    deps.scenarios = { get: () => ({ id: 's', roles: ['young-adult'], title: 's', clock: '10:00', instruction: 'x' }) } as any;
    await generateScreen({ role: 'young-adult', scenarioId: 's' }, deps);
    expect(deps.models.get).toHaveBeenCalledWith('fake-chat');
  });

  it('re-renders the home screen with fresh data, dropping cards whose data is gone', async () => {
    const { deps } = scripted([ways]);
    selectGoal(deps.store, 'apartment');
    await generateScreen({ role: 'young-adult', scenarioId: 'first-money-chat' }, deps);
    deps.store = createStore(); // the data changed: no goal any more
    const r = rerenderHome('young-adult', deps)!;
    expect(r.debug.outcome).toBe('cached');
    expect(comps(r)).not.toContain('WaysToGoal');
    expect(data(r).ways).toBeNull();
  });
});

describe('forced states (FR-030)', () => {
  it('loading waits before answering', async () => {
    const { deps } = scripted([valid]);
    await generateScreen({ ...ya, force: 'loading' }, deps);
    expect(deps.sleep).toHaveBeenCalledWith(LOADING_DELAY_MS);
  });

  it('refusal and handoff are static and call no model', async () => {
    const { fake, deps } = scripted([]);
    expect(comps(await generateScreen({ ...ya, force: 'refusal' }, deps))).toEqual(['Column', 'Refusal']);
    expect(comps(await generateScreen({ ...ya, force: 'handoff' }, deps))).toEqual(['Column', 'Handoff']);
    expect(fake.calls).toHaveLength(0);
  });

  it('model_error shows the fallback without calling the model', async () => {
    const { fake, deps } = scripted([]);
    expect((await generateScreen({ ...ya, force: 'model_error' }, deps)).debug.outcome).toBe('fallback');
    expect(fake.calls).toHaveLength(0);
  });

  it('injection_text sends the injection as the user request', async () => {
    const { fake, deps } = scripted([valid]);
    await generateScreen({ ...ya, force: 'injection_text' }, deps);
    expect(fake.calls[0].user).toContain(INJECTION_TEXT['young-adult']);
  });

  it('injection_recipe replaces the model output with a server-built component, which is blocked', async () => {
    const { deps } = scripted([valid]);
    expect((await generateScreen({ ...ya, force: 'injection_recipe' }, deps)).debug.outcome).toBe('blocked');
  });
});
