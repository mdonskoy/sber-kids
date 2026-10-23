import type { Role, Usage } from '@proto/catalog';

export interface ScreenRequest {
  role: Role;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  retry?: { previousJson: string; errors: string[] };
}
export interface ScreenResponse {
  recipe: unknown;
  model: string;
  latencyMs: number;
  usage: Usage;
  stopReason: string;
  refusalCategory?: string | null;
}
/** One adapter per model provider. The pipeline sees only this. */
export interface ScreenModel {
  readonly name: string;
  generate(req: ScreenRequest): Promise<ScreenResponse>;
}
export class ModelUnavailableError extends Error {}
export const ZERO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
