import type { ReactNode } from 'react';

/** Icon row (tokens.md «Card»): 28 px green line icon, value, muted label below. */
export const IconRow = ({ icon, value, label }: { icon: ReactNode; value: ReactNode; label?: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-success">{icon}</span>
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-body">{value}</span>
      {label && <span className="text-secondary text-muted">{label}</span>}
    </div>
  </div>
);
