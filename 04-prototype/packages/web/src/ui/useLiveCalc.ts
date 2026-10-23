import { useEffect, useRef, useState } from 'react';

export const RECALC_DELAY_MS = 300;
export const RECALC_RETRY_MS = 2000;
/** Unanswered sends of one draft before the widget gives up and stays stale. */
export const RECALC_MAX_ATTEMPTS = 3;

type Inputs = Record<string, string | number>;
const same = <T extends Inputs>(a: T, b: T) => Object.keys(b).every((k) => a[k] === b[k]);

/**
 * A calculator's inputs: the slider draft lives here, the figures stay the bank's.
 * After a pause the draft is sent; the figures are current only while the server's echoed inputs equal the draft.
 * A request can be dropped by the phone's one-action-at-a-time guard, so an unanswered draft is sent again,
 * up to RECALC_MAX_ATTEMPTS times. Attach `ref` to the widget: once it sits in an earlier, read-only chat turn
 * (whose actions the server rejects), nothing is sent.
 */
export function useLiveCalc<T extends Inputs>(server: T, send: (inputs: T) => void) {
  const [draft, setDraft] = useState<T | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const sendRef = useRef(send);
  sendRef.current = send;
  const serverKey = JSON.stringify(Object.keys(server).sort().map((k) => [k, server[k]]));
  const pending = draft !== null && !same(draft, server);

  // The bank answered for exactly these inputs: the draft is done.
  useEffect(() => {
    if (draft && same(draft, server)) setDraft(null);
  }, [serverKey]);

  const draftKey = draft ? JSON.stringify(draft) : '';
  useEffect(() => {
    if (!pending || !draft) return;
    let timer: ReturnType<typeof setTimeout>;
    // Send after the pause; while no answer comes, send the same draft again, a few times at most.
    const sendAfter = (ms: number, attempt: number) => {
      timer = setTimeout(() => {
        if (ref.current?.closest('fieldset[disabled]')) return; // an earlier turn: the server would reject it
        sendRef.current(draft);
        if (attempt < RECALC_MAX_ATTEMPTS) sendAfter(RECALC_RETRY_MS + RECALC_DELAY_MS, attempt + 1);
      }, ms);
    };
    sendAfter(RECALC_DELAY_MS, 1);
    return () => clearTimeout(timer);
  }, [pending, draftKey]);

  return {
    ref,
    inputs: draft ?? server,
    isCurrent: !pending,
    // Back to what the figures were calculated for: no draft, nothing to send.
    change: (patch: Partial<T>) =>
      setDraft((d) => {
        const next = { ...(d ?? server), ...patch } as T;
        return same(next, server) ? null : next;
      }),
  };
}
