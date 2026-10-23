import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { FORCE_STATES, MODEL_CHOICES, RoleSchema } from '@proto/catalog';
import { createStore } from '@proto/mocks';
import { handleAction } from './actions';
import { chatTurn } from './chat';
import { dataMessage } from './messages';
import { generateScreen, type Deps } from './pipeline';
import { UnknownScenarioError } from './scenarios';
import { Surfaces, dataFor } from './surfaces';

const ScreenBody = z.object({
  scenarioId: z.string(),
  userText: z.string().max(500).optional(),
  force: z.enum(FORCE_STATES).optional(),
  model: z.enum(MODEL_CHOICES).optional(),
});
const TurnBody = z.object({ text: z.string().max(500), force: z.enum(FORCE_STATES).optional(), model: z.enum(MODEL_CHOICES).optional() });
const ActionBody = z.object({
  name: z.string(),
  surfaceId: z.string(),
  sourceComponentId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

class BadJsonError extends Error {}
const readJson = (c: Context): Promise<unknown> =>
  c.req.json().catch(() => {
    throw new BadJsonError('Body is not valid JSON');
  });

export function createApp(deps: Deps, opts: { webDist?: string | null } = {}) {
  const app = new Hono();
  const roleOf = (c: Context) => RoleSchema.parse(c.req.param('role'));

  app.onError((err, c) => {
    if (err instanceof z.ZodError) return c.json({ error: 'bad_request', issues: err.issues }, 400);
    if (err instanceof BadJsonError) return c.json({ error: 'bad_request', message: err.message }, 400);
    if (err instanceof UnknownScenarioError) return c.json({ error: 'unknown_scenario', message: err.message }, 404);
    console.error(err);
    return c.json({ error: 'internal', message: err.message }, 500);
  });

  app.use('/api/*', bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }));
  app.get('/api/health', (c) => c.json({ ok: true }));
  app.get('/api/scenarios', (c) => {
    const role = RoleSchema.parse(c.req.query('role'));
    return c.json({ scenarios: deps.scenarios.list(role).map(({ id, title, clock }) => ({ id, title, clock })) });
  });
  app.post('/api/screen/:role', async (c) => {
    const role = roleOf(c);
    return c.json(await generateScreen({ role, ...ScreenBody.parse(await readJson(c)) }, deps));
  });
  app.post('/api/turn/:role', async (c) => {
    if (roleOf(c) !== 'young-adult') return c.json({ error: 'bad_request', message: 'Chat turns exist only for young-adult' }, 400);
    const { text, ...opts } = TurnBody.parse(await readJson(c));
    return c.json(await chatTurn(text, deps, opts));
  });
  app.post('/api/action/:role', async (c) => {
    const role = roleOf(c);
    const body = ActionBody.parse(await readJson(c));
    return c.json(await handleAction({ role, name: body.name, surfaceId: body.surfaceId, context: body.context ?? {} }, deps));
  });
  app.get('/api/data/:role', (c) => {
    const role = roleOf(c);
    const id = c.req.query('surfaceId');
    const entry = id ? deps.surfaces.get(id) : deps.surfaces.currentOf(role);
    return c.json({ messages: entry && entry.role === role ? [dataMessage(entry.surfaceId, dataFor(entry, deps.store))] : [] });
  });
  app.get('/api/telemetry', (c) => c.json({ summary: deps.telemetry.summary(), recent: deps.telemetry.recent(20) }));
  app.post('/api/reset', (c) => {
    deps.store = createStore();
    deps.surfaces = new Surfaces();
    return c.json({ ok: true });
  });

  if (opts.webDist) {
    // @hono/node-server 2.1.5 joins root and path with node:path, so an absolute root works.
    app.use('/*', serveStatic({ root: opts.webDist }));
    app.get('*', serveStatic({ root: opts.webDist, path: 'index.html' }));
  }
  return app;
}
