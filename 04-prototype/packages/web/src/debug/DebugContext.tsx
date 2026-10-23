import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ROLES, type ForceState, type ModelChoice, type Role, type ScreenDebug } from '@proto/catalog';

export interface DebugState {
  force: Record<Role, ForceState>;
  model: ModelChoice | 'default';
  reports: Partial<Record<Role, ScreenDebug>>;
}
interface DebugApi {
  state: DebugState;
  setForce(role: Role, force: ForceState): void;
  setModel(model: ModelChoice | 'default'): void;
  report(role: Role, debug: ScreenDebug): void;
  /** Overrides for the next request of a role; a forced state is consumed. */
  take(role: Role): { force?: ForceState; model?: ModelChoice };
}

const Ctx = createContext<DebugApi | null>(null);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DebugState>({
    force: Object.fromEntries(ROLES.map((r) => [r, 'none'])) as Record<Role, ForceState>,
    model: 'default',
    reports: {},
  });
  const latest = useRef(state);
  latest.current = state;
  const value = useMemo<DebugApi>(
    () => ({
      state,
      setForce: (role, force) => setState((s) => ({ ...s, force: { ...s.force, [role]: force } })),
      setModel: (model) => setState((s) => ({ ...s, model })),
      report: (role, debug) => setState((s) => ({ ...s, reports: { ...s.reports, [role]: debug } })),
      take: (role) => {
        const s = latest.current;
        const force = s.force[role];
        if (force !== 'none') setState((x) => ({ ...x, force: { ...x.force, [role]: 'none' } }));
        return { ...(force !== 'none' ? { force } : {}), ...(s.model !== 'default' ? { model: s.model } : {}) };
      },
    }),
    [state],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDebug(): DebugApi {
  const value = useContext(Ctx);
  if (!value) throw new Error('useDebug must be used inside DebugProvider');
  return value;
}
