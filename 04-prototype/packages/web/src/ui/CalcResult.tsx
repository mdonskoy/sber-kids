import type { ReactNode } from 'react';
import { Spinner } from '@heroui/react';

/** Figures are the bank's; while the sliders differ from what they were calculated for, they are not current. */
export function CalcResult({ isCurrent, children }: { isCurrent: boolean; children: ReactNode }) {
  return (
    <div aria-busy={!isCurrent} aria-live="polite" className="flex flex-col gap-1.5">
      <div className={`flex flex-col gap-1.5 ${isCurrent ? '' : 'opacity-45'}`}>{children}</div>
      {/* Always laid out, so the button below does not jump when the figures go stale. */}
      <span aria-hidden={isCurrent || undefined} className={`inline-flex items-center gap-1.5 text-caption text-muted ${isCurrent ? 'invisible' : ''}`}>
        {!isCurrent && <Spinner size="sm" color="current" />}
        Пересчитываем…
      </span>
    </div>
  );
}
