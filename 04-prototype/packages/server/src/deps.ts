import { join } from 'node:path';
import { createStore } from '@proto/mocks';
import type { Config } from './config';
import { createModels } from './models';
import type { Deps } from './pipeline';
import { SCENARIOS_DIR, ScenarioRegistry } from './scenarios';
import { Surfaces } from './surfaces';
import { Telemetry } from './telemetry';

export function createDeps(config: Config, overrides: Partial<Deps> = {}): Deps {
  return {
    store: createStore(),
    models: createModels(config),
    telemetry: new Telemetry(join(config.logDir, 'telemetry.jsonl')),
    scenarios: new ScenarioRegistry(SCENARIOS_DIR),
    surfaces: new Surfaces(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ...overrides,
  };
}
