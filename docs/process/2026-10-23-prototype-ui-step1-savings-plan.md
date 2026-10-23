# Prototype UI Step 1 — savings group — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The savings widgets of «Первые деньги» work as on the approved Savings board: after a goal the model offers ways to reach it (`WaysToGoal`), a tapped way opens its live calculator in the chat — the deposit with tariffs that follow amount and term, a new savings-account calculator and a new piggy-bank calculator — and each widget has an eval case.

**Architecture:** Engine unchanged (model composes A2UI v0.9 screens from catalog widgets; the server validates; every figure comes from `@proto/mocks`). Each task is one vertical slice — mocks → catalog record and def → server action → React implementation → showcase case → tests — so the suite stays green at every commit. Live recalculation reuses Step 0's `useLiveCalc` + quiet `*.recalc` actions.

**Tech Stack:** TypeScript, Zod 3.25.76, `@a2ui/react` / `@a2ui/web_core` 0.14.0, React 19, HeroUI v3.2.6, Tailwind v4.3.3, Vitest.

**Spec:** `docs/process/2026-10-23-prototype-ui-design.md` — sections "Step 1", "The path these widgets serve", "Savings calculators". Design: `04-prototype/design/foundation/Savings.dc.html` (approved 2026-10-23) and `04-prototype/design/tokens.md`.

## Global Constraints

- Work in the worktree `/Users/donskoy/sber-kids/.claude/worktrees/prototype-engine`, branch `prototype-engine`. Code lives in `04-prototype/`. Never touch `.obsidian/`, the braindump file, `01-research/`, `02-hypotheses/`, `03-plan-100-days/`. Never push or deploy.
- Process docs and code in English; everything shown inside the phone in Russian. Лиза is addressed with «ты».
- No meta copy inside the phone: no «демо», «прототип», «ИИ», «модель» in any on-screen string inside the phone frame.
- Versions are exact pins, never ranges; no new dependencies in this plan.
- Frontend rules: compose from HeroUI components only; `onPress`, not `onClick`, on HeroUI buttons; no Provider; no other UI kit. HeroUI merges classNames with tailwind-merge: never pass a `text-*` size token and a `text-*` colour together to a HeroUI part (comment in `packages/web/src/ui/WidgetCard.tsx`).
- The engine does not change. Every money figure and rate on screen comes from `@proto/mocks` on the server — never from arithmetic in the browser (engine FR-021). The model never states a rate or a sum.
- Caller-keyed id lookups use own-key checks (`Object.hasOwn` or `.find` over an array), never `in` or bare indexing.
- Claude access in checks: subscription only (`CLAUDE_AUTH=subscription`); never use or look for an API key. Implementer subagents never call a model, start a server against a model, or use credentials.
- One commit per task (fix commits allowed), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- From `04-prototype/`: `npm test`, `npm run typecheck`, `npm run build` — all three green at every commit.
- Slider steps (owner, 2026-10-23): money in steps of 1 000 ₽; terms in steps of one month, shown in months («18 мес.»).
- Rates (owner, 2026-10-23): «Выгодный старт» up to 12,5% (10 000 ₽ for 7 months → 10,5%), «СберВклад» from 100 000 ₽ up to 13,5%, Накопительный счёт 12,5%. No rate boosts («надбавки»).
- The showcase test requires a `normal` case for every catalog component: every task that adds a component adds its case in `packages/web/src/showcase/fixtures.ts`; every task that removes one removes its cases.

## Rulings made while planning (from the spec)

- **PlanComparison stays for now.** The spec removes it in Step 1, but it is the only place the loan comparison and the investment range live until the "spending and loan" and "investments" groups replace them. The chat instruction shows it only when Лиза asks to compare saving with a loan or with investing. `ScenarioSliders` is removed in Task 4 (the savings calculators replace it).
- **Ways sets in this group: `big` (Вклад, Накопительный счёт) and `small` (Копилка, Сэкономить на тратах).** The "big and urgent" (loan) and "ready for risk" (investments) sets arrive with their groups.
- **The confirmation for a deposit shows what the calculator shows**: tariff, amount, term and income. The calculator sends its slider values with the tap, so a confirmation is never for an older position. This also closes the Step 0 canvas difference "no amount row on the confirmation".
- **Deposit income is paid at the end of the term without capitalisation** (as «без пополнения и снятия, доход в конце срока» on the Sber product page): `amount × rate × months / 12`.
- **Payout dates count from a fixed demo «today», 23 October 2026**, so screens and tests are deterministic.

---

### Task 1: Deposit tariffs and the rebuilt deposit calculator

**Files:**
- Create: `packages/mocks/src/format.ts`, `packages/mocks/src/deposit.ts`, `packages/mocks/test/deposit.test.ts`, `packages/web/src/ui/HintButton.tsx`
- Modify: `packages/mocks/src/youngAdult.ts`, `packages/mocks/src/calculators.ts`, `packages/mocks/src/dataModel.ts`, `packages/mocks/src/index.ts`, `packages/catalog/src/records.ts`, `packages/catalog/src/components/firstMoney.ts` (DepositCalculator description), `packages/server/src/actions.ts` (`product.open`, `product.confirm`), `packages/web/src/ui/money.ts`, `packages/web/src/ui/index.ts`, `packages/web/src/catalog/firstMoney.tsx` (`DepositCalculatorImpl`), `packages/web/src/showcase/fixtures.ts`
- Test: `packages/mocks/test/deposit.test.ts`, `packages/mocks/test/calculators.test.ts`, `packages/mocks/test/youngAdult.test.ts`, `packages/server/test/firstMoney.test.ts`, `packages/web/test/firstMoney.test.tsx`, plus every existing assertion on the old deposit copy and rates (see Step 6)

**Interfaces:**
- Produces (mocks): `rubText(v: number): string` («30 000 ₽», U+00A0 separators), `pctText(r: number): string` («12,5%»); `DEMO_TODAY`, `SPEND_TOTAL`, `MANDATORY_MONTHLY`, `REALISTIC_AMOUNT` (30 000), `DEPOSIT_TERM_BUCKETS`, `DEPOSIT_TARIFFS`, `DEPOSIT_BOUNDS` (10 000–500 000 step 1 000; 1–36 months), `DEPOSIT_DEFAULT` ({ amount: 30000, months: 12 }); `depositIncome(amount, months, rate): number`; `payoutLabel(months): string`; `depositQuote(amount, months): DepositQuote`; `depositProduct(store): Product`; `DEMO_RATES` = { savings: 0.125, deposit: 0.135, investLow: 0.04, investHigh: 0.2 }.
- Produces (catalog): `DepositCalcSchema` with `tariffName`, `conditions`, `rate`, `income`, `payoutLabel`, `hint: { text, apply: { amount, months } | null }`, no `name`/`total`/`ctaLabel`.
- Produces (web): `percent(r)` («11,5%»), `monthsLabel(n)` («18 мес.»), `HintButton`.
- Action contract: `product.open` context `{ productId: 'deposit', amount?, months? }`.

- [ ] **Step 1: Write the failing mocks tests** `packages/mocks/test/deposit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEPOSIT_DEFAULT, REALISTIC_AMOUNT, createStore, depositIncome, depositProduct, depositQuote, payoutLabel, pctText, rubText, setDepositCalc } from '../src';

describe('deposit tariffs', () => {
  it('starts at a realistic amount for Лиза: salary minus mandatory spending, rounded down to 5 000', () => {
    expect(REALISTIC_AMOUNT).toBe(30000);
    expect(DEPOSIT_DEFAULT).toEqual({ amount: 30000, months: 12 });
  });
  it('picks the tariff by amount and the rate by term', () => {
    expect(depositQuote(10000, 7)).toMatchObject({ tariffId: 'start', tariffName: 'Выгодный старт', rate: 0.105 });
    expect(depositQuote(30000, 12)).toMatchObject({ tariffName: 'Выгодный старт', rate: 0.115, income: 3450, payoutLabel: '23 октября 2027' });
    expect(depositQuote(100000, 6)).toMatchObject({ tariffId: 'sber', tariffName: 'СберВклад', rate: 0.12, income: 6000 });
    expect(depositQuote(150000, 18)).toMatchObject({ tariffName: 'СберВклад', rate: 0.135 });
  });
  it('hints how to earn more by term or amount only', () => {
    expect(depositQuote(30000, 12).hint).toEqual({ text: 'На 13 мес. ставка выше — 12,5%', apply: { amount: 30000, months: 13 } });
    expect(depositQuote(100000, 30).hint).toEqual({ text: 'На 13 мес. ставка выше — 13,5%', apply: { amount: 100000, months: 13 } });
    expect(depositQuote(30000, 18).hint.text).toMatch(/^От 100\s000\s₽ — СберВклад, до 13,5%$/);
    expect(depositQuote(30000, 18).hint.apply).toEqual({ amount: 100000, months: 18 });
    expect(depositQuote(150000, 18).hint).toEqual({ text: 'Это лучшая ставка для такой суммы', apply: null });
  });
  it('pays income at the end of the term, counted from the demo «today»', () => {
    expect(depositIncome(100000, 6, 0.12)).toBe(6000);
    expect(payoutLabel(3)).toBe('23 января 2027');
    expect(payoutLabel(12)).toBe('23 октября 2027');
  });
  it('formats server-built copy the bank way', () => {
    expect(rubText(100000)).toMatch(/^100\s000\s₽$/);
    expect(pctText(0.125)).toBe('12,5%');
    expect(pctText(0.13)).toBe('13%');
  });
  it('clamps the sliders to the bounds and the 1 000 ₽ step', () => {
    const s = createStore();
    setDepositCalc(s, 5000, 0);
    expect(s.youngAdult.deposit).toEqual({ amount: 10000, months: 1 });
    setDepositCalc(s, 123456, 40);
    expect(s.youngAdult.deposit).toEqual({ amount: 123000, months: 36 });
  });
  it('builds the confirmation record from what the calculator shows', () => {
    const s = createStore();
    setDepositCalc(s, 150000, 18);
    const p = depositProduct(s);
    expect(p).toMatchObject({ id: 'deposit', name: 'Вклад «СберВклад»', rate: 0.135 });
    expect(p.termsLines[0]).toMatch(/^Сумма — 150\s000\s₽$/);
    expect(p.termsLines[1]).toBe('Срок — 18 мес.');
    expect(p.termsLines[2]).toMatch(/^Доход — \+30\s375\s₽ к 23 апреля 2028$/);
    expect(p.ctaLabel).toMatch(/^Открыть на 150\s000\s₽$/);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run (from `04-prototype/`): `npx vitest run packages/mocks/test/deposit.test.ts`
Expected: FAIL — `REALISTIC_AMOUNT`, `depositQuote` … are not exported.

- [ ] **Step 3: Implement the mocks**

`packages/mocks/src/format.ts`:

```ts
const NUM = new Intl.NumberFormat('ru-RU');

