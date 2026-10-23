import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Telemetry, costUsd, percentile, summarize, type ScreenEvent } from '../src/telemetry';

const event = (over: Partial<ScreenEvent>): ScreenEvent => ({
  ts: '2026-10-22T00:00:00Z',
  requestId: 'r',
  role: 'young-adult',
  scenarioId: 'first-money-home',
  model: 'claude-opus-5-5',
  outcome: 'model',
  modelCalled: true,
  firstTryValid: true,
  retried: false,
  policyViolations: 0,
  issueCodes: [],
  latencyMs: 1000,
  modelLatencyMs: 900,
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  costUsd: 0.01,
  ...over,
});

describe('telemetry', () => {
  it('computes nearest-rank percentiles', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(xs, 50)).toBe(5);
    expect(percentile(xs, 95)).toBe(10);
    expect(percentile([], 95)).toBe(0);
  });

  it('prices tokens per model', () => {
    expect(costUsd('claude-opus-5-5', { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBeCloseTo(4);
    expect(costUsd('claude-opus-5-5', { inputTokens: 0, outputTokens: 1000, cacheReadTokens: 10_000, cacheWriteTokens: 0 })).toBeCloseTo(0.022);
    expect(costUsd('fake', { inputTokens: 5, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBe(0);
  });

  it('summarises only screens where a model was called', () => {
    const s = summarize([
      event({}),
      event({ outcome: 'fallback', firstTryValid: false, latencyMs: 3000 }),
      event({ outcome: 'blocked', firstTryValid: false, policyViolations: 1 }),
      event({ outcome: 'static', modelCalled: false, costUsd: 0 }),
    ]);
    expect(s).toMatchObject({ screens: 3, blocked: 1, p95LatencyMs: 3000 });
    expect(s.firstTryValidRate).toBeCloseTo(1 / 3);
    expect(s.fallbackRate).toBeCloseTo(1 / 3);
    expect(s.totalCostUsd).toBeCloseTo(0.03);
  });

  it('appends JSONL', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'tel-')), 'logs', 't.jsonl');
    const t = new Telemetry(file);
    t.record(event({}));
    t.record(event({ requestId: 'r2' }));
    expect(readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l).requestId)).toEqual(['r', 'r2']);
    expect(t.recent(1)[0].requestId).toBe('r2');
  });
});
