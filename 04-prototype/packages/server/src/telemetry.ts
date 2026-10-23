import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Outcome, Role, TelemetrySummary, Usage } from '@proto/catalog';

export interface ScreenEvent {
  ts: string;
  requestId: string;
  role: Role;
  scenarioId: string;
  model: string;
  outcome: Outcome;
  modelCalled: boolean;
  firstTryValid: boolean;
  retried: boolean;
  policyViolations: number;
  issueCodes: string[];
  latencyMs: number;
  modelLatencyMs: number;
  usage: Usage;
  costUsd: number;
}

// $ per million tokens. Source: claude-api skill model table (cached 2026-10-06).
// Cache writes: 1.25x input (5-minute TTL). Haiku 5.5 cache read assumed 0.1x input.
export const PRICES_PER_MTOK: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export function costUsd(model: string, u: Usage): number {
  // The API may answer with a dated id (`claude-sonnet-5-5-YYYYMMDD`), so match by prefix.
  const p = PRICES_PER_MTOK[model] ?? Object.entries(PRICES_PER_MTOK).find(([k]) => model.startsWith(k))?.[1];
  if (!p) {
    if (u.inputTokens + u.outputTokens > 0) console.warn(`[telemetry] no price for model ${model}; cost recorded as 0`);
    return 0;
  }
  return (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) / 1e6;
}

/** Nearest-rank percentile. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

export function summarize(events: ScreenEvent[]): TelemetrySummary {
  const gen = events.filter((e) => e.modelCalled);
  const n = gen.length;
  const rate = (k: number) => (n ? k / n : 0);
  const total = gen.reduce((sum, e) => sum + e.costUsd, 0);
  const latencies = gen.map((e) => e.latencyMs);
  return {
    screens: n,
    firstTryValidRate: rate(gen.filter((e) => e.firstTryValid).length),
    fallbackRate: rate(gen.filter((e) => e.outcome === 'fallback').length),
    blocked: gen.filter((e) => e.outcome === 'blocked').length,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    meanCostUsd: n ? total / n : 0,
    totalCostUsd: total,
  };
}

export class Telemetry {
  private readonly events: ScreenEvent[] = [];

  constructor(private readonly file?: string, private readonly cap = 1000) {
    if (file) mkdirSync(dirname(file), { recursive: true });
  }

  record(e: ScreenEvent): void {
    this.events.push(e);
    if (this.events.length > this.cap) this.events.shift();
    if (this.file) appendFileSync(this.file, `${JSON.stringify(e)}\n`);
  }

  recent(n = 50): ScreenEvent[] {
    return this.events.slice(-n);
  }

  all(): ScreenEvent[] {
    return [...this.events];
  }

  summary(): TelemetrySummary {
    return summarize(this.events);
  }
}
