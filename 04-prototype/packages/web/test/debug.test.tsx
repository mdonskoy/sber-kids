import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDataModel, createStore } from '@proto/mocks';
import { App } from '../src/App';
import { screenResult } from './helpers';

afterEach(() => vi.unstubAllGlobals());

describe('DebugPanel', () => {
  it('is collapsed by default, forces a state for one request and shows the outcome', async () => {
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
      if (url.startsWith('/api/telemetry')) return json({ summary: { screens: 1, firstTryValidRate: 0, fallbackRate: 1, blocked: 0, p50LatencyMs: 5, p95LatencyMs: 5, meanCostUsd: 0, totalCostUsd: 0 }, recent: [] });
      const role = url.split('/').pop() as 'young-adult';
      const body = JSON.parse((init?.body as string) ?? '{}');
      bodies.push({ url, body });
      const r = screenResult(role, `${role}-${bodies.length}`, [{ id: 'root', component: 'Column', children: [] }], buildDataModel(role, createStore(), { clock: '10:00' }));
      if (body.force === 'model_error') r.debug.outcome = 'fallback';
      return json(r);
    }));

    render(<App />);
    const trigger = screen.getByRole('button', { name: 'Отладка (для команды)' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panel = trigger.closest<HTMLElement>('[data-slot="disclosure"]')!;

    const ui = within(panel);
    fireEvent.change(ui.getByLabelText('Следующий запрос'), { target: { value: 'model_error' } });
    fireEvent.click(ui.getByText('Повторить экран'));

    await vi.waitFor(() => expect(bodies.some((b) => b.url === '/api/screen/young-adult' && b.body.force === 'model_error')).toBe(true));
    expect(await ui.findByText('fallback')).toBeTruthy();
    // The forced state is consumed: the select is back to «Обычный».
    expect((ui.getByLabelText('Следующий запрос') as HTMLSelectElement).value).toBe('none');
  });
});
