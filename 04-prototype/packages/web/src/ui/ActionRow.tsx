import type { ReactNode } from 'react';
import { Button } from '@heroui/react';

export interface ActionSpec { label: string; onPress: () => void }

/** A card action: full width, 52 high (taller when the label wraps); primary is white with dark text, secondary sits on `default`. */
export function ActionButton({ kind = 'primary', onPress, children }: { kind?: 'primary' | 'secondary'; onPress: () => void; children: ReactNode }) {
  return (
    <Button
      variant={kind}
      size="lg"
      fullWidth
      className={`h-auto min-h-13 whitespace-normal rounded-control px-4 py-3.5 text-center text-body font-semibold ${kind === 'secondary' ? '[--button-fg:var(--foreground)]' : ''}`}
      onPress={onPress}
    >
      {children}
    </Button>
  );
}

/** One primary action first, then the secondary ones, stacked. */
export function ActionRow({ primary, secondary = [] }: { primary?: ActionSpec; secondary?: ActionSpec[] }) {
  return (
    <div data-slot="actions" className="flex flex-col gap-2">
      {primary && <ActionButton onPress={primary.onPress}>{primary.label}</ActionButton>}
      {secondary.map((s) => <ActionButton key={s.label} kind="secondary" onPress={s.onPress}>{s.label}</ActionButton>)}
    </div>
  );
}
