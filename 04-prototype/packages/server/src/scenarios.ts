import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { RoleSchema, type Role } from '@proto/catalog';

export const SCENARIOS_DIR = fileURLToPath(new URL('../scenarios', import.meta.url));

export const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  roles: z.array(RoleSchema).min(1),
  title: z.string().min(1),
  clock: z.string().regex(/^\d\d:\d\d$/),
  instruction: z.string().min(1),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export class UnknownScenarioError extends Error {}

/** Reads the directory on every call: an edited or added file takes effect with no restart and no client rebuild (FR-032). */
export class ScenarioRegistry {
  constructor(private readonly dir: string) {}

  all(): Scenario[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ScenarioSchema.parse(JSON.parse(readFileSync(join(this.dir, f), 'utf8'))))
      .sort((a, b) => a.clock.localeCompare(b.clock) || a.id.localeCompare(b.id));
  }

  list(role: Role): Scenario[] {
    return this.all().filter((s) => s.roles.includes(role));
  }

  get(id: string, role: Role): Scenario {
    const found = this.list(role).find((s) => s.id === id);
    if (!found) throw new UnknownScenarioError(`No scenario "${id}" for role ${role}`);
    return found;
  }
}
