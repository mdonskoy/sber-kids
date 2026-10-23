import type { Role } from '@proto/catalog';

// Cross-phone signals: refresh = fetch fresh data for the current surface; reload = regenerate the current scenario.
const bus = new EventTarget();
const on = (type: string, fn: () => void) => {
  bus.addEventListener(type, fn);
  return () => bus.removeEventListener(type, fn);
};

export const emitRefresh = (roles: Role[]) => roles.forEach((r) => bus.dispatchEvent(new Event(`refresh:${r}`)));
export const onRefresh = (role: Role, fn: () => void) => on(`refresh:${role}`, fn);
export const emitReload = (role: Role) => bus.dispatchEvent(new Event(`reload:${role}`));
export const onReload = (role: Role, fn: () => void) => on(`reload:${role}`, fn);