/** Server-built copy: «30 000 ₽» (the browser formats its own figures). */
export const rubText = (v: number) => `${NUM.format(v)} ₽`;
/** A rate in server-built copy: «12,5%». */
export const pctText = (r: number) => `${NUM.format(Math.round(r * 1000) / 10)}%`;
```

`packages/mocks/src/calculators.ts` — replace `depositReturn` (its only caller is `dataModel.ts`) with:

```ts
/** A term deposit: interest paid at the end of the term, no capitalisation, rounded to the rouble. */
export function depositIncome(amount: number, months: number, annualRate: number): number {
  return Math.round((amount * annualRate * months) / 12);
}
```

`packages/mocks/src/youngAdult.ts`:
- `DEMO_RATES` becomes `{ savings: 0.125, deposit: 0.135, investLow: 0.04, investHigh: 0.2 }` (headline rates from the bank's pages; the deposit's is the top of the grid).
- `PRODUCTS.deposit.termsLines[0]` becomes `'Срок — от одного месяца до трёх лет'`.
- Move `SPEND` above `PRODUCTS` is not needed; add after `SPEND`:

```ts
export const SPEND_TOTAL = SPEND.reduce((sum, c) => sum + c.amount, 0);
export const MANDATORY_MONTHLY = SPEND.filter((c) => !c.discretionary).reduce((sum, c) => sum + c.amount, 0);
/** What Лиза can realistically put aside now: the salary minus the month's mandatory spending, rounded down to 5 000 ₽. */
export const REALISTIC_AMOUNT = Math.floor((LIZA.salary - MANDATORY_MONTHLY) / 5000) * 5000;

/** Demo «today»: payout dates count from it, so every screen is deterministic. */
export const DEMO_TODAY = { year: 2026, month: 10, day: 23 };

export interface DepositTariff { id: 'start' | 'sber'; name: string; minAmount: number; conditions: string; rates: readonly number[] }
/** Term buckets in months; each tariff has one rate per bucket. A mock grid topped at the bank's headline rates, no rate boosts. */
export const DEPOSIT_TERM_BUCKETS: readonly (readonly [number, number])[] = [[1, 2], [3, 5], [6, 8], [9, 12], [13, 24], [25, 36]];
export const DEPOSIT_TARIFFS: readonly [DepositTariff, DepositTariff] = [
  { id: 'start', name: 'Выгодный старт', minAmount: 10000, conditions: 'от 10 000 ₽, от 1 месяца · без пополнения и снятия, доход в конце срока', rates: [0.09, 0.1, 0.105, 0.115, 0.125, 0.11] },
  { id: 'sber', name: 'СберВклад', minAmount: 100000, conditions: 'от 100 000 ₽, от 1 месяца · без пополнения и снятия, доход в конце срока', rates: [0.1, 0.11, 0.12, 0.13, 0.135, 0.12] },
];
```

- Replace the deposit bounds and default:

```ts
export const DEPOSIT_BOUNDS = { amountMin: 10000, amountMax: 500000, amountStep: 1000, monthsMin: 1, monthsMax: 36 };
export const DEPOSIT_DEFAULT = { amount: REALISTIC_AMOUNT, months: 12 };
```

`packages/mocks/src/deposit.ts`:

```ts
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
```

`packages/mocks/src/index.ts` — add `export * from './format';` and `export * from './deposit';`.

`packages/mocks/src/dataModel.ts` — import `depositQuote` (drop `depositReturn`), use `SPEND_TOTAL` instead of the local sum, and replace `depositCalc`:

```ts
  const q = depositQuote(amount, depositMonths);
  // …
    depositCalc: {
      productId: 'deposit', tariffName: q.tariffName, conditions: q.conditions, rate: q.rate,
      amount, months: depositMonths, ...DEPOSIT_BOUNDS, income: q.income, payoutLabel: q.payoutLabel, hint: q.hint,
      calculatedFor: { amount, months: depositMonths },
      disclosure: PRODUCTS.deposit.disclosure,
    },
```

- [ ] **Step 4: Run the mocks tests**

Run: `npx vitest run packages/mocks`
Expected: `deposit.test.ts` PASS. Fix the old ones in Step 6.

- [ ] **Step 5: Catalog record, server actions, web widget**

`packages/catalog/src/records.ts` — replace `DepositCalcSchema`:

```ts
export const DepositCalcSchema = z.object({
  productId: z.literal('deposit'),
  tariffName: z.string(),
  conditions: z.string(),
  rate: z.number(),
  amount: z.number(),
  months: z.number(),
  amountMin: z.number(),
  amountMax: z.number(),
  amountStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  income: z.number(),
  payoutLabel: z.string(),
  /** How to earn more; `apply` is the slider position the hint moves to. */
  hint: z.object({ text: z.string(), apply: z.object({ amount: z.number(), months: z.number() }).nullable() }),
  /** The inputs the figures were calculated for. The browser shows the figures as current only while its sliders equal these. */
  calculatedFor: z.object({ amount: z.number(), months: z.number() }),
  disclosure: z.string(),
});
```

`packages/catalog/src/components/firstMoney.ts` — DepositCalculator description: `'A term deposit calculator: the user sets the amount and the term; the bank picks the tariff and rate and shows the income and the payout date, plus a hint how to earn more. Opens the deposit.'`

`packages/server/src/actions.ts` — import `depositProduct` from `@proto/mocks` and `type Product` from `@proto/catalog`; replace the two cases:

```ts
      case 'product.open': {
        const productId = str(context, 'productId');
        if (!Object.hasOwn(PRODUCTS, productId)) throw new ActionError('not_found', 'No such product');
        if (productId !== 'deposit') return show(confirmOpenProductScreen(PRODUCTS[productId as keyof typeof PRODUCTS]));
        // The calculator sends its sliders with the tap: the confirmation is for what Лиза sees, even before a recalculation landed.
        if (context.amount !== undefined || context.months !== undefined) setDepositCalc(deps.store, Number(context.amount), Number(context.months));
        return show(confirmOpenProductScreen(depositProduct(deps.store)));
      }
      case 'product.confirm': {
        shownOn(source, 'product', str(context, 'productId'));
        const product = (source.staticData!.static as { product: Product }).product; // exactly the record this confirmation showed
        openProduct(deps.store, product.id);
        return show(doneScreen(DONE.productOpened(product)));
      }
