import { describe, expect, it } from 'vitest';
import { loadConfig, startupWarning } from '../src/config';

describe('loadConfig effort', () => {
  it('reads MODEL_EFFORT and ignores the parent Claude Code session CLAUDE_EFFORT', () => {
    expect(loadConfig({ MODEL_EFFORT: 'low', CLAUDE_EFFORT: 'high' }).effort).toBe('low');
  });
  it('defaults to medium', () => {
    expect(loadConfig({}).effort).toBe('medium');
  });
});

describe('startupWarning', () => {
  it('warns when api auth has no key, and only then', () => {
    expect(startupWarning(loadConfig({}), {})).toMatch(/ANTHROPIC_API_KEY.*only rule-built screens/);
    expect(startupWarning(loadConfig({}), { ANTHROPIC_API_KEY: 'k' })).toBeNull();
    expect(startupWarning(loadConfig({ CLAUDE_AUTH: 'subscription' }), {})).toBeNull();
  });
});
