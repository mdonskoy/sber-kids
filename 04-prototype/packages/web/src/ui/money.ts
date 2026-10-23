const RUB = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export const rub = (v: number) => RUB.format(v);
/** A rate without the unit: «11,5%». */
export const percent = (r: number) => `${PCT.format(Math.round(r * 10000) / 100)}%`;
/** The bank's rate as is: up to two decimals, decimal comma, no trailing zeros. */
export const ratePct = (r: number) => `${percent(r)} годовых`;
/** A calculator term, in months only (owner, 2026-10-23): «18 мес.». */
export const monthsLabel = (n: number) => `${n} мес.`;

/** Russian plural: 1 год, 2–4 года, 5+ лет (11–14 лет). */
const years = (n: number) => {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return 'год';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'года';
  return 'лет';
};
/** A term the bank way: «8 мес.», «1 год», «3 года 2 мес.». */
export function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} мес.`;
  return m ? `${y} ${years(y)} ${m} мес.` : `${y} ${years(y)}`;
}