```

`packages/web/src/ui/money.ts` — add, and define `ratePct` through `percent`:

```ts
/** A rate without the unit: «11,5%». */
export const percent = (r: number) => `${PCT.format(Math.round(r * 10000) / 100)}%`;
/** The bank's rate as is: up to two decimals, decimal comma, no trailing zeros. */
export const ratePct = (r: number) => `${percent(r)} годовых`;
/** A calculator term, in months only (owner, 2026-10-23): «18 мес.». */
export const monthsLabel = (n: number) => `${n} мес.`;
```

`packages/web/src/ui/HintButton.tsx`:

```tsx
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
```

`packages/web/src/ui/index.ts` — `export { duration, monthsLabel, percent, ratePct, rub } from './money';` and `export { HintButton } from './HintButton';`.

`packages/web/src/catalog/firstMoney.tsx` — replace `DepositCalculatorImpl` (the Savings board's deposit card: result on top, sliders, hint, button with the amount, legal note):

```tsx
export const DepositCalculatorImpl = createComponentImplementation(DepositCalculatorDef.api, ({ props, context }) => {
  const d = props.deposit as DepositCalc | undefined;
  const calc = useLiveCalc(d ? d.calculatedFor : { amount: 0, months: 0 }, (inputs) => dispatch(context, 'deposit.recalc', inputs));
  if (!d) return null;
  const apply = d.hint.apply;
  return (
    <WidgetCard icon={<SafeIcon />} title={`Вклад «${d.tariffName}»`} subtitle={d.conditions}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <div className="flex gap-4">
              <span className="flex min-w-24 flex-col gap-0.5">
                <span className="whitespace-nowrap font-display text-amount tabular-nums">{percent(d.rate)}</span>
                <span className="text-caption text-muted">Ставка</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <Amount value={d.income} size="amount" tone="positive" plus />
                <span className="text-caption text-muted">Доход к {d.payoutLabel}</span>
              </span>
            </div>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Сумма" value={calc.inputs.amount} min={d.amountMin} max={d.amountMax} step={d.amountStep} format={rub} minLabel={rub(d.amountMin)} maxLabel={rub(d.amountMax)} onChange={(amount) => calc.change({ amount })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={d.monthsMin} max={d.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(d.monthsMin)} maxLabel={monthsLabel(d.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<PercentIcon size={20} />} text={d.hint.text} actionLabel={apply ? 'Поставить' : undefined} onPress={apply ? () => calc.change(apply) : undefined} />
        <ActionRow primary={{ label: `Открыть на ${rub(calc.inputs.amount)}`, onPress: () => dispatch(context, 'product.open', { productId: d.productId, ...calc.inputs }) }} />
        <LegalNote text={d.disclosure} />
      </div>
    </WidgetCard>
  );
});
```

Add `HintButton`, `monthsLabel`, `percent` to the `../ui` import; drop imports this leaves unused.

`packages/web/src/showcase/fixtures.ts` — a second deposit case for the other tariff: import `setDepositCalc`; build `const sberDeposit = (() => { const s = createStore(); setDepositCalc(s, 150000, 18); return buildDataModel('young-adult', s, clock); })();` and add after the existing deposit case `normal('DepositCalculator', bound('DepositCalculator', 'deposit', '/depositCalc'), sberDeposit, 'СберВклад от 100 000 ₽')`.

- [ ] **Step 6: Tests for the server and the widget; update the old assertions**

`packages/server/test/firstMoney.test.ts`, in `describe('calculators')`:

```ts
  it('confirms the deposit the calculator shows, and opens exactly that record', async () => {
    const { d, surfaceId } = await chatSurface();
    const open = view(await handleAction({ role: 'young-adult', name: 'product.open', surfaceId, context: { productId: 'deposit', amount: 150000, months: 18 } }, d));
    expect(open.data.static.product).toMatchObject({ id: 'deposit', name: 'Вклад «СберВклад»', rate: 0.135 });
    expect(open.data.static.product.termsLines[1]).toBe('Срок — 18 мес.');
    const done = view(await handleAction({ role: 'young-adult', name: 'product.confirm', surfaceId: open.surfaceId, context: { productId: 'deposit' } }, d));
    expect(done.data.static.done.text).toBe('Вклад «СберВклад» открыт. Цель будет пополняться отсюда.');
    expect(d.store.youngAdult.openedProducts).toEqual(['deposit']);
  });
```

`packages/web/test/firstMoney.test.tsx` — replace the deposit tests («recalculates the deposit live…», «opens the deposit from the calculator») with:

```tsx
  it('recalculates the deposit live, and marks figures stale until the bank answers', () => {
    vi.useFakeTimers();
    const data = buildDataModel('young-adult', createStore(), { clock: '10:05' }) as any;
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], data);
    expect(screen.getByText('Вклад «Выгодный старт»')).toBeTruthy();
    expect(screen.getByText('11,5%')).toBeTruthy();
    expect(screen.getByText(/3\s450\s₽/)).toBeTruthy();
    expect(screen.getByText('Доход к 23 октября 2027')).toBeTruthy();
    const term = screen.getAllByRole('slider')[1];
    expect(term.getAttribute('aria-valuetext')).toBe('12 мес.');
    fireEvent.change(term, { target: { value: '24' } });
    expect(term.getAttribute('aria-valuetext')).toBe('24 мес.');
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByText(/3\s450\s₽/)).toBeTruthy(); // the figures stay the bank's until it answers
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'deposit.recalc', context: { amount: 30000, months: 24 } });
    act(() => {
      actions.surface.dataModel.set('/depositCalc', { ...data.depositCalc, months: 24, rate: 0.125, income: 7500, calculatedFor: { amount: 30000, months: 24 } });
    });
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(screen.getByText(/7\s500\s₽/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('the hint moves the term slider to the better rate', () => {
    vi.useFakeTimers();
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    fireEvent.click(screen.getByRole('button', { name: /На 13 мес\. ставка выше — 12,5%/ }));
    expect(screen.getAllByRole('slider')[1].getAttribute('aria-valuetext')).toBe('13 мес.');
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'deposit.recalc', context: { amount: 30000, months: 13 } });
    vi.useRealTimers();
  });

  it('opens the deposit for the amount on the sliders', async () => {
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    fireEvent.click(screen.getByRole('button', { name: /^Открыть на 30\s000\s₽$/ }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'deposit', amount: 30000, months: 12 } }));
  });
```

Then update every old assertion this task invalidates — find them with `grep -rnE "depositReturn|15% годовых|14% годовых|0\.14\b|0\.15\b|7 234|7\\\\s234|52 234|Открыть вклад|Вклад — " packages --include='*.ts' --include='*.tsx' | grep -v node_modules`:
- `packages/mocks/test/calculators.test.ts`: the `depositReturn` test becomes `expect(depositIncome(100000, 12, 0.13)).toBe(13000); expect(depositIncome(30000, 12, 0.115)).toBe(3450); expect(depositIncome(10000, 3, 0)).toBe(0);`.
- `packages/mocks/test/youngAdult.test.ts`: the deposit clamp test expects `DEPOSIT_BOUNDS` (`amountMax` 500000, `monthsMin` 1); the `depositCalc` figures test expects `{ tariffName: 'Выгодный старт', amount: 30000, months: 12, rate: 0.115, income: 3450, payoutLabel: '23 октября 2027', calculatedFor: { amount: 30000, months: 12 } }`; `futureValue(…, 0.14)` becomes `futureValue(…, DEMO_RATES.savings)`.
- `packages/server/test/firstMoney.test.ts` line ~71: `0.14` → `DEMO_RATES.savings`.
- `packages/web/test/firstMoney.test.tsx` around line 160–170 (the ConfirmOpenProduct test on `PRODUCTS.deposit`): rate text `'13,5% годовых'`. The `ratePct` unit test stays as is.
- Spending-cut assertions with a goal (`monthsSooner`, «на 8 мес. раньше») use `DEMO_RATES.savings` through the data model: where a test asserts a literal month count from the data model, compute it with `spendCut(…, { target, monthly, rate: DEMO_RATES.savings })` instead of the old literal. Tests that pass an explicit rate to `spendCut` stay.

- [ ] **Step 7: Run everything**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A packages
git commit -m "feat(prototype): deposit tariffs follow amount and term; calculator rebuilt to the Savings board" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Savings account calculator

**Files:**
- Modify: `packages/mocks/src/youngAdult.ts`, `packages/mocks/src/calculators.ts`, `packages/mocks/src/store.ts`, `packages/mocks/src/dataModel.ts`, `packages/catalog/src/records.ts`, `packages/catalog/src/components/firstMoney.ts`, `packages/catalog/src/catalogs.ts`, `packages/server/src/actions.ts`, `packages/web/src/catalog/firstMoney.tsx`, `packages/web/src/catalog/index.ts`, `packages/web/src/phone/usePhone.ts`, `packages/web/src/showcase/fixtures.ts`
- Test: `packages/mocks/test/calculators.test.ts`, `packages/mocks/test/youngAdult.test.ts`, `packages/server/test/firstMoney.test.ts`, `packages/web/test/firstMoney.test.tsx`, `packages/catalog/test/catalogs.test.ts`

**Interfaces:**
- Consumes: `REALISTIC_AMOUNT`, `DEMO_RATES.savings` (0.125), `HintButton`, `monthsLabel`, `ratePct`, `useLiveCalc`.
- Produces: `ACCOUNT_BOUNDS`, `ACCOUNT_DEFAULT` ({ topUp: 5000, months: 12 }), `ACCOUNT_NOTE`, `accountGrowth(start, topUp, months, rate): { total, income }`, `setAccountCalc(store, topUp, months)`, `YoungAdultState.account`, `AccountCalcSchema` / `AccountCalc`, `SavingsAccountCalculatorDef` (prop `account`, path `/accountCalc`), action `account.recalc` context `{ topUp, months }` (quiet).

- [ ] **Step 1: Failing tests.** In `packages/mocks/test/calculators.test.ts`:

```ts
  it('grows a savings account: a start sum plus a monthly top-up, monthly capitalisation', () => {
    expect(accountGrowth(30000, 5000, 12, 0.125)).toEqual({ total: 97532, income: 7532 });
    expect(accountGrowth(30000, 0, 1, 0)).toEqual({ total: 30000, income: 0 });
  });
