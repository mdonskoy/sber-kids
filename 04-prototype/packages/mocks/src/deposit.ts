import type { Product } from '@proto/catalog';
import { depositIncome } from './calculators';
import { pctText, rubText } from './format';
import type { Store } from './store';
import { DEMO_TODAY, DEPOSIT_TARIFFS, DEPOSIT_TERM_BUCKETS, PRODUCTS, type DepositTariff } from './youngAdult';

export interface DepositHint { text: string; apply: { amount: number; months: number } | null }
export interface DepositQuote { tariffId: DepositTariff['id']; tariffName: string; conditions: string; rate: number; income: number; payoutLabel: string; hint: DepositHint }

const GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «23 октября 2027»: the demo «today» plus the term. */
export function payoutLabel(months: number): string {
  const d = new Date(Date.UTC(DEMO_TODAY.year, DEMO_TODAY.month - 1 + months, DEMO_TODAY.day));
  return `${d.getUTCDate()} ${GENITIVE[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const bucketOf = (months: number) => DEPOSIT_TERM_BUCKETS.findIndex(([from, to]) => months >= from && months <= to);

/** How to earn more by changing the term or the amount only (no rate boosts): the best term of this tariff, else the next tariff. */
function hintFor(tariff: DepositTariff, amount: number, months: number, rate: number): DepositHint {
  const best = tariff.rates.reduce((b, r, i) => (r > tariff.rates[b] ? i : b), 0);
  if (tariff.rates[best] > rate) {
    const to = DEPOSIT_TERM_BUCKETS[best][0];
    return { text: `На ${to} мес. ставка выше — ${pctText(tariff.rates[best])}`, apply: { amount, months: to } };
  }
  const top = DEPOSIT_TARIFFS[1];
  if (tariff.id !== top.id) return { text: `От ${rubText(top.minAmount)} — ${top.name}, до ${pctText(Math.max(...top.rates))}`, apply: { amount: top.minAmount, months } };
  return { text: 'Это лучшая ставка для такой суммы', apply: null };
}

/** The deposit for these slider values: the tariff follows the amount, the rate follows the term. */
export function depositQuote(amount: number, months: number): DepositQuote {
  const tariff = amount >= DEPOSIT_TARIFFS[1].minAmount ? DEPOSIT_TARIFFS[1] : DEPOSIT_TARIFFS[0];
  const rate = tariff.rates[bucketOf(months)];
  return { tariffId: tariff.id, tariffName: tariff.name, conditions: tariff.conditions, rate, income: depositIncome(amount, months, rate), payoutLabel: payoutLabel(months), hint: hintFor(tariff, amount, months, rate) };
}

/** The confirmation record for the deposit on the calculator: tariff, amount, term, income. */
export function depositProduct(store: Store): Product {
  const { amount, months } = store.youngAdult.deposit;
  const q = depositQuote(amount, months);
  return {
    id: 'deposit',
    name: `Вклад «${q.tariffName}»`,
    rate: q.rate,
    termsLines: [`Сумма — ${rubText(amount)}`, `Срок — ${months} мес.`, `Доход — +${rubText(q.income)} к ${q.payoutLabel}`, 'Снять раньше срока без потери процентов нельзя'],
    disclosure: PRODUCTS.deposit.disclosure,
    ctaLabel: `Открыть на ${rubText(amount)}`,
  };
}
