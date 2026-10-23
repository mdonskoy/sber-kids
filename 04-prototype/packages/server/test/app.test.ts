import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createStore, selectGoal } from '@proto/mocks';
import { ZERO_USAGE, type ScreenModel } from '../src/adapters/types';
import { createApp } from '../src/app';
import type { Deps } from '../src/pipeline';
import { SCENARIOS_DIR, ScenarioRegistry } from '../src/scenarios';
import { Surfaces } from '../src/surfaces';
import { Telemetry } from '../src/telemetry';

const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });
const VALID = { components: [root('t'), { id: 't', component: 'Text', text: { path: '/me/greeting' }, variant: 'title' }] };
const echo: ScreenModel = {
  name: 'fake',
  generate: async () => ({ recipe: VALID, model: 'fake', latencyMs: 1, usage: { ...ZERO_USAGE }, stopReason: 'end_turn' }),
};
function setup(webDist?: string) {
  const deps: Deps = {
    store: createStore(),
    models: { screen: 'fake', chat: 'fake', get: () => echo },
    telemetry: new Telemetry(),
    scenarios: new ScenarioRegistry(SCENARIOS_DIR),
    surfaces: new Surfaces(),
    sleep: vi.fn(async () => {}),
  };
  return { deps, app: createApp(deps, { webDist }) };
}
const post = (app: any, path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('HTTP API', () => {
  it('serves health and scenarios', async () => {
    const { app } = setup();
    expect(await (await app.request('/api/health')).json()).toEqual({ ok: true });
    const res = await (await app.request('/api/scenarios?role=young-adult')).json();
    expect(res.scenarios).toEqual([
      { id: 'first-money-home', title: 'Главная СБОЛ', clock: '10:00' },
      { id: 'first-money-chat', title: 'Первые деньги: разговор', clock: '10:05' },
    ]);
  });

  it('generates a screen', async () => {
    const { app } = setup();
    const res = await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(3);
    expect(body.debug.outcome).toBe('model');
  });

  it('rejects bad input', async () => {
    const { app } = setup();
    expect((await post(app, '/api/screen/robot', { scenarioId: 'first-money-home' })).status).toBe(400);
    expect((await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home', model: 'gpt-5' })).status).toBe(400);
    expect((await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home', force: 'explode' })).status).toBe(400);
    expect((await post(app, '/api/screen/young-adult', { scenarioId: 'nope' })).status).toBe(404);
  });

  it('refuses an oversized body with 413 and malformed JSON with 400', async () => {
    const { app } = setup();
    expect((await post(app, '/api/turn/young-adult', { text: 'а', pad: 'я'.repeat(20_000) })).status).toBe(413);
    for (const path of ['/api/screen/young-adult', '/api/turn/young-adult', '/api/action/young-adult']) {
      const res = await app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"text":' });
      expect(res.status).toBe(400);
    }
  });

  it('serves fresh data for a surface, and nothing for an unknown one', async () => {
    const { app, deps } = setup();
    const home = await (await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home' })).json();
    selectGoal(deps.store, 'cushion');
    const fresh = await (await app.request(`/api/data/young-adult?surfaceId=${home.surfaceId}`)).json();
    expect(fresh.messages[0]).toMatchObject({ updateDataModel: { surfaceId: home.surfaceId } });
    expect(fresh.messages[0].updateDataModel.value.goal.id).toBe('cushion');
    expect((await (await app.request('/api/data/young-adult?surfaceId=nope-1')).json()).messages).toEqual([]);
  });

  it('never reuses a surface id after a reset or a new boot', async () => {
    const { app } = setup();
    const before = await (await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home' })).json();
    await post(app, '/api/reset', {});
    const after = await (await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home' })).json();
    expect(after.surfaceId).not.toBe(before.surfaceId);
    expect(new Surfaces().nextId('young-adult')).not.toBe(new Surfaces().nextId('young-adult'));
  });

  it('reports telemetry and resets the demo', async () => {
    const { app, deps } = setup();
    await post(app, '/api/screen/young-adult', { scenarioId: 'first-money-home' });
    expect((await (await app.request('/api/telemetry')).json()).summary.screens).toBe(1);
    selectGoal(deps.store, 'cushion');
    await post(app, '/api/reset', {});
    expect(deps.store.youngAdult.goalId).toBeNull();
    expect((await (await app.request('/api/data/young-adult')).json()).messages).toEqual([]);
  });

  it('serves the built web app', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Прототип</title>');
    const { app } = setup(dir);
    expect(await (await app.request('/')).text()).toContain('Прототип');
    expect(await (await app.request('/some/deep/link')).text()).toContain('Прототип');
  });
});