```

In `packages/mocks/test/youngAdult.test.ts`:

```ts
  it('clamps the savings-account sliders and exposes the calculator', () => {
    const s = createStore();
    expect(AccountCalcSchema.parse(buildDataModel('young-adult', s, { clock: '10:05' }).accountCalc)).toMatchObject({
      productId: 'savings-account', rate: 0.125, start: 30000, topUp: 5000, months: 12, total: 97532, income: 7532, calculatedFor: { topUp: 5000, months: 12 },
    });
    setAccountCalc(s, 999999, 99);
    expect(s.youngAdult.account).toEqual({ topUp: 30000, months: 36 });
    setAccountCalc(s, 1500, 0.4);
    expect(s.youngAdult.account).toEqual({ topUp: 2000, months: 1 });
    expect(() => setAccountCalc(s, Number.NaN, 3)).toThrow(ActionError);
  });
```

In `packages/server/test/firstMoney.test.ts`, `describe('calculators')`:

```ts
  it('recalculates the savings account in code, without a model call', async () => {
    const { d, fake, surfaceId } = await chatSurface();
    const calls = fake.calls.length;
    const r = await handleAction({ role: 'young-adult', name: 'account.recalc', surfaceId, context: { topUp: 10000, months: 24 } }, d);
    expect(r.kind).toBe('data');
    expect(fake.calls.length).toBe(calls);
    const dm = (r as any).messages[0].updateDataModel.value;
    expect(dm.accountCalc).toMatchObject({ topUp: 10000, months: 24, ...accountGrowth(30000, 10000, 24, 0.125), calculatedFor: { topUp: 10000, months: 24 } });
  });
