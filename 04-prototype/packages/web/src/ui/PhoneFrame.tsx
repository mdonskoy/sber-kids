import type { ReactNode } from 'react';

/**
 * The device: 390 × 844, radius 44, 10 px black bezel with a 1 px outline; the persona caption above it.
 * On a real phone (below `sm`) there is no device to draw: the frame is the whole screen.
 */
export function PhoneFrame({ persona, children }: { persona: { name: string }; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-full flex-col gap-2 sm:w-auto">
      <span className="px-4 text-caption text-muted sm:px-0">{persona.name}</span>
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background sm:h-[844px] sm:w-[390px] sm:max-w-full sm:rounded-[44px] sm:border-[10px] sm:border-black sm:shadow-[0_0_0_1px_#34353A]">
        {children}
      </div>
    </div>
  );
}
