import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECALC_DELAY_MS, RECALC_MAX_ATTEMPTS, RECALC_RETRY_MS, useLiveCalc } from '../src/ui';

function Probe({ server, send }: { server: { amount: number }; send: (v: { amount: number }) => void }) {
  const c = useLiveCalc(server, send);
  (globalThis as any).calc = c;
  return <span data-current={String(c.isCurrent)}>{c.inputs.amount}</span>;
}
/** The widget sits in an earlier chat turn: the phone disables its fieldset and the server rejects its actions. */
function InertProbe({ server, send }: { server: { amount: number }; send: (v: { amount: number }) => void }) {
  const c = useLiveCalc(server, send);
  (globalThis as any).calc = c;
  return <fieldset disabled><div ref={c.ref}>{c.inputs.amount}</div></fieldset>;
}
const calc = () => (globalThis as any).calc as ReturnType<typeof useLiveCalc<{ amount: number }>>;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useLiveCalc', () => {
  it('sends once, after the pause, with the last value', () => {
    const send = vi.fn();
    render(<Probe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 2000 }));
    act(() => calc().change({ amount: 3000 }));
    act(() => vi.advanceTimersByTime(RECALC_DELAY_MS - 1));
    expect(send).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ amount: 3000 });
    expect(screen.getByText('3000').dataset.current).toBe('false');
  });

  it('is current again once the server answers for these inputs', () => {
    const send = vi.fn();
    const { rerender } = render(<Probe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 3000 }));
    act(() => vi.advanceTimersByTime(RECALC_DELAY_MS));
    rerender(<Probe server={{ amount: 2000 }} send={send} />); // an older answer: still not current
    expect(screen.getByText('3000').dataset.current).toBe('false');
    rerender(<Probe server={{ amount: 3000 }} send={send} />);
    expect(screen.getByText('3000').dataset.current).toBe('true');
  });

  it('sends again if no answer comes (the request was dropped while another was in flight)', () => {
    const send = vi.fn();
    render(<Probe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 3000 }));
    act(() => vi.advanceTimersByTime(RECALC_DELAY_MS + RECALC_RETRY_MS + RECALC_DELAY_MS));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('gives up after a few unanswered attempts and stays stale', () => {
    const send = vi.fn();
    render(<Probe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 3000 }));
    act(() => vi.advanceTimersByTime(20 * (RECALC_DELAY_MS + RECALC_RETRY_MS)));
    expect(send).toHaveBeenCalledTimes(RECALC_MAX_ATTEMPTS);
    expect(screen.getByText('3000').dataset.current).toBe('false');
    act(() => calc().change({ amount: 4000 })); // a new draft gets its own attempts
    act(() => vi.advanceTimersByTime(RECALC_DELAY_MS));
    expect(send).toHaveBeenLastCalledWith({ amount: 4000 });
  });

  it('sends nothing from a widget that is no longer live', () => {
    const send = vi.fn();
    render(<InertProbe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 3000 }));
    act(() => vi.advanceTimersByTime(3 * (RECALC_DELAY_MS + RECALC_RETRY_MS)));
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when the draft returns to what the figures were calculated for', () => {
    const send = vi.fn();
    render(<Probe server={{ amount: 1000 }} send={send} />);
    act(() => calc().change({ amount: 2000 }));
    act(() => calc().change({ amount: 1000 }));
    act(() => vi.advanceTimersByTime(RECALC_DELAY_MS + RECALC_RETRY_MS));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('1000').dataset.current).toBe('true');
  });
});