```

In `packages/web/test/firstMoney.test.tsx`:

```tsx
  it('the savings account recalculates live and opens the account', async () => {
    vi.useFakeTimers();
    const actions = mount([root('a'), { id: 'a', component: 'SavingsAccountCalculator', account: { path: '/accountCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText('Накопительный счёт')).toBeTruthy();
    expect(screen.getByText(/97\s532\s₽/)).toBeTruthy();
    expect(screen.getByText(/7\s532\s₽/)).toBeTruthy();
    const topUp = screen.getByRole('slider', { name: 'Пополнять в месяц' });
    fireEvent.change(topUp, { target: { value: '10000' } });
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'account.recalc', context: { topUp: 10000, months: 12 } });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Открыть счёт' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'savings-account' } }));
  });
```

In `packages/catalog/test/catalogs.test.ts`, extend the expected young-adult components with `'SavingsAccountCalculator'` and actions with `'account.recalc'`.

Run: `npx vitest run packages/mocks packages/server packages/web packages/catalog` → FAIL (missing exports and component).

- [ ] **Step 2: Mocks.** `packages/mocks/src/youngAdult.ts`:

```ts
export const ACCOUNT_BOUNDS = { topUpMin: 0, topUpMax: 30000, topUpStep: 1000, monthsMin: 1, monthsMax: 36 };
export const ACCOUNT_DEFAULT = { topUp: 5000, months: 12 };
export const ACCOUNT_NOTE = 'Снять можно в любой момент — проценты за прошлые месяцы останутся';
```

`packages/mocks/src/calculators.ts`:

```ts
/** A savings account: a start sum plus a top-up at the end of every month, monthly capitalisation, rounded to the rouble. */
export function accountGrowth(start: number, topUp: number, months: number, annualRate: number) {
  let balance = start;
  for (let m = 0; m < months; m++) balance = balance * (1 + annualRate / 12) + topUp;
  const total = Math.round(balance);
  return { total, income: total - start - topUp * months };
}
```

`packages/mocks/src/store.ts` — `YoungAdultState` gains `account: { topUp: number; months: number }`; `createStore` sets `account: { ...ACCOUNT_DEFAULT }`; add:

```ts
export function setAccountCalc(store: Store, topUp: number, months: number): void {
  if (!Number.isFinite(topUp) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = ACCOUNT_BOUNDS;
  store.youngAdult.account = { topUp: clamp(Math.round(topUp / b.topUpStep) * b.topUpStep, b.topUpMin, b.topUpMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}
```

`packages/mocks/src/dataModel.ts` — in `base`:

```ts
    accountCalc: {
      productId: 'savings-account', name: PRODUCTS['savings-account'].name, rate: DEMO_RATES.savings, start: REALISTIC_AMOUNT,
      ...ya.account, ...ACCOUNT_BOUNDS, ...accountGrowth(REALISTIC_AMOUNT, ya.account.topUp, ya.account.months, DEMO_RATES.savings),
      calculatedFor: { ...ya.account },
      note: ACCOUNT_NOTE, disclosure: PRODUCTS['savings-account'].disclosure, ctaLabel: PRODUCTS['savings-account'].ctaLabel,
    },
```

- [ ] **Step 3: Catalog.** `records.ts`:

```ts
export const AccountCalcSchema = z.object({
  productId: z.literal('savings-account'),
  name: z.string(),
  rate: z.number(),
  start: z.number(),
  topUp: z.number(),
  months: z.number(),
  topUpMin: z.number(),
  topUpMax: z.number(),
  topUpStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  total: z.number(),
  income: z.number(),
  calculatedFor: z.object({ topUp: z.number(), months: z.number() }),
  note: z.string(),
  disclosure: z.string(),
  ctaLabel: z.string(),
});
export type AccountCalc = z.infer<typeof AccountCalcSchema>;
```

`components/firstMoney.ts`:

```ts
export const SavingsAccountCalculatorDef = defineComponent('SavingsAccountCalculator', 'A savings account calculator: the user sets a monthly top-up and a term, and the bank shows the balance with interest. Money can be withdrawn at any time. Opens the account.', {
  account: bound(AccountCalcSchema, 'Path /accountCalc'),
});
```

`catalogs.ts` — add `SavingsAccountCalculatorDef` after `DepositCalculatorDef`, and `'account.recalc'` after `'deposit.recalc'`.

- [ ] **Step 4: Server.** `actions.ts` — import `setAccountCalc`; add:

```ts
      case 'account.recalc':
        setAccountCalc(deps.store, Number(context.topUp), Number(context.months));
        return refreshData(input, deps, []);
```

- [ ] **Step 5: Web.** `packages/web/src/catalog/firstMoney.tsx`:

```tsx
export const SavingsAccountCalculatorImpl = createComponentImplementation(SavingsAccountCalculatorDef.api, ({ props, context }) => {
  const a = props.account as AccountCalc | undefined;
  const calc = useLiveCalc(a ? a.calculatedFor : { topUp: 0, months: 0 }, (inputs) => dispatch(context, 'account.recalc', inputs));
  if (!a) return null;
  return (
    <WidgetCard icon={<ChartIcon />} title={a.name} subtitle={`${ratePct(a.rate)} · без срока · снимай и пополняй когда хочешь`}>
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">Через {monthsLabel(a.months)} на счёте</span>
            <Amount value={a.total} size="amount" />
            <KeyValue rows={[{ label: 'Из них доход', value: <Amount value={a.income} tone="positive" plus /> }]} />
            <span className="text-caption text-muted">Старт — {rub(a.start)} с карты, дальше {rub(a.topUp)} в месяц</span>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="Пополнять в месяц" value={calc.inputs.topUp} min={a.topUpMin} max={a.topUpMax} step={a.topUpStep} format={rub} minLabel={rub(a.topUpMin)} maxLabel={rub(a.topUpMax)} onChange={(topUp) => calc.change({ topUp })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={a.monthsMin} max={a.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(a.monthsMin)} maxLabel={monthsLabel(a.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<InfoIcon size={20} />} text={a.note} />
        <ActionRow primary={{ label: a.ctaLabel, onPress: () => dispatch(context, 'product.open', { productId: a.productId }) }} />
        <LegalNote text={a.disclosure} />
      </div>
    </WidgetCard>
  );
});
```

`packages/web/src/catalog/index.ts` — import and register `SavingsAccountCalculator: SavingsAccountCalculatorImpl`. `packages/web/src/phone/usePhone.ts` — `QUIET_ACTIONS` gains `'account.recalc'`. `packages/web/src/showcase/fixtures.ts` — `normal('SavingsAccountCalculator', bound('SavingsAccountCalculator', 'account', '/accountCalc'))` after the deposit cases.

- [ ] **Step 6: Run** `npm test && npm run typecheck && npm run build` → all green.

- [ ] **Step 7: Commit**

```bash
git add -A packages
git commit -m "feat(prototype): savings account calculator, recalculated live on the server" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Piggy bank calculator

**Files:**
- Modify: `packages/mocks/src/youngAdult.ts`, `packages/mocks/src/calculators.ts`, `packages/mocks/src/store.ts`, `packages/mocks/src/dataModel.ts`, `packages/catalog/src/records.ts`, `packages/catalog/src/components/firstMoney.ts`, `packages/catalog/src/catalogs.ts`, `packages/server/src/actions.ts`, `packages/server/src/staticScreens.ts`, `packages/web/src/ui/icons.tsx`, `packages/web/src/catalog/firstMoney.tsx`, `packages/web/src/catalog/index.ts`, `packages/web/src/phone/usePhone.ts`, `packages/web/src/showcase/fixtures.ts`
- Test: `packages/mocks/test/calculators.test.ts`, `packages/mocks/test/youngAdult.test.ts`, `packages/server/test/firstMoney.test.ts`, `packages/web/test/firstMoney.test.tsx`, `packages/catalog/test/catalogs.test.ts`

**Interfaces:**
- Consumes: `SPEND_TOTAL` (22 800), `HintButton`, `monthsLabel`.
- Produces: `PIGGY_BOUNDS`, `PIGGY_DEFAULT` ({ sharePct: 3, months: 6 }), `PIGGY_NOTE`, `piggyTotal(monthlySpend, sharePct, months): { monthly, total }`, `setPiggyCalc(store, sharePct, months)`, `enablePiggy(store)`, `YoungAdultState.piggy`, `YoungAdultState.piggyOn`, `PiggyCalcSchema` / `PiggyCalc`, `PiggyBankCalculatorDef` (prop `piggy`, path `/piggyCalc`), actions `piggy.recalc` (quiet, context `{ sharePct, months }`) and `piggy.enable`, `DONE.piggyOn`, `PiggyIcon`.

- [ ] **Step 1: Failing tests.** `calculators.test.ts`:

```ts
  it('a piggy bank puts aside a share of every card purchase', () => {
    expect(piggyTotal(22800, 3, 6)).toEqual({ monthly: 684, total: 4104 });
    expect(piggyTotal(22800, 10, 12)).toEqual({ monthly: 2280, total: 27360 });
  });
```

`youngAdult.test.ts`:

```ts
  it('clamps the piggy-bank sliders and exposes the calculator', () => {
    const s = createStore();
    expect(PiggyCalcSchema.parse(buildDataModel('young-adult', s, { clock: '10:05' }).piggyCalc)).toMatchObject({ sharePct: 3, months: 6, monthlySpend: 22800, monthly: 684, total: 4104, calculatedFor: { sharePct: 3, months: 6 } });
    setPiggyCalc(s, 0, 40);
    expect(s.youngAdult.piggy).toEqual({ sharePct: 1, months: 12 });
    expect(() => setPiggyCalc(s, 3, Number.NaN)).toThrow(ActionError);
  });
```

`server/test/firstMoney.test.ts`, `describe('calculators')`:

```ts
  it('recalculates the piggy bank in code and switches it on', async () => {
    const { d, fake, surfaceId } = await chatSurface();
    const calls = fake.calls.length;
    const r = await handleAction({ role: 'young-adult', name: 'piggy.recalc', surfaceId, context: { sharePct: 10, months: 12 } }, d);
    expect(fake.calls.length).toBe(calls);
    expect((r as any).messages[0].updateDataModel.value.piggyCalc).toMatchObject({ sharePct: 10, months: 12, monthly: 2280, total: 27360 });
    const on = view(await handleAction({ role: 'young-adult', name: 'piggy.enable', surfaceId, context: {} }, d));
    expect(on.data.static.done.title).toBe('Копилка включена');
    expect(d.store.youngAdult.piggyOn).toBe(true);
  });
```

`web/test/firstMoney.test.tsx`:

```tsx
  it('the piggy bank recalculates live and switches on', async () => {
    vi.useFakeTimers();
    const actions = mount([root('p'), { id: 'p', component: 'PiggyBankCalculator', piggy: { path: '/piggyCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText('Копилка')).toBeTruthy();
    expect(screen.getByText(/4\s104\s₽/)).toBeTruthy();
    const share = screen.getByRole('slider', { name: 'С каждой покупки' });
    expect(share.getAttribute('aria-valuetext')).toBe('3%');
    fireEvent.change(share, { target: { value: '5' } });
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'piggy.recalc', context: { sharePct: 5, months: 6 } });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Включить копилку' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'piggy.enable' }));
  });
```

`catalogs.test.ts` — expect `'PiggyBankCalculator'` and actions `'piggy.recalc'`, `'piggy.enable'`.

Run the four packages' tests → FAIL.

- [ ] **Step 2: Mocks.** `youngAdult.ts`:

```ts
export const PIGGY_BOUNDS = { shareMin: 1, shareMax: 10, shareStep: 1, monthsMin: 1, monthsMax: 12 };
export const PIGGY_DEFAULT = { sharePct: 3, months: 6 };
export const PIGGY_NOTE = 'Выключить можно в любой момент, отложенное останется твоим';
```

`calculators.ts`:

```ts
/** A piggy bank: a share of every card purchase, put aside each month, rounded to the rouble. */
export function piggyTotal(monthlySpend: number, sharePct: number, months: number) {
  const monthly = Math.round((monthlySpend * sharePct) / 100);
  return { monthly, total: monthly * months };
}
```

`store.ts` — `YoungAdultState` gains `piggy: { sharePct: number; months: number }` and `piggyOn: boolean`; `createStore` sets `piggy: { ...PIGGY_DEFAULT }, piggyOn: false`; add:

```ts
export function setPiggyCalc(store: Store, sharePct: number, months: number): void {
  if (!Number.isFinite(sharePct) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = PIGGY_BOUNDS;
  store.youngAdult.piggy = { sharePct: clamp(Math.round(sharePct / b.shareStep) * b.shareStep, b.shareMin, b.shareMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}

export function enablePiggy(store: Store): void {
  store.youngAdult.piggyOn = true;
}
```

`dataModel.ts` — in `base`:

```ts
    piggyCalc: {
      ...ya.piggy, ...PIGGY_BOUNDS, monthlySpend: SPEND_TOTAL, ...piggyTotal(SPEND_TOTAL, ya.piggy.sharePct, ya.piggy.months),
      calculatedFor: { ...ya.piggy }, note: PIGGY_NOTE, ctaLabel: 'Включить копилку',
    },
```

- [ ] **Step 3: Catalog.** `records.ts`:

```ts
export const PiggyCalcSchema = z.object({
  sharePct: z.number(),
  months: z.number(),
  shareMin: z.number(),
  shareMax: z.number(),
  shareStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  monthlySpend: z.number(),
  monthly: z.number(),
  total: z.number(),
  calculatedFor: z.object({ sharePct: z.number(), months: z.number() }),
  note: z.string(),
  ctaLabel: z.string(),
});
export type PiggyCalc = z.infer<typeof PiggyCalcSchema>;
```

`components/firstMoney.ts`:

```ts
export const PiggyBankCalculatorDef = defineComponent('PiggyBankCalculator', 'A piggy bank for a small or soon goal: the user sets the share of every card purchase to put aside and a term, and the bank shows how much builds up. Switches the piggy bank on.', {
  piggy: bound(PiggyCalcSchema, 'Path /piggyCalc'),
});
```

`catalogs.ts` — add `PiggyBankCalculatorDef` after `SavingsAccountCalculatorDef`; actions `'piggy.recalc'`, `'piggy.enable'` after `'account.recalc'`.

- [ ] **Step 4: Server.** `staticScreens.ts` — `DONE.piggyOn: { title: 'Копилка включена', text: 'Будем откладывать процент с каждой покупки по карте. Выключить можно в любой момент.', backLabel: 'К плану' }`. `actions.ts` — import `setPiggyCalc`, `enablePiggy`:

```ts
      case 'piggy.recalc':
        setPiggyCalc(deps.store, Number(context.sharePct), Number(context.months));
        return refreshData(input, deps, []);
      case 'piggy.enable':
        enablePiggy(deps.store);
        return show(doneScreen(DONE.piggyOn));
```

- [ ] **Step 5: Web.** `packages/web/src/ui/icons.tsx` (the board's coin icon):

```tsx
export const PiggyIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="15" r="8" strokeWidth="1.8" /><path d="M11 7h6" strokeWidth="1.8" /><path d="M14 11v8M11.5 13.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" strokeWidth="1.5" /></Line>
);
```

`firstMoney.tsx`:

```tsx
export const PiggyBankCalculatorImpl = createComponentImplementation(PiggyBankCalculatorDef.api, ({ props, context }) => {
  const p = props.piggy as PiggyCalc | undefined;
  const calc = useLiveCalc(p ? p.calculatedFor : { sharePct: 0, months: 0 }, (inputs) => dispatch(context, 'piggy.recalc', inputs));
  if (!p) return null;
  const pct = (v: number) => `${v}%`;
  return (
    <WidgetCard icon={<PiggyIcon />} title="Копилка" subtitle="Откладывает процент с каждой покупки по карте">
      <div ref={calc.ref} className="flex flex-col gap-5">
        <ResultBox>
          <CalcResult isCurrent={calc.isCurrent}>
            <span className="text-secondary text-muted">За {monthsLabel(p.months)} отложится</span>
            <Amount value={p.total} size="amount" />
            <KeyValue rows={[{ label: 'В месяц', value: <Amount value={p.monthly} /> }]} />
            <span className="text-caption text-muted">По твоим тратам — {rub(p.monthlySpend)} в месяц</span>
          </CalcResult>
        </ResultBox>
        <CalcSlider label="С каждой покупки" value={calc.inputs.sharePct} min={p.shareMin} max={p.shareMax} step={p.shareStep} format={pct} minLabel={pct(p.shareMin)} maxLabel={pct(p.shareMax)} onChange={(sharePct) => calc.change({ sharePct })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={p.monthsMin} max={p.monthsMax} step={1} format={monthsLabel} minLabel={monthsLabel(p.monthsMin)} maxLabel={monthsLabel(p.monthsMax)} onChange={(months) => calc.change({ months })} />
        <HintButton icon={<InfoIcon size={20} />} text={p.note} />
        <ActionRow primary={{ label: p.ctaLabel, onPress: () => dispatch(context, 'piggy.enable') }} />
      </div>
    </WidgetCard>
  );
});
```

Register it in `catalog/index.ts`; `QUIET_ACTIONS` gains `'piggy.recalc'`; showcase `normal('PiggyBankCalculator', bound('PiggyBankCalculator', 'piggy', '/piggyCalc'))`.

- [ ] **Step 6: Run** `npm test && npm run typecheck && npm run build` → all green.

- [ ] **Step 7: Commit**

```bash
git add -A packages
git commit -m "feat(prototype): piggy bank calculator for small goals" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ways to the goal; ScenarioSliders removed; the chat instruction

**Files:**
- Modify: `packages/catalog/src/records.ts`, `packages/catalog/src/components/firstMoney.ts`, `packages/catalog/src/catalogs.ts`, `packages/mocks/src/youngAdult.ts`, `packages/mocks/src/store.ts`, `packages/mocks/src/dataModel.ts`, `packages/server/src/actions.ts`, `packages/server/src/fallback.ts`, `packages/server/src/prompt.ts`, `packages/server/scenarios/first-money-chat.json`, `packages/web/src/ui/icons.tsx`, `packages/web/src/catalog/firstMoney.tsx`, `packages/web/src/catalog/index.ts`, `packages/web/src/showcase/fixtures.ts`
- Test: `packages/catalog/test/catalogs.test.ts`, `packages/mocks/test/youngAdult.test.ts`, `packages/server/test/firstMoney.test.ts`, `packages/server/test/prompt.test.ts`, `packages/web/test/firstMoney.test.tsx`

**Interfaces:**
- Consumes: `pctText`, `DEMO_RATES`, the calculators of Tasks 1–3.
- Produces: `WAY_IDS`, `WayId`, `WaysSchema` / `Ways`; `WaysToGoalDef` (props `ways` bound `/ways`, `set` one of `big | small`); `WAYS`, `WAY_SETS`, `GOALS[*].saveFor`, `GOALS[*].ways`; `pickWay(store, wayId)`; `YoungAdultState.pickedWay`; data model keys `ways` (null without a goal) and `pickedWay`; action `way.pick` context `{ wayId }`; `ChevronIcon`, `SpendIcon`.
- Removes: `ScenarioSlidersDef`, `SavingsScenarioSchema` / `SavingsScenario`, `setSavingsScenario`, the `scenario` data-model key, `YoungAdultState.recalcs`, action `scenario.recalc`, `ScenarioSlidersImpl`, its showcase cases and tests. `SCENARIO_BOUNDS` stays (`selectGoal` and PlanComparison use it).

- [ ] **Step 1: Failing tests.**

`youngAdult.test.ts` — the "no goal" test expects `[dm.goal, dm.plans, dm.ways, dm.invite]` all `null` and `dm.pickedWay` `null`; replace the `setSavingsScenario` test with:

```ts
  it('offers ways that fit the goal, and records the way Лиза picks', () => {
    const s = createStore();
    selectGoal(s, 'apartment');
    const ways = WaysSchema.parse(ya(s).ways);
    expect(ways).toMatchObject({ title: 'Как копить на первый взнос', target: 1500000, suggested: 'big' });
    expect(ways.big.map((w) => w.id)).toEqual(['deposit', 'savings-account']);
    expect(ways.small.map((w) => w.id)).toEqual(['piggy', 'spend']);
    expect(ways.big[0].line).toBe('До 13,5% годовых, деньги лежат до конца срока');
    selectGoal(s, 'vacation');
    expect(WaysSchema.parse(ya(s).ways).suggested).toBe('small');
    pickWay(s, 'piggy');
    expect(ya(s).pickedWay).toBe('piggy');
    expect(() => pickWay(s, 'toString')).toThrow(ActionError);
    selectGoal(s, 'car');
    expect(ya(s).pickedWay).toBeNull(); // a new goal starts with no way picked
  });
```

`server/test/firstMoney.test.ts`:
- Replace `PLAN` with a ways screen: `const WAYS_SCREEN = { components: [root('r', 'w'), { id: 'r', component: 'Text', text: 'Вот варианты', variant: 'body' }, { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }] };` and use it wherever `PLAN` was. In the flow test replace the `scenario.recalc` step with `deposit.recalc` (context `{ amount: 50000, months: 6 }`, assert `d.store.youngAdult.deposit` equals `{ amount: 50000, months: 6 }`); in the stale-turn test (~line 102) send `deposit.recalc` from the earlier surface and assert `d.store.youngAdult.deposit` still equals `DEPOSIT_DEFAULT`. Where the flow asserts `'PlanComparison'` after «К плану» (~line 148), assert `'WaysToGoal'`.
- The fallback test with a goal expects `['WaysToGoal']` among the components and not `'ScenarioSliders'`; add a case: after `pickWay(store, 'deposit')` the chat fallback contains `'DepositCalculator'`, and the recipe validates with no issues.
- New test:

```ts
  it('a picked way answers in the chat with that way, and a forged way fails', async () => {
    const CALC = { components: [root('r', 'c'), { id: 'r', component: 'Text', text: 'Держи калькулятор', variant: 'body' }, { id: 'c', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }] };
    const { d, fake } = deps([PICKER, WAYS_SCREEN, CALC]);
    const home = await generateScreen({ role: 'young-adult', scenarioId: 'first-money-home', force: 'model_error' }, d);
    const opened = view(await handleAction({ role: 'young-adult', name: 'chat.open', surfaceId: home.surfaceId, context: {} }, d));
    const ways = view(await handleAction({ role: 'young-adult', name: 'goal.select', surfaceId: opened.surfaceId, context: { goalId: 'apartment' } }, d));
    expect(ways.comps).toContain('WaysToGoal');
    const picked = view(await handleAction({ role: 'young-adult', name: 'way.pick', surfaceId: ways.surfaceId, context: { wayId: 'deposit' } }, d));
    expect(picked.comps).toContain('DepositCalculator');
    expect(d.store.youngAdult.pickedWay).toBe('deposit');
    expect(fake.calls.at(-1)!.user as string).toContain('Хочу посмотреть: Вклад');
    const bad = view(await handleAction({ role: 'young-adult', name: 'way.pick', surfaceId: picked.surfaceId, context: { wayId: '__proto__' } }, d));
    expect(bad.data.static.done.title).toBe('Не получилось');
  });
```

`prompt.test.ts` — the listed components include `'WaysToGoal'`, `'SavingsAccountCalculator'`, `'PiggyBankCalculator'`, and the prompt does not contain `'ScenarioSliders'`.

`catalogs.test.ts` — expected components: drop `'ScenarioSliders'`, add `'WaysToGoal'`; actions: drop `'scenario.recalc'`, add `'way.pick'`.

`web/test/firstMoney.test.tsx` — delete the two ScenarioSliders tests and the `SavingsScenarioSchema` import; add:

```tsx
  it('ways to the goal: the set the model chose, a tap picks the way', async () => {
    const actions = mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], planData());
    expect(screen.getByText('Как копить на первый взнос')).toBeTruthy();
    expect(screen.getByText(/Цель — 1\s500\s000\s₽/)).toBeTruthy();
    expect(screen.queryByText('Копилка')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Накопительный счёт/ }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'way.pick', context: { wayId: 'savings-account' } }));
  });

  it('ways to the goal: the small set, and nothing without a goal', () => {
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'small' }], planData());
    expect(screen.getByRole('button', { name: /Копилка/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Сэкономить на тратах/ })).toBeTruthy();
    cleanup();
    const { container } = render(<div />);
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(container.textContent).toBe('');
  });
