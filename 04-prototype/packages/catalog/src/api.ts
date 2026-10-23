import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { Role } from './catalogs';

// HTTP contract between server and web.

export const FORCE_STATES = ['none', 'loading', 'model_error', 'refusal', 'handoff', 'injection_text', 'injection_recipe'] as const;
export type ForceState = (typeof FORCE_STATES)[number];

export const MODEL_CHOICES = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'gigachat-stub'] as const;
export type ModelChoice = (typeof MODEL_CHOICES)[number];

/** model: valid first try · retry: valid after one retry · fallback: rule-based screen ·
 *  blocked: policy violation, refusal shown · static: server-built screen · cached: home re-rendered with fresh data */
export type Outcome = 'model' | 'retry' | 'fallback' | 'blocked' | 'static' | 'cached';

export interface Usage { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }
export interface IssueView { code: string; message: string; componentId?: string; prop?: string }
export interface AttemptView {
  recipe: unknown;
  issues: IssueView[];
  valid: boolean;
  policyViolation: boolean;
  latencyMs: number;
  stopReason?: string;
  error?: string;
}
export interface ScreenDebug {
  requestId: string;
  role: Role;
  scenarioId: string;
  model: string;
  outcome: Outcome;
  attempts: AttemptView[];
  recipe: unknown;
  latencyMs: number;
  usage: Usage;
  costUsd: number;
}
export interface ScreenResult { surfaceId: string; messages: A2uiMessage[]; debug: ScreenDebug }
export type ActionResult =
  /** echo: what the tap said, shown in the chat as the user's message before the answer. */
  | { kind: 'screen'; screen: ScreenResult; refresh: Role[]; echo?: string }
  | { kind: 'data'; messages: A2uiMessage[]; refresh: Role[] };

export interface ScreenRequestBody { scenarioId: string; userText?: string; force?: ForceState; model?: ModelChoice }
export interface ActionBody { name: string; surfaceId: string; sourceComponentId?: string; context?: Record<string, unknown> }
export interface ScenarioView { id: string; title: string; clock: string }
export interface TelemetrySummary {
  screens: number;
  firstTryValidRate: number;
  fallbackRate: number;
  blocked: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  meanCostUsd: number;
  totalCostUsd: number;
}
