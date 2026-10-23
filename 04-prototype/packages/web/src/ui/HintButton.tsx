import type { ReactNode } from 'react';
import { Button } from '@heroui/react';

/** The calculator's hint (Savings board): a row on `default` with a green line icon; with an action it is a button that moves the sliders. */
export function HintButton({ icon, text, actionLabel, onPress }: { icon: ReactNode; text: string; actionLabel?: string; onPress?: () => void }) {
  const body = (
    <>
      <span className="text-success">{icon}</span>
      <span className="min-w-0 flex-1 text-secondary text-foreground">{text}</span>
      {actionLabel && <span className="shrink-0 text-secondary font-semibold text-success-text">{actionLabel}</span>}
    </>
  );
  if (!onPress) return <div className="flex min-h-12 items-center gap-2.5 rounded-control bg-default px-3.5 py-3">{body}</div>;
  return (
    <Button variant="ghost" fullWidth className="h-auto min-h-12 justify-start gap-2.5 whitespace-normal rounded-control bg-default px-3.5 py-3 text-left font-normal" onPress={onPress}>
      {body}
    </Button>
  );
}