```

Run the five test files → FAIL.

- [ ] **Step 2: Catalog.** `records.ts` — delete `SavingsScenarioSchema` and its type; add:

```ts
export const WAY_IDS = ['deposit', 'savings-account', 'piggy', 'spend'] as const;
export type WayId = (typeof WAY_IDS)[number];
const WayRowSchema = z.object({ id: z.enum(WAY_IDS), name: z.string(), line: z.string() });
export const WaysSchema = z.object({
  title: z.string(),
  target: z.number(),
  /** The default set for the chosen goal. */
  suggested: z.enum(['big', 'small']),
  big: z.array(WayRowSchema).min(1),
  small: z.array(WayRowSchema).min(1),
});
export type Ways = z.infer<typeof WaysSchema>;
```

`components/firstMoney.ts` — delete `ScenarioSlidersDef` and its import; import `oneOf` from `../define` and `WaysSchema`; add:

```ts
export const WaysToGoalDef = defineComponent(
  'WaysToGoal',
  'Ways to reach the chosen goal as tappable rows; a tap opens that way\'s calculator in the chat. set "big": a deposit and a savings account, for a big goal with no rush; set "small": a piggy bank and saving on spending, for a small or soon goal. /ways/suggested is the default for the goal.',
  { ways: bound(WaysSchema, 'Path /ways'), set: oneOf(['big', 'small'] as const, 'Which ways to show') },
);
```

`catalogs.ts` — remove `ScenarioSlidersDef` and `'scenario.recalc'`; add `WaysToGoalDef` right after `GoalPickerDef`, and `'way.pick'` after `'goal.select'`.

- [ ] **Step 3: Mocks.** `youngAdult.ts` — `GOALS` entries gain `saveFor` and `ways` (type: `{ title; emoji; target; saveFor: string; ways: 'big' | 'small'; loan }`):

| id | saveFor | ways |
|---|---|---|
| cushion | 'на подушку безопасности' | 'big' |
| vacation | 'на отпуск' | 'small' |
| apartment | 'на первый взнос' | 'big' |
| car | 'на машину' | 'big' |
| education | 'на учёбу' | 'big' |

and add (import `pctText` from `./format`, types `WayId` from `@proto/catalog`):

```ts
export const WAYS: Record<WayId, { name: string; line: string }> = {
  deposit: { name: 'Вклад', line: `До ${pctText(DEMO_RATES.deposit)} годовых, деньги лежат до конца срока` },
  'savings-account': { name: 'Накопительный счёт', line: `${pctText(DEMO_RATES.savings)} годовых, снимай в любой момент` },
  piggy: { name: 'Копилка', line: 'Откладывает процент с каждой покупки' },
  spend: { name: 'Сэкономить на тратах', line: 'Посмотрим, что можно сократить без боли' },
};
export const WAY_SETS: Record<'big' | 'small', readonly WayId[]> = { big: ['deposit', 'savings-account'], small: ['piggy', 'spend'] };
```

`store.ts` — `YoungAdultState`: drop `recalcs`, add `pickedWay: WayId | null` (`createStore`: `null`); delete `setSavingsScenario`; `selectGoal` sets `ya.pickedWay = null`; add:

```ts
export function pickWay(store: Store, wayId: string): void {
  if (!Object.hasOwn(WAYS, wayId)) throw new ActionError('not_found', `No way ${wayId}`);
  store.youngAdult.pickedWay = wayId as WayId;
}
```

`dataModel.ts` — `base` gains `pickedWay: ya.pickedWay`; without a goal return `{ ...base, goal: null, plans: null, ways: null, invite: null }`; with a goal drop `scenario` and add:

```ts
    ways: {
      title: `Как копить ${goal.saveFor}`, target: goal.target, suggested: goal.ways,
      big: WAY_SETS.big.map((id) => ({ id, ...WAYS[id] })),
      small: WAY_SETS.small.map((id) => ({ id, ...WAYS[id] })),
    },
