import type { ReactNode } from 'react';

/** The calculator's result box: `default` background, radius control, padding 14/16. */
export const ResultBox = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 rounded-control bg-default px-4 py-3.5">{children}</div>
);
