import { Skeleton as Bar } from '@heroui/react';

/** The shimmer stops for people who ask for less motion. */
const still = 'motion-reduce:after:animate-none';

/** One widget-shaped placeholder card while a screen is on its way. */
export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка экрана" className="flex flex-col gap-3.5 rounded-card bg-surface px-4 pt-5 pb-4">
      <Bar className={`h-6 w-3/5 rounded-lg ${still}`} />
      <Bar className={`h-4 w-[85%] rounded-lg ${still}`} />
      <Bar className={`h-4 w-[70%] rounded-lg ${still}`} />
      <Bar className={`h-13 rounded-control ${still}`} />
    </div>
  );
}