```

- [ ] **Step 4: Server.** `actions.ts` — remove `scenario.recalc` and `setSavingsScenario`; import `WAYS`, `pickWay`; add:

```ts
      case 'way.pick': {
        const wayId = str(context, 'wayId');
        pickWay(deps.store, wayId); // throws for an unknown way before WAYS[wayId] is read
        return { kind: 'screen', screen: await chatTurn(`Хочу посмотреть: ${WAYS[wayId as keyof typeof WAYS].name}`, deps), refresh: [] };
      }
```

`fallback.ts` — replace the with-goal branch of `youngAdultGroups`:

```ts
  const way = dm.pickedWay as WayId | null;
  const calculators: Record<WayId, Group> = {
    deposit: [{ id: 'calc', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }],
    'savings-account': [{ id: 'calc', component: 'SavingsAccountCalculator', account: { path: '/accountCalc' } }],
    piggy: [{ id: 'calc', component: 'PiggyBankCalculator', piggy: { path: '/piggyCalc' } }],
    spend: [{ id: 'calc', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }],
  };
  if (way && Object.hasOwn(calculators, way)) return [reply('Вот калькулятор. Подвигай ползунки — банк сразу пересчитает.'), calculators[way]];
  const suggested = (dm.ways as { suggested: 'big' | 'small' }).suggested;
  return [
    reply('Вот варианты под твою цель. Выбери, с чего начать.'),
    [{ id: 'ways', component: 'WaysToGoal', ways: { path: '/ways' }, set: suggested }],
  ];
```

`prompt.ts` — `ROLE_POLICY['young-adult']` becomes:

```
'The user is 19 and has just received a first salary. You chat with them about it. Never promise returns and never give a personal investment recommendation: investments appear only as the range in PlanComparison. Credit appears only inside PlanComparison. If asked for guaranteed returns or what to buy, show a Refusal bound to /refusals/notAdvice. Address with «ты». After a goal, offer ways with WaysToGoal; use SpendAnalytics for spending questions and DepositCalculator, SavingsAccountCalculator or PiggyBankCalculator when she asks about a deposit, a savings account or a piggy bank. Never state a rate or a sum yourself. The chat never shows FirstMoneyBanner: it opens with a short question and GoalPicker.'
```

`packages/server/scenarios/first-money-chat.json` — `instruction` becomes:

```
"A conversation about the first salary. The chat never shows FirstMoneyBanner: it opens with a short question and GoalPicker. Start every screen with a Text (variant body): your short chat reply in Russian, with no digits, amounts, rates or returns — figures appear only in the cards. If /goal is null, ask what the user is saving for and show GoalPicker. A goal is chosen only by tapping a GoalPicker button: if the user names a goal in text, reply that they can pick it below and show GoalPicker again. Once a goal is chosen, offer ways to reach it with WaysToGoal: set \"big\" for a big goal with no rush (a deposit or a savings account), \"small\" for a small or soon goal (a piggy bank or saving on spending). /ways/suggested is the default for the goal; you may ask one short question (how soon, how big) and switch the set from the answer. When the user picks a way (the message «Хочу посмотреть: …», also /pickedWay), show that way's calculator: Вклад → DepositCalculator, Накопительный счёт → SavingsAccountCalculator, Копилка → PiggyBankCalculator, Сэкономить на тратах → SpendAnalytics. Show PlanComparison only when the user asks to compare saving with a loan or with investing. InviteRelative fits near the end. Answer the user's latest message; do not repeat cards already shown unless asked."
```

- [ ] **Step 5: Web.** `icons.tsx`:

```tsx
export const SpendIcon = ({ size = 28 }: P) => (
  <Line size={size} box={28}><circle cx="14" cy="14" r="9" strokeWidth="1.8" /><path d="M14 5v9l6 5" strokeWidth="1.8" /></Line>
);
export const ChevronIcon = ({ size = 20 }: P) => (
  <Line size={size} box={20}><path d="M8 5l5 5-5 5" strokeWidth="1.8" /></Line>
);
```

`firstMoney.tsx` — delete `ScenarioSlidersImpl` (and imports it leaves unused: `useEffect`, `SavingsScenario`, `ScenarioSlidersDef`, and `Pill` / `SafeIcon` only if nothing else uses them); add:

```tsx
const WAY_ICONS: Record<WayId, ReactNode> = { deposit: <SafeIcon size={22} />, 'savings-account': <ChartIcon size={22} />, piggy: <PiggyIcon size={22} />, spend: <SpendIcon size={22} /> };

