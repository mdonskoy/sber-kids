import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageProcessor, type ActionPayload, type SurfaceModel } from '@a2ui/web_core/v0_9';
import type { ForceState, ModelChoice, Role, ScreenDebug, ScreenResult } from '@proto/catalog';
import { api } from '../api';
import { reactCatalog } from '../catalog';
import { emitRefresh, onRefresh } from './bus';

interface Hooks {
  onDebug(debug: ScreenDebug): void;
  overrides(): { force?: ForceState; model?: ModelChoice };
  /** Keep every surface (chat) instead of replacing the current one. */
  append?: boolean;
}
export type FeedItem = { kind: 'surface'; surface: SurfaceModel<any> } | { kind: 'user'; id: string; text: string; sentAt: number };
/** The last request, so a failed one can be sent again as it was. */
type LastRequest = { kind: 'load'; scenarioId: string } | { kind: 'turn'; text: string } | { kind: 'action'; payload: ActionPayload };

/**
 * Calculator recalculations: only the widget's figures show them («Пересчитываем…»). They do not put the phone
 * into waiting, are not «Повторить»'s last request, and a failure leaves the screen as it is (the widget stays
 * stale and sends again itself). A tap, a turn or a load never waits for one: it goes ahead and the recalc's
 * answer, now stale, is dropped.
 */
const QUIET_ACTIONS: ReadonlySet<string> = new Set(['deposit.recalc', 'account.recalc', 'loan.recalc', 'invest.recalc', 'piggy.recalc', 'spend.recalc']);

export function usePhone(role: Role, hooks: Hooks) {
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const onAction = useRef<(a: ActionPayload) => Promise<void>>(async () => {});
  const [processor] = useState(() => new MessageProcessor([reactCatalog(role)], (a) => onAction.current(a)));
  const [surface, setSurface] = useState<SurfaceModel<any> | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const last = useRef<LastRequest | null>(null);

  const show = useCallback(
    (r: ScreenResult, opts: { reset?: boolean } = {}) => {
      // After a server restart an id can come back: the old surface goes, or creating it again would throw.
      const stuck = processor.model.surfacesMap.has(r.surfaceId);
      if (stuck) processor.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId: r.surfaceId } }] as any);
      processor.processMessages(r.messages);
      const prev = current.current;
      const append = hooksRef.current.append;
      // Append mode keeps earlier turns; a fresh load (opts.reset) starts the feed over.
      if (prev && prev !== r.surfaceId && (!append || opts.reset)) processor.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId: prev } }] as any);
      current.current = r.surfaceId;
      const model = processor.model.surfacesMap.get(r.surfaceId) ?? null;
      setSurface(model);
      if (append && model) {
        const item: FeedItem = { kind: 'surface', surface: model };
        const kept = (f: FeedItem[]) => (stuck ? f.filter((i) => i.kind !== 'surface' || i.surface.id !== r.surfaceId) : f);
        setFeed((f) => (opts.reset ? [item] : [...kept(f), item]));
      }
      hooksRef.current.onDebug(r.debug);
    },
    [processor],
  );

  // Every load, action or chat turn takes a number; only the latest one may change the screen.
  const opSeq = useRef(0);
  // One action or chat turn at a time: a second click while the first is running is ignored.
  // A running recalc does not block a loud operation; the newer one owns the slot.
  const inFlight = useRef<{ quiet: boolean } | null>(null);
  const loudInFlight = () => inFlight.current !== null && !inFlight.current.quiet;
  // A quiet operation takes no number of its own: it must not overtake a load or a turn.
  const guard = useCallback(async (setFlag: (v: boolean) => void, fn: (latest: () => boolean) => Promise<void>, quiet = false) => {
    if (inFlight.current && (quiet || !inFlight.current.quiet)) return;
    const mine = { quiet };
    inFlight.current = mine;
    const seq = quiet ? opSeq.current : ++opSeq.current;
    if (!quiet) {
      setFlag(true);
      setError(null);
    }
    try {
      await fn(() => seq === opSeq.current);
    } catch (e) {
      if (quiet) console.warn('recalc failed', role, e);
      else {
        console.error('action failed', role, e);
        if (seq === opSeq.current) setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (inFlight.current === mine) inFlight.current = null;
      if (!quiet) setFlag(false);
    }
  }, [role]);

  // A slow answer to an earlier scenario pick, or a load overtaken by an action, is dropped.
  const load = useCallback(
    (scenarioId: string) => {
      last.current = { kind: 'load', scenarioId };
      const seq = ++opSeq.current;
      const latest = () => seq === opSeq.current;
      setLoading(true);
      setError(null);
      return api
        .screen(role, { scenarioId, ...hooksRef.current.overrides() })
        .then((r) => {
          if (latest()) show(r, { reset: true });
        })
        .catch((e) => {
          console.error('screen load failed', role, e);
          if (latest()) setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (latest()) setLoading(false);
        });
    },
    [role, show],
  );

  /**
   * One chat turn. An empty text without a bubble asks for a fresh answer to the conversation so far (debug «Повторить экран»).
   * Resolves to false at once when another operation is running and the text was not sent; otherwise to true when the turn is over.
   */
  const send = useCallback(
    (text: string, opts: { bubble?: boolean } = {}): Promise<boolean> => {
      if (loudInFlight()) return Promise.resolve(false);
      last.current = { kind: 'turn', text };
      if (opts.bubble !== false) setFeed((f) => [...f, { kind: 'user', id: `u${f.length}`, text, sentAt: Date.now() }]);
      return guard(setBusy, async (latest) => {
        const r = await api.turn(role, { text, ...hooksRef.current.overrides() });
        if (latest()) show(r); // a slow earlier turn must not land after a newer one
      }).then(() => true);
    },
    [guard, role, show],
  );

  onAction.current = (a) => {
    const quiet = QUIET_ACTIONS.has(a.name);
    if (!loudInFlight() && !quiet) last.current = { kind: 'action', payload: a };
    return guard(setBusy, async (latest) => {
      const r = await api.action(role, { name: a.name, surfaceId: a.surfaceId, sourceComponentId: a.sourceComponentId, context: a.context });
      emitRefresh(r.refresh); // other phones still learn that money moved
      if (!latest()) return; // the user picked another scenario meanwhile
      if (r.kind === 'data') {
        processor.processMessages(r.messages);
        return;
      }
      if (quiet) throw new Error(`${a.name} answered with a screen`); // a recalc only ever updates figures
      // A tap that answers in the chat shows what it said as Лиза's bubble, before the answer.
      const echo = r.echo;
      if (echo) setFeed((f) => [...f, { kind: 'user', id: `u${f.length}`, text: echo, sentAt: Date.now() }]);
      show(r.screen);
    }, quiet);
  };

  /** «Повторить»: the last request again, the same text or the same action, through the same guard. */
  const retry = useCallback(() => {
    const r = last.current;
    if (!r) return Promise.resolve();
    if (r.kind === 'load') return load(r.scenarioId);
    if (r.kind === 'turn') return send(r.text, { bubble: false }).then(() => {});
    return onAction.current(r.payload);
  }, [load, send]);

  useEffect(
    () =>
      onRefresh(role, () => {
        const surfaceId = current.current;
        api
          .data(role, surfaceId)
          .then((r) => {
            if (current.current === surfaceId) processor.processMessages(r.messages); // the surface may be gone by now
          })
          .catch((err) => {
            if (current.current === surfaceId) console.warn('refresh failed', role, err);
          });
      }),
    [role, processor],
  );

  return { surface, feed, loading, busy, error, failed: error ? (last.current?.kind ?? null) : null, load, send, retry };
}
