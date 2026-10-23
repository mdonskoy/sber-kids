import type { ReactNode } from 'react';

/** Label–value rows (Deposit and Spend boards): muted label left, value 600 right, 12 apart; the label wraps first. */
export const KeyValue = ({ rows }: { rows: { label: string; value: ReactNode }[] }) => (
  <dl className="flex flex-col gap-2">
    {rows.map((r) => (
      <div key={r.label} className="flex items-baseline justify-between gap-3">
        <dt className="text-secondary text-muted">{r.label}</dt>
        <dd className="shrink-0 text-right text-body font-semibold tabular-nums">{r.value}</dd>
      </div>
    ))}
  </dl>
);
