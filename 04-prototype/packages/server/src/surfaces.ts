import { randomUUID } from 'node:crypto';
import type { Role } from '@proto/catalog';
import { buildDataModel, type Store } from '@proto/mocks';
import type { Recipe } from './validate';

export interface SurfaceEntry {
  surfaceId: string;
  role: Role;
  scenarioId: string;
  clock: string;
  recipe: Recipe;
  staticData?: Record<string, unknown>;
  /** Model or fallback screen (a "home"), as opposed to a server-built static screen. */
  generated: boolean;
}

export class Surfaces {
  private seq = 0;
  /** Per instance, so a new boot or a reset never hands out an id a client still holds. */
  private readonly nonce = randomUUID().slice(0, 8);
  private readonly byId = new Map<string, SurfaceEntry>();
  private readonly current = new Map<Role, string>();
  private readonly home = new Map<Role, string>();
  private tickets = 0;
  private readonly applied = new Map<Role, number>();

  nextId(role: Role): string {
    return `${role}-${this.nonce}-${++this.seq}`;
  }

  /** Taken when a request starts: a request that started earlier never replaces the screen of one that started later. */
  ticket(): number {
    return ++this.tickets;
  }

  add(entry: SurfaceEntry, ticket = this.ticket()): void {
    this.byId.set(entry.surfaceId, entry);
    if (ticket < (this.applied.get(entry.role) ?? 0)) return; // an older request finished late
    this.applied.set(entry.role, ticket);
    this.current.set(entry.role, entry.surfaceId);
    if (entry.generated) this.home.set(entry.role, entry.surfaceId);
  }

  get(id: string): SurfaceEntry | undefined {
    return this.byId.get(id);
  }

  currentOf(role: Role): SurfaceEntry | undefined {
    const id = this.current.get(role);
    return id ? this.byId.get(id) : undefined;
  }

  homeOf(role: Role): SurfaceEntry | undefined {
    const id = this.home.get(role);
    return id ? this.byId.get(id) : undefined;
  }
}

/** Fresh data for an existing surface: the store as it is now, plus the surface's static data. */
export function dataFor(entry: SurfaceEntry, store: Store): Record<string, unknown> {
  return { ...buildDataModel(entry.role, store, { clock: entry.clock }), ...(entry.staticData ?? {}) };
}
