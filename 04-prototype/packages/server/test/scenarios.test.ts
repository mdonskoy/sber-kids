import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIOS_DIR, ScenarioRegistry, UnknownScenarioError } from '../src/scenarios';

const scenario = (id: string, clock: string, roles = ['young-adult']) => JSON.stringify({ id, roles, title: id, clock, instruction: 'x' });

describe('ScenarioRegistry', () => {
  it('loads the shipped scenarios, sorted by clock', () => {
    const reg = new ScenarioRegistry(SCENARIOS_DIR);
    expect(reg.list('young-adult').map((s) => s.id)).toEqual(['first-money-home', 'first-money-chat']);
  });

  it('picks up a new scenario file without a restart (FR-032)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scn-'));
    writeFileSync(join(dir, 'a.json'), scenario('a', '09:00'));
    const reg = new ScenarioRegistry(dir);
    expect(reg.list('young-adult').map((s) => s.id)).toEqual(['a']);
    writeFileSync(join(dir, 'b.json'), scenario('b', '08:00'));
    expect(reg.list('young-adult').map((s) => s.id)).toEqual(['b', 'a']);
    expect(reg.get('b', 'young-adult').clock).toBe('08:00');
  });

  it('rejects unknown ids and scenarios of another role', () => {
    const reg = new ScenarioRegistry(SCENARIOS_DIR);
    expect(() => reg.get('nope', 'young-adult')).toThrow(UnknownScenarioError);
    expect(() => reg.get('first-money-home', 'kid' as any)).toThrow(UnknownScenarioError);
  });
});
