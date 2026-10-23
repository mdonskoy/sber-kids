import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { ActionBody, ActionResult, ForceState, ModelChoice, Role, ScreenRequestBody, ScreenResult, TelemetrySummary } from '@proto/catalog';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
  return (await res.json()) as T;
}
const post = <T>(url: string, body: unknown) =>
  call<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  screen: (role: Role, body: ScreenRequestBody) => post<ScreenResult>(`/api/screen/${role}`, body),
  turn: (role: Role, body: { text: string; force?: ForceState; model?: ModelChoice }) => post<ScreenResult>(`/api/turn/${role}`, body),
  action: (role: Role, body: ActionBody) => post<ActionResult>(`/api/action/${role}`, body),
  data: (role: Role, surfaceId?: string | null) =>
    call<{ messages: A2uiMessage[] }>(`/api/data/${role}${surfaceId ? `?surfaceId=${encodeURIComponent(surfaceId)}` : ''}`),
  telemetry: () => call<{ summary: TelemetrySummary; recent: unknown[] }>('/api/telemetry'),
  reset: () => post<{ ok: true }>('/api/reset', {}),
};
