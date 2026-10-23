import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig, loadDotEnv, startupWarning } from './config';
import { createDeps } from './deps';

loadDotEnv();
const config = loadConfig();
const app = createApp(createDeps(config), { webDist: config.webDist });
const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Prototype on http://localhost:${info.port} · model ${config.screenModel} · effort ${config.effort}`);
  if (!config.webDist) console.log('Web app not built: run `npm run build`, or use `npm run dev` for the Vite dev server.');
  const warning = startupWarning(config);
  if (warning) console.warn(warning);
});

// As PID 1 in a container nothing else handles the stop signal.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
