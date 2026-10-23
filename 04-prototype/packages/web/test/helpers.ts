import type { Role, ScreenResult } from '@proto/catalog';
import { CATALOGS } from '@proto/catalog';

/** A ScreenResult as the server would send it, for fetch stubs. */
export function screenResult(role: Role, surfaceId: string, components: unknown[], data: unknown): ScreenResult {
  return {
    surfaceId,
    messages: [
      { version: 'v0.9', createSurface: { surfaceId, catalogId: CATALOGS[role].id } },
      { version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: data } },
      { version: 'v0.9', updateComponents: { surfaceId, components } },
    ] as ScreenResult['messages'],
    debug: { requestId: 'r', role, scenarioId: 'first-money-home', model: 'fake', outcome: 'model', attempts: [], recipe: { components }, latencyMs: 5, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0 },
  };
}