/** Ways to the goal (Savings board): the set the model chose; a tap picks the way and the chat answers with its calculator. */
export const WaysToGoalImpl = createComponentImplementation(WaysToGoalDef.api, ({ props, context }) => {
  const w = props.ways as Ways | undefined;
  const set = (props.set as 'big' | 'small' | undefined) ?? w?.suggested;
  if (!w || !set) return null;
  return (
    <WidgetCard title={w.title} subtitle={`Цель — ${rub(w.target)}. ${set === 'big' ? 'Выбери, где копить' : 'Выбери способ'}`}>
      <div className="-mx-2 flex flex-col">
        {w[set].map((row) => (
          <Button key={row.id} variant="ghost" fullWidth className="h-auto min-h-16 justify-start gap-3 whitespace-normal rounded-control px-2 py-3 text-left font-normal" onPress={() => dispatch(context, 'way.pick', { wayId: row.id })}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default text-success">{WAY_ICONS[row.id]}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body font-semibold text-foreground">{row.name}</span>
              <span className="text-secondary text-muted">{row.line}</span>
            </span>
            <span className="text-muted"><ChevronIcon /></span>
          </Button>
        ))}
      </div>
    </WidgetCard>
  );
});
```

(`import type { ReactNode } from 'react'`; `type Ways`, `type WayId`, `WaysToGoalDef` from `@proto/catalog`.)

`catalog/index.ts` — remove `ScenarioSliders`, add `WaysToGoal: WaysToGoalImpl`. `showcase/fixtures.ts` — remove the two ScenarioSliders cases; add:

```ts
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'big' }), withGoal, 'большая цель'),
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'small' }), withGoal, 'маленькая или скорая цель'),
    noData('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'big' })),
```

- [ ] **Step 6: Run** `npm test && npm run typecheck && npm run build` → all green. Also `grep -rn "ScenarioSliders\|scenario.recalc\|setSavingsScenario\|SavingsScenario" packages --include='*.ts' --include='*.tsx' --include='*.json' | grep -v node_modules | grep -v results` → no matches.

- [ ] **Step 7: Commit**

```bash
git add -A packages
git commit -m "feat(prototype): ways to the goal open their calculator in the chat; ScenarioSliders removed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: An eval case per savings widget

**Files:**
- Modify: `packages/evals/src/matrix.ts`, `packages/evals/src/run.ts`, `packages/evals/src/report.ts`
- Test: `packages/evals/test/eval.test.ts`

**Interfaces:**
- Consumes: `selectGoal`, `pickWay`, `GoalId`, `WayId`.
- Produces: `EvalCase.setup?: { goal: GoalId; way?: WayId }`, `EvalCase.userText?: string`, `EvalCase.expect?: string`; `CaseResult.shown?: boolean`; `shownComponents(result): string[]`; a «Виджеты» section in the report.

- [ ] **Step 1: Failing tests** in `eval.test.ts` — the matrix test becomes:

```ts
  it('builds every model × scenario × N, one injection case and one case per savings widget', () => {
    const cases = buildMatrix(parseArgs(['--models', 'claude-opus-5-5,claude-haiku-5-5', '--n', '2']), scenarios);
    // home, chat, one injection, and four widget cases → 7 per model per rep
    expect(cases).toHaveLength(2 * 7 * 2);
    expect(cases.filter((c) => c.force === 'injection_text')).toHaveLength(2 * 1 * 2);
    expect(cases.filter((c) => c.expect).map((c) => c.expect)).toEqual(expect.arrayContaining(['WaysToGoal', 'DepositCalculator', 'SavingsAccountCalculator', 'PiggyBankCalculator']));
    expect(cases.find((c) => c.expect === 'PiggyBankCalculator')).toMatchObject({ setup: { goal: 'vacation', way: 'piggy' }, userText: 'Хочу посмотреть: Копилка' });
    expect(estimateCostUsd(cases.filter((c) => c.model === 'claude-haiku-5-5'))).toBeLessThan(estimateCostUsd(cases.filter((c) => c.model === 'claude-opus-5-5')));
  });

  it('reports per widget: valid on the first try and shown', () => {
    const event = (firstTryValid: boolean) => ({ firstTryValid, outcome: 'model', policyViolations: 0, latencyMs: 1, costUsd: 0, usage: {} }) as unknown as ScreenEvent;
    const c = (expect: string, rep: number) => ({ model: 'claude-haiku-5-5', role: 'young-adult', scenarioId: 'first-money-chat', force: 'none', rep, expect }) as CaseResult['case'];
    const md = renderReport(parseArgs(['--models', 'claude-haiku-5-5', '--n', '2']), [
      { case: c('DepositCalculator', 0), event: event(true), leaked: false, shown: true },
      { case: c('DepositCalculator', 1), event: event(false), leaked: false, shown: false },
    ]);
    expect(md).toContain('## Виджеты');
    expect(md).toContain('| claude-haiku-5-5 | DepositCalculator | 2 | 50% | 50% |');
  });
```

Update the old matrix test's name and count (it is replaced by the one above). If `ScreenEvent` or `CaseResult` are not yet imported in the test, import them (`ScreenEvent` from `@proto/server`, `CaseResult` from `../src/report`).

Run: `npx vitest run packages/evals` → FAIL.

- [ ] **Step 2: Matrix.** `matrix.ts`:

```ts
import type { GoalId, Role, WayId } from '@proto/catalog';
// …
export interface EvalCase { model: string; role: Role; scenarioId: string; force: 'none' | 'injection_text'; rep: number; setup?: { goal: GoalId; way?: WayId }; userText?: string; expect?: string }

/** «Первые деньги» widget cases (spec: a widget is done when the model uses it correctly — valid on the first try and shown). */
const WIDGET_CASES: Pick<EvalCase, 'setup' | 'userText' | 'expect'>[] = [
  { expect: 'WaysToGoal', setup: { goal: 'apartment' } },
  { expect: 'DepositCalculator', setup: { goal: 'apartment', way: 'deposit' }, userText: 'Хочу посмотреть: Вклад' },
  { expect: 'SavingsAccountCalculator', setup: { goal: 'apartment', way: 'savings-account' }, userText: 'Хочу посмотреть: Накопительный счёт' },
  { expect: 'PiggyBankCalculator', setup: { goal: 'vacation', way: 'piggy' }, userText: 'Хочу посмотреть: Копилка' },
];
```

and in `buildMatrix` replace the `setup: 'goal'` line with:

```ts
        if (role === 'young-adult') for (const w of WIDGET_CASES) cases.push({ model, role, scenarioId: 'first-money-chat', force: 'none', rep, ...w });
```

- [ ] **Step 3: Runner.** `run.ts` — import `pickWay`; the dry-run line prints `${c.expect ? ` → ${c.expect}` : ''}` instead of the `setup` suffix; per case:

```ts
  if (c.setup) {
    selectGoal(deps.store, c.setup.goal);
    if (c.setup.way) pickWay(deps.store, c.setup.way);
  }
  // …
    const r = await generateScreen({ role: c.role, scenarioId: c.scenarioId, model: c.model, force: c.force === 'none' ? undefined : c.force, userText: c.userText, history: c.userText ? [`User: ${c.userText}`] : undefined }, deps);
  // …in the results.push of a successful case:
        shown: c.expect ? shownComponents(r).includes(c.expect) : undefined,
```

- [ ] **Step 4: Report.** `report.ts`:

```ts
export interface CaseResult { case: EvalCase; event: ScreenEvent | null; leaked: boolean; validatorIssues?: string[]; independent?: string[]; refused?: boolean; shown?: boolean; error?: string }

export const shownComponents = (result: ScreenResult): string[] =>
  ((result.messages[2] as any).updateComponents.components as { component: string }[]).map((c) => c.component);
```

and in `renderReport`, before the «Что дошло до клиента» block:

```ts
  const widgetCases = results.filter((r) => r.case.expect);
  if (widgetCases.length) {
    lines.push('', '## Виджеты', '', 'Случай на каждый виджет: модель получает сцену, где он нужен. «Показан» — виджет есть на экране.', '', '| Модель | Виджет | Случаев | Валидно с 1-й попытки | Показан |', '|---|---|---|---|---|');
    for (const model of args.models)
      for (const name of [...new Set(widgetCases.map((r) => r.case.expect!))]) {
        const mine = widgetCases.filter((r) => r.case.model === model && r.case.expect === name);
        if (!mine.length) continue;
        lines.push(`| ${model} | ${name} | ${mine.length} | ${pct(mine.filter((r) => r.event?.firstTryValid).length / mine.length)} | ${pct(mine.filter((r) => r.shown).length / mine.length)} |`);
      }
  }
```

- [ ] **Step 5: Run** `npm test && npm run typecheck && npm run build` → green; `npm run eval -- --dry-run` (or the package's dry-run script; check `packages/evals/package.json`) lists the four widget cases with `→ <Widget>`. Do not run the eval itself (it calls a model).

- [ ] **Step 6: Commit**

```bash
git add -A packages/evals
git commit -m "test(prototype): an eval case per savings widget, reported as valid and shown" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Real-browser checks, canvas comparison, eval run on the new cases — then STOP (controller)

**Files:** none new; fixes go through an implementer as fix rounds.

- [ ] **Step 1:** Restart the server on the subscription (`npm run start`); `bash 04-prototype/e2e/ui-check.sh` → exit 0.
- [ ] **Step 2:** By hand in `agent-browser`: banner → «Составить план» → «Первый взнос на квартиру» → WaysToGoal (big set) → «Вклад» → DepositCalculator «Выгодный старт», 30 000 ₽, 12 мес.; move the amount past 100 000 ₽ → «СберВклад» with new conditions and rate, no new model screen; tap the hint → the term moves; «Открыть на … ₽» → the confirmation shows tariff, amount, term and income → «Подтвердить» → «Готово». Then «Накопительный счёт» and, for «Отпуск», «Копилка»: sliders recalculate with no model call. No page errors.
- [ ] **Step 3:** Screenshot the showcase cases of WaysToGoal, DepositCalculator (both tariffs), SavingsAccountCalculator, PiggyBankCalculator and compare with `design/foundation/Savings.dc.html`; list every visible difference; fix through an implementer fix round.
- [ ] **Step 4:** Run the eval on the subscription for the four widget cases (owner-approved cost: subscription, no API spend) and record the «Виджеты» table; a widget whose case is not valid on the first try or not shown gets its catalog description or the instruction fixed in a fix round, then the case re-run.
- [ ] **Step 5:** STOP and report to the owner: screenshots vs the board, the eval table, the rulings from the ledger. The next group (spending and loan) starts only on the owner's go.
