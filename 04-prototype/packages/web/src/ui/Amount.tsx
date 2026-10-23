import { rub } from './money';

/** A money figure from the server: tabular, never wrapped; positive money sits on the result box, so it uses `success-text` (5.36:1 on `default`); `plus` marks money that comes in («+7 234 ₽»). */
export const Amount = ({ value, tone = 'default', size = 'body', plus = false }: { value: number; tone?: 'default' | 'positive'; size?: 'body' | 'amount'; plus?: boolean }) => (
  <span className={`whitespace-nowrap tabular-nums ${size === 'amount' ? 'font-display text-amount' : 'text-body font-semibold'} ${tone === 'positive' ? 'text-success-text' : 'text-foreground'}`}>
    {plus && '+'}{rub(value)}
  </span>
);
