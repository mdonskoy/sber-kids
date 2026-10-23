# Prototype UI Step 1 — the remaining groups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rest of the «Первые деньги» catalog works as on the approved boards: a loan-or-save comparison and an investment simulation with live recalculation, a goal amount-and-term step that picks the ways, and the conversation pieces (banner lead, tap echo, quick replies, invite, «ты» copy). `PlanComparison` is gone. Every path ends in opening a product.

**Architecture:** Engine unchanged (the model composes A2UI v0.9 screens from catalog widgets; the server validates; every figure comes from `@proto/mocks`). Calculators follow the savings ones exactly: a store setter that clamps, a data-model record with `calculatedFor`, a quiet `*.recalc` action, `useLiveCalc` in the widget. A tap that moves the chat on runs `chatTurn(text)` on the server and returns that text as an echo the phone shows as Лиза's bubble.

**Tech Stack:** TypeScript, Zod 3.25.76, `@a2ui/react` / `@a2ui/web_core` 0.14.0, React 19, HeroUI v3.2.6, Tailwind v4.3.3, Vitest.

**Spec:** `docs/process/2026-10-23-prototype-ui-design.md` — sections "Step 1", "The path these widgets serve", "Savings calculators", "The remaining groups in one build". Design: `04-prototype/design/foundation/LoanInvest.dc.html`, `Conversation.dc.html` (approved 2026-10-23), `Savings.dc.html` for the shared calculator layout, `04-prototype/design/tokens.md`.

**Pattern to copy:** `SavingsAccountCalculator` end to end — `ACCOUNT_*` constants and `accountGrowth` (mocks), `setAccountCalc` (store), `accountCalc` (data model), `AccountCalcSchema` (catalog records), `SavingsAccountCalculatorDef` (catalog), `account.recalc` (server actions, catalogs.ts, `QUIET_ACTIONS`), `SavingsAccountCalculatorImpl` (web), its showcase fixture and its tests in `mocks/test`, `server/test/firstMoney.test.ts`, `web/test/firstMoney.test.tsx`, `catalog/test/catalogs.test.ts`.

## Global Constraints

- Work in the worktree `/Users/donskoy/sber-kids/.claude/worktrees/prototype-engine`, branch `prototype-engine`. Code lives in `04-prototype/`. Never touch `.obsidian/`, the braindump file, `01-research/`, `02-hypotheses/`, `03-plan-100-days/`. Never push or deploy.
- Process docs and code in English; everything shown inside the phone in Russian. Лиза is addressed with «ты»; no gendered verb forms in copy addressed to her («вложишь», not «вложишь сама»).
- No meta copy inside the phone: no «демо», «прототип», «ИИ», «модель» in any on-screen string inside the phone frame.
- Versions are exact pins; no new dependencies.
- Frontend rules: compose from HeroUI components only; `onPress`, not `onClick`, on HeroUI buttons; no Provider; no other UI kit. Never pass a `text-*` size token and a `text-*` colour together to a HeroUI part (comment in `packages/web/src/ui/WidgetCard.tsx`).
- Every money figure and rate on screen comes from `@proto/mocks` on the server, never from browser arithmetic (engine FR-021). The model never states a rate or a sum.
- Caller-keyed id lookups use own-key checks (`Object.hasOwn` or `.find` over an array), never `in` or bare indexing; validate before reading.
- Implementers never call a model, start a server against a model, or use credentials (server tests use the fake model — fine).
- One commit per task (fix commits allowed), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- From `04-prototype/`: `npm test`, `npm run typecheck`, `npm run build` — all three green at every commit.
- Sliders: money in steps of 1 000 ₽; terms in months («18 мес.»).
- No loan application from the chat: no «Оформить», no loan form, no link to apply (owner, 2026-10-23).
- Investments: never a single security or fund name as advice; the warning line is always on screen.
- The showcase test requires a `normal` case for every catalog component: add cases for every new component, remove them for every removed one.
- TDD: write each task's tests first and see them fail.

---

### Task 1: Loan-or-save and investment calculators; PlanComparison removed

**Files:** mocks `youngAdult.ts`, `calculators.ts` (only to delete `investRange` if it ends unused), `store.ts`, `dataModel.ts`; catalog `records.ts`, `components/firstMoney.ts`, `catalogs.ts`; server `actions.ts`, `prompt.ts`, `scenarios/first-money-chat.json`, `fallback.ts` (only if it references PlanComparison); web `catalog/firstMoney.tsx`, `catalog/index.ts`, `ui/icons.tsx`, `phone/usePhone.ts`, `showcase/fixtures.ts`; their tests.

**Interfaces produced:** `LOAN_BOUNDS`, `LOAN_FALLBACK`, `LOAN_NOTE`, `setLoanCalc`, `YoungAdultState.loan`, `LoanCalcSchema`/`LoanCalc`, `LoanCompareDef` (prop `loan` → `/loanCalc`), actions `loan.recalc` (quiet, `{ amount, months }`) and `loan.save`; `INVEST_BOUNDS`, `INVEST_DEFAULT`, `INVEST_BENCHMARKS`, `INVEST_WARNING`, `INVEST_NOTE`, `setInvestCalc`, `YoungAdultState.invest`, `InvestCalcSchema`/`InvestCalc`, `InvestSimDef` (prop `invest` → `/investCalc`), actions `invest.recalc` (quiet, `{ monthly, months }`) and `invest.compare`; `PRODUCTS['broker-account']`; `LoanIcon`, `InvestIcon`.

Values (mocks, `youngAdult.ts`):

```ts
export const LOAN_BOUNDS = { amountMin: 100000, amountMax: 2000000, amountStep: 1000, monthsMin: 12, monthsMax: 300 };
/** For a goal the bank has no dedicated loan for. */
export const LOAN_FALLBACK = { title: 'Потребительский кредит', rate: 0.25, months: 36 };
export const LOAN_NOTE = 'Расчёт примерный, без страховок и комиссий. Решение о кредите банк принимает после заявки. Не является публичной офертой.';
export const INVEST_BOUNDS = { monthlyMin: 1000, monthlyMax: 20000, monthlyStep: 1000, monthsMin: 12, monthsMax: 120 };
export const INVEST_DEFAULT = { monthly: 5000, months: 60 };
/** Two named benchmarks instead of bare rates; assumed figures, marked as such on the card. */
export const INVEST_BENCHMARKS = [
  { id: 'bonds', name: 'Как фонд гособлигаций', line: 'около 10% в год, спокойнее', rate: 0.1 },
  { id: 'index', name: 'Как индекс акций Мосбиржи', line: 'в среднем около 18% в год, бывают годы в минусе', rate: 0.18 },
] as const;
export const INVEST_WARNING = 'Это не прогноз и не рекомендация. Можно получить меньше, чем вложишь';
export const INVEST_NOTE = 'Ориентиры условные: средняя доходность фонда облигаций и индекса акций за прошлые годы. Прошлая доходность не гарантирует будущую. Не является индивидуальной инвестиционной рекомендацией.';
```

`PRODUCTS['broker-account']`: `{ id: 'broker-account', name: 'Брокерский счёт', rate: 0, termsLines: ['Открыть — бесплатно, комиссии — по тарифу брокера', 'Пополнить — с карты в любой момент', 'Доход не гарантирован — можно получить меньше, чем вложишь', 'Сначала доступны простые инструменты, остальные — после теста'], disclosure: INVEST_NOTE, ctaLabel: 'Открыть брокерский счёт' }`. `ProductSchema.id` gains `'broker-account'`. `ConfirmOpenProductImpl` drops its «Ставка» row when `rate === 0`.

Store: `loan: { amount, months }` — `createStore` uses `{ amount: LOAN_BOUNDS.amountMin, months: LOAN_FALLBACK.months }`; `selectGoal` sets it to `{ amount: clamp(goal.target), months: (goal.loan ?? LOAN_FALLBACK).months }` (clamped to `LOAN_BOUNDS`). `invest: { ...INVEST_DEFAULT }`. Setters `setLoanCalc(store, amount, months)` and `setInvestCalc(store, monthly, months)` exactly like `setAccountCalc` (finite check → `ActionError('bad_state')`, round to step, clamp).

Data model: `investCalc` in `base` (no goal needed):
`{ ...ya.invest, ...INVEST_BOUNDS, benchmarks: INVEST_BENCHMARKS.map((b) => ({ id: b.id, name: b.name, line: b.line, total: futureValue(monthly, months, b.rate) })), paid: monthly * months, warning: INVEST_WARNING, disclosure: INVEST_NOTE, calculatedFor: { ...ya.invest } }`.
`loanCalc` only with a goal (`null` without), with `loan = goal.loan ?? LOAN_FALLBACK` and `a = annuity(amount, loan.rate, months)`:
`{ goalTitle: goal.title, loanTitle: loan.title, rate: loan.rate, psk: loan.rate, ...ya.loan, ...LOAN_BOUNDS, payment: a.payment, overpayment: a.overpayment, saveMonths: monthsToTarget(amount, a.payment, DEMO_RATES.savings), saveRate: DEMO_RATES.savings, hint: { text, warn }, calculatedFor: { ...ya.loan }, disclosure: LOAN_NOTE, ctaLabel: 'Копить тем же платежом' }` where `warn = a.payment > LIZA.salary / 3` and `text = warn ? 'Платёж больше трети зарплаты — банк может отказать' : 'Чем короче срок, тем меньше переплата'`. (ПСК equals the rate here: no fees in the mock.)

Remove `PlanComparison` everywhere: `PlanComparisonDef`, `PlanOptionSchema`, `PlanListSchema`, their types, the `plans` data-model key (and `plans: null`), `PlanComparisonImpl`, its registration, showcase cases and every test that renders or asserts it; `DEMO_RATES.investLow/investHigh` and `investRange` if they end unused; `YoungAdultState.months`, `SCENARIO_BOUNDS` and the `selectGoal` months line if nothing else reads them (`monthly` stays: the spending cut uses it). Validator/pipeline tests that use PlanComparison as a literal example switch to another bound component (e.g. `WaysToGoal` with `ways: { path: '/ways' }, set: 'big'`) keeping what each test asserts.

Server actions:
- `loan.recalc` → `setLoanCalc` + `refreshData`; `invest.recalc` → `setInvestCalc` + `refreshData` (both added to `QUIET_ACTIONS`).
- `loan.save`: requires a goal (`ActionError('bad_state')` without one); reads the store's loan, computes the payment and `saveMonths` the same way as the data model (extract one helper in mocks, e.g. `loanQuote(store)`, used by both — no duplicated formula), `setAccountCalc(store, payment, saveMonths)`, `pickWay(store, 'savings-account')`, then `chatTurn('Хочу копить тем же платежом', deps)`.
- `invest.compare`: `setAccountCalc(store, invest.monthly, invest.months)`, `pickWay(store, 'savings-account')`, `chatTurn('Сравнить с накопительным счётом', deps)`.
- `product.open` with `'broker-account'` works through the existing `PRODUCTS` path.

Prompt: in `ROLE_POLICY['young-adult']` replace the PlanComparison sentences with «Investments appear only as the two benchmarks in InvestSim; never name a security or a fund to buy. Credit appears only inside LoanCompare; never offer to apply for a loan.» and add LoanCompare / InvestSim to the list of calculators shown when she asks about a loan or investing; rule 5 of the system prompt says «credit outside LoanCompare». In `first-money-chat.json` replace the PlanComparison sentence with «Show LoanCompare when the user asks to compare saving with a loan, InvestSim when she asks about investing.»

Web:
- `LoanCompareImpl` (Loan board): `WidgetCard` icon `LoanIcon` (two opposite arrows, from the board), title «Копить или взять кредит», subtitle `${goalTitle} · ${loanTitle}, ${percent(rate)}`. `ResultBox`/`CalcResult`: «Кредит — сразу»; `Amount` payment `size="amount"` + «в месяц»; `KeyValue` rows «Переплата» (`rub`) and «ПСК» (`percent(psk)`); a divider; «Копить тем же платежом»; `monthsLabel(saveMonths)` in amount size, success colour; caption `На накопительном счёте под ${percent(saveRate)}, без переплаты`. Sliders «Сумма» (rub, 1 000 step) and «Срок кредита» (`monthsLabel`). `HintButton` static with `InfoIcon` (warning colour when `hint.warn` — use the `warning` token if it exists, else `danger`; check `index.css`). `ActionRow` primary `ctaLabel` → `dispatch(context, 'loan.save')`. `LegalNote` disclosure.
- `InvestSimImpl` (Investments board): icon `InvestIcon` (rising line with an arrow), title «Симуляция инвестиций», subtitle «Брокерский счёт · доход не гарантирован». Result: `Через ${monthsLabel(months)} может быть`, then per benchmark an `Amount` in amount size (the second in success colour) with a caption `${name} — ${line}`, then a `KeyValue` row «Твои взносы» / `rub(paid)` above a divider. Each amount on its own line, `whitespace-nowrap` — it must fit at 374 px. Sliders «Вкладывать в месяц» and «Срок». Static `HintButton` with `AlertIcon` and `warning`. `ActionRow` primary «Открыть брокерский счёт» → `product.open { productId: 'broker-account' }`, secondary «Сравнить с накопительным счётом» → `invest.compare`. `LegalNote` disclosure.

Tests (write first):
- mocks: `annuity(900000, 0.22, 60)` → `{ payment: 24857, overpayment: 591421 }`; after `selectGoal(s, 'car')` and `setLoanCalc(s, 900000, 60)` (car loan 22 %; set explicitly so Task 2's new targets don't move it) `loanCalc` parses with `LoanCalcSchema` and has `payment: 24857, overpayment: 591421, saveMonths: 31, psk: 0.22, hint.warn: true`; no goal → `loanCalc: null`; `investCalc` default has benchmark totals `387185` and `481073`, `paid: 300000`; `setLoanCalc` / `setInvestCalc` clamp (e.g. `(50, 400)` → `{ 100000, 300 }`; `(1500, 5)` → `{ 2000, 12 }`) and throw `ActionError` on NaN.
- server: `loan.recalc` and `invest.recalc` return data with no model call; `loan.save` after a car goal and `loan.recalc { amount: 900000, months: 60 }` leaves `account` at `{ topUp: 25000, months: 31 }` (24 857 rounds to the 1 000 step), `pickedWay: 'savings-account'`, and the last model user turn contains «Хочу копить тем же платежом»; `loan.save` with no goal → «Не получилось»; `product.open` `broker-account` → a confirmation whose product id is `broker-account`, then `product.confirm` → «Брокерский счёт открыт. …».
- web (data model from a store with the car goal and `setLoanCalc(s, 900000, 60)`): LoanCompare renders «Копить или взять кредит», «24 857 ₽», «31 мес.», the warn hint; moving «Срок кредита» sends `loan.recalc` after 300 ms; «Копить тем же платежом» dispatches `loan.save`. InvestSim renders both totals and «Твои взносы», the warning; «Открыть брокерский счёт» dispatches `product.open { productId: 'broker-account' }`; «Сравнить с накопительным счётом» dispatches `invest.compare`. ConfirmOpenProduct for the broker account shows no «Ставка» row.
- catalog: the young-adult component list drops `PlanComparison`, adds `LoanCompare`, `InvestSim`; actions add `loan.recalc`, `loan.save`, `invest.recalc`, `invest.compare`.
- `grep -rn "PlanComparison\|PlanOption\|PlanList\|investRange" packages --include='*.ts' --include='*.tsx' --include='*.json' | grep -v node_modules | grep -v results` → only negative assertions in tests.

Commit: `feat(prototype): loan-or-save and investment calculators end in an open product; PlanComparison removed`.

---

### Task 2: Goal amount and term pick the ways

**Files:** mocks `youngAdult.ts`, `store.ts`, `dataModel.ts`; catalog `records.ts`, `components/firstMoney.ts`, `catalogs.ts`; server `actions.ts`, `fallback.ts`, `prompt.ts`, `scenarios/first-money-chat.json`; web `catalog/firstMoney.tsx`, `catalog/index.ts`, `showcase/fixtures.ts`; their tests.

**Interfaces produced:** `GOAL_PRESETS`, `GOAL_SETUP_BOUNDS`, `waySetFor(amount, months)`, `setGoalTarget(store, amount, months)`, `YoungAdultState.goalTarget` and `goalSet` (boolean), `GoalSetupSchema`/`GoalSetup`, `GoalSetupDef` (prop `setup` → `/goalSetup`), action `goal.setup` `{ amount, months }`; `WAY_IDS` gains `'loan'`, `'invest'`; `WaysSchema` with four sets; `WaysToGoal.set` one of `big | small | urgent | risk`.

Values:

```ts
export const GOAL_SETUP_BOUNDS = { amountMin: 10000, amountMax: 5000000, amountStep: 1000, monthsMin: 1, monthsMax: 60 };
/** Three price points per goal «на любой карман»; `pick` is the default, `months` the default term. */
export const GOAL_PRESETS: Record<GoalId, { presets: { name: string; amount: number }[]; pick: number; months: number }> = {
  cushion: { presets: [{ name: 'На месяц', amount: 30000 }, { name: 'На три месяца', amount: 90000 }, { name: 'На полгода', amount: 180000 }], pick: 1, months: 12 },
  vacation: { presets: [{ name: 'Россия', amount: 40000 }, { name: 'Турция', amount: 80000 }, { name: 'Азия', amount: 150000 }], pick: 1, months: 6 },
  apartment: { presets: [{ name: 'Студия', amount: 900000 }, { name: 'Однушка', amount: 1500000 }, { name: 'Двушка', amount: 2400000 }], pick: 1, months: 36 },
  car: { presets: [{ name: 'С пробегом', amount: 600000 }, { name: 'Новая', amount: 1500000 }, { name: 'Кроссовер', amount: 2500000 }], pick: 0, months: 24 },
  education: { presets: [{ name: 'Курсы', amount: 60000 }, { name: 'Колледж', amount: 200000 }, { name: 'Вуз, год', amount: 400000 }], pick: 1, months: 24 },
};
/** The amount and term pick the ways, not the goal type: small → piggy and spending; urgent → loan vs save; else deposit and account. */
export const waySetFor = (amount: number, months: number) => (amount <= 150000 ? 'small' : months <= 12 ? 'urgent' : 'big');
```

`GOALS[*].target` becomes the default preset's amount (car: 600 000); `GOALS[*].ways` is removed. `WAYS` gains `loan: { name: 'Копить или взять кредит', line: 'Сравним платёж по кредиту со временем накопления' }` and `invest: { name: 'Инвестиции', line: 'Два ориентира и диапазон, без обещаний' }`; `WAY_SETS` gains `urgent: ['loan', 'savings-account']`, `risk: ['invest', 'deposit']`.

Store: `goalTarget: { amount, months } | null` (null without a goal) and `goalSet: boolean`. `selectGoal` sets `goalTarget` to the default preset and term, `goalSet = false`, `pickedWay = null`, and the loan to `{ amount: clamp(default amount), months: (goal.loan ?? LOAN_FALLBACK).months }`. `setGoalTarget(store, amount, months)`: `ActionError('bad_state')` without a goal or with non-finite input; round to the step and clamp to `GOAL_SETUP_BOUNDS`; `goalSet = true`; the loan amount follows the new target (clamped to `LOAN_BOUNDS`).

Data model: every reader of `GOALS[id].target` reads `ya.goalTarget.amount` instead (goal, ways, spending cut, loan default). With a goal: `goalSetup: { goalId, title, emoji, presets, ...goalTarget, ...GOAL_SETUP_BOUNDS, ctaLabel: 'Дальше' }`, `goal: { …, target: goalTarget.amount, months: goalTarget.months, set: goalSet }`, `ways: { title: \`Как копить ${saveFor}\`, target, months, suggested: waySetFor(amount, months), big, small, urgent, risk }` (each set as rows `{ id, name, line }`). Without a goal: `goalSetup: null`.

Server: `goal.setup` → `setGoalTarget`, then `chatTurn` with the text `${rubText(goalTarget.amount)} за ${goalTarget.months} мес.` built from the stored (clamped) values. Task 1's tests that rely on the car's target must not break here: they set the loan explicitly (see Task 1). Fallback (`youngAdultGroups`): with a goal and `!goal.set` → a reply plus `GoalSetup`; with a picked way → that way's calculator (add `loan → LoanCompare (loan → /loanCalc)`, `invest → InvestSim (invest → /investCalc)`); else a reply plus `WaysToGoal` with `set: ways.suggested`.

Instruction (`first-money-chat.json`), replacing the goal/ways part: «Once a goal is tapped (the message «Моя цель: …»), ask how much and by when and show GoalSetup. After the amount and term (the message «… ₽ за … мес.», also /goal/set), offer ways with WaysToGoal, set = /ways/suggested: small → a piggy bank or saving on spending; big → a deposit or a savings account; urgent → comparing a loan with saving. Use set "risk" only when the user says she is ready for risk or asks about investing. When the user picks a way (the message «Хочу посмотреть: …», also /pickedWay) show its calculator: Вклад → DepositCalculator, Накопительный счёт → SavingsAccountCalculator, Копилка → PiggyBankCalculator, Сэкономить на тратах → SpendAnalytics, Копить или взять кредит → LoanCompare, Инвестиции → InvestSim.» Keep the rest (reply Text first with no digits, GoalPicker rules, InviteRelative, LoanCompare/InvestSim on request, no repeats). `ROLE_POLICY` mentions GoalSetup after a goal.

Web `GoalSetupImpl` (Conversation board, «Сумма и срок цели»): local state for amount and months (no recalc — nothing on the card is a bank figure). `WidgetCard` title `${emoji} ${title}`, subtitle «Сколько нужно и к какому сроку». Presets as a wrapping row of HeroUI `Button`s (two lines: amount in `rub`, 600; name, caption, muted); the one equal to the current amount is selected (`aria-pressed`, success ring); pressing sets the amount. `CalcSlider` «Сумма» (`rub`, step 1 000, bounds from data) and «Срок» (`monthsLabel`). `ActionRow` primary «Дальше» → `dispatch(context, 'goal.setup', { amount, months })`. `WaysToGoalImpl` handles the four sets and icons (`LoanIcon`, `InvestIcon` from Task 1); its subtitle is `Цель — ${rub(target)} за ${monthsLabel(months)}. Выбери, с чего начать`.

Tests (write first):
- mocks: `waySetFor(80000, 6)` 'small', `(1500000, 36)` 'big', `(600000, 12)` 'urgent', `(150000, 3)` 'small'; `selectGoal(s, 'vacation')` → `goalSetup` amount 80 000, months 6, `goal.set` false, `ways.suggested` 'small'; `setGoalTarget(s, 1500500, 70)` → `{ 1501000, 60 }` (rounded, clamped), `goal.set` true, `ways.suggested` 'big', loan amount 1 501 000; `setGoalTarget` with no goal throws; a new `selectGoal` resets `goal.set` and `pickedWay`; `pickWay(s, 'loan')` works.
- server: `goal.select` → GoalSetup screen (fake model or fallback); `goal.setup { amount: 600000, months: 12 }` → the model's user turn contains «600 000 ₽ за 12 мес.» (match with `\s` for the U+00A0), and the fallback shows `WaysToGoal` with `set: 'urgent'`; a forged `goal.setup` with `amount: 'x'` → «Не получилось» and the target unchanged; the fallback with `pickedWay: 'loan'` shows `LoanCompare` and validates.
- web: GoalSetup renders three presets, the default one pressed; pressing «Студия» moves the amount slider to «900 000 ₽»; «Дальше» dispatches `goal.setup { amount: 900000, months: 36 }`. WaysToGoal `set: 'urgent'` renders «Копить или взять кредит» and «Накопительный счёт».
- catalog: components add `GoalSetup`; actions add `goal.setup`.
- Showcase: `GoalSetup` normal case (with a goal) and no-data; WaysToGoal cases for `urgent` and `risk`.

Commit: `feat(prototype): goal amount and term pick the ways to the goal`.

---

### Task 3: Conversation — banner lead, tap echo, quick replies, invite, «ты» copy

**Files:** catalog `api.ts` (ActionResult), `records.ts`, `components/firstMoney.ts`, `catalogs.ts`; mocks `youngAdult.ts`, `dataModel.ts`; server `actions.ts`, `staticScreens.ts`, `fallback.ts`, `prompt.ts`, `scenarios/first-money-chat.json`; web `phone/usePhone.ts`, `catalog/firstMoney.tsx`, `catalog/index.ts`, `showcase/fixtures.ts`; their tests.

**Interfaces produced:** `ActionResult` screen variant `{ kind: 'screen'; screen; refresh; echo?: string }`; `QUICK_REPLIES`, `quickReplies` data-model key, `QuickRepliesSchema`, `QuickRepliesDef` (prop `replies` → `/quickReplies`), action `reply.pick` `{ replyId }`; `FirstMoneyBannerSchema.lead`.

- **Banner:** `BANNER` gains `lead: 'Хочешь сохранить и приумножить?'`; `subtitle` becomes `'Соберём план под твою цель — за пару минут в чате'`. `FirstMoneyBannerImpl` keeps its layout and shows `lead` as a 600 line between the title/amount line and the subtitle.
- **Tap echo:** every action that answers with `chatTurn(text)` returns `echo` — `goal.select` (`${emoji} ${title}`, while the model still gets «Моя цель: …»), `goal.setup`, `way.pick`, `loan.save`, `invest.compare`, `reply.pick` (the text itself). In `usePhone`, when an action's result is a screen with `echo`, append a `{ kind: 'user', … }` feed item with that text before showing the screen (same shape `send` uses). Recalcs and static screens carry no echo.
- **Quick replies:** `QUICK_REPLIES = { loan: 'Сравнить с кредитом', invest: 'А если инвестировать?', invite: 'Копить вместе с мамой', spend: 'Как сэкономить на тратах?' } as const`. Data model `quickReplies`: `null` until the goal is set (`goal.set`); then the first three, in the order for the goal's way set, that are not the picked way (`spend` matches the way `spend`, `loan` the way `loan`, `invest` the way `invest`), as `{ id, text }[]`. Cutting spending is the first lever for small goals and a later one for big goals (owner, 2026-10-23): order for `small` is `['spend', 'invite', 'invest']` (no loan for a small goal); for `big`, `urgent` and `risk` it is `['loan', 'invest', 'spend', 'invite']`. `WAY_SETS.small` stays `['piggy', 'spend']`: the piggy bank is a product and its conversion comes first (owner, 2026-10-23). The instruction says: «For a small goal, cutting spending is the first thing to offer; for a big goal, offer it only after the savings ways.» Tests: small goal → replies `['spend', 'invite', 'invest']`; big goal with `pickedWay: 'loan'` → `['invest', 'spend', 'invite']`. `QuickRepliesDef`: «Two or three short follow-up questions under the latest answer; a tap sends one as the user's message.» Web: a wrapping row of HeroUI `Button`s, outline style (border `border`, radius full, `text-secondary`), each dispatching `reply.pick { replyId }`. Server `reply.pick`: own-key check on `QUICK_REPLIES` (`ActionError('not_found')`), then `chatTurn(text)` with `echo: text`. Instruction: «After the goal is set, end each screen with QuickReplies bound to /quickReplies.» Fallback: append a `QuickReplies` group after the calculator or ways when `quickReplies` is not null.
- **Invite (`InviteRelativeImpl`):** `WidgetCard` with a people icon (from the board), title «Копить вместе с мамой», subtitle `Цель «${goalTitle}»`, body text, primary button `ctaLabel`. Data-model text: «Мама сможет пополнять твою цель через Совместный счёт. Деньги останутся твоими.»
- **GoalPicker:** a wrapping row of chip buttons (emoji + title), per the board.
- **Spending analysis (owner, 2026-10-23):** `SpendAnalyticsImpl` puts the result box (`Освободится в месяц`, the goal row or the no-goal caption, «Пересчитываем…») on top, above the category list and the slider — the same order as the other calculators. A new primary button «Откладывать сэкономленное» dispatches `spend.save`, with `saved` from the current cut (the same `spendCut` call the data model uses — share one helper, no duplicated formula). Where it leads depends on the goal's way set (owner, 2026-10-23): a small goal (or no goal set yet) → the piggy bank: `setPiggyCalc(store, Math.round(saved / SPEND_TOTAL * 100), store's piggy months)` (clamped to 1–10 %) and `pickWay(store, 'piggy')`; any other set → the savings account (deposits take one lump sum with no top-ups): `setAccountCalc(store, saved, store's account months)` and `pickWay(store, 'savings-account')`. Then `chatTurn('Хочу откладывать сэкономленное')` with that echo. Catalog action `spend.save`. Tests: the result box precedes the category list in the DOM; the button dispatches `spend.save`; server, after cutting delivery by 20 % (`saved` 1 280 ₽): with a vacation goal set to 80 000 ₽ / 6 мес. → `piggy.sharePct` 6 and `pickedWay` 'piggy'; with an apartment goal set to 1 500 000 ₽ / 36 мес. → `account.topUp` 1 000 (the 1 000 step) and `pickedWay` 'savings-account'.
- **«ты» copy:** `DONE.actionFailed.text` → «Это уже сделано или устарело. Вернись на главный экран.»; `ConfirmOpenProductImpl` subtitle → «Проверь условия — после открытия их не изменить». Grep every on-screen string in `packages/*/src` for «вы»/«Вы»/«ваш»/«Вернитесь»/«Нажмите» and fix any left.

Tests (write first): banner renders the lead; `goal.select` result carries `echo: '🏠 Первый взнос на квартиру'` while the model's user turn has «Моя цель: Первый взнос на квартиру»; `usePhone` (or ChatPhone) shows the echo bubble before the new answer (test through the existing ChatPhone/usePhone test setup if one exists; else a focused hook test with a mocked `api`); `quickReplies` is null before `goal.set`, three items after, and excludes the picked way; `reply.pick { replyId: 'invest' }` echoes «А если инвестировать?» and runs a turn; forged `replyId: 'toString'` → «Не получилось»; QuickReplies renders three buttons and dispatches `reply.pick`; Invite renders «Копить вместе с мамой»; the failed-action Done text is the new copy. Catalog: `QuickReplies` component, `reply.pick` action; showcase cases.

Commit: `feat(prototype): conversation — tap echo, quick replies, banner lead, invite and «ты» copy`.

---

### Task 4: Eval cases for the new widgets

**Files:** `packages/evals/src/matrix.ts`, `run.ts`; `packages/evals/test/eval.test.ts`.

- `EvalCase.setup` gains `target?: { amount: number; months: number }` → `setGoalTarget` after `selectGoal` in `run.ts`.
- `WIDGET_CASES` becomes: `GoalSetup` (`{ goal: 'apartment' }`, `userText: 'Моя цель: Первый взнос на квартиру'`); `WaysToGoal` (`{ goal: 'apartment', target: { amount: 1500000, months: 36 } }`, `userText: '1 500 000 ₽ за 36 мес.'`); the three savings calculators as now, each with `target` of the default preset; `LoanCompare` (`{ goal: 'car', target: { amount: 600000, months: 12 }, way: 'loan' }`, `'Хочу посмотреть: Копить или взять кредит'`); `InvestSim` (`{ goal: 'apartment', target: { amount: 1500000, months: 36 }, way: 'invest' }`, `'Хочу посмотреть: Инвестиции'`).
- The matrix test: home, chat, one injection and seven widget cases → 10 cases per model per rep; it lists all seven `expect` names.
- Dry run (no model call) lists them; never run the real eval.

Commit: `test(prototype): eval cases for goal setup, loan and investment widgets`.

---

### Task 5: Real-browser check, board comparison, eval run — then STOP (controller)

- [ ] Restart the server on the subscription; `bash 04-prototype/e2e/ui-check.sh` → exit 0.
- [ ] By hand: banner → «Составить план» → «Первый взнос на квартиру» (echo bubble) → GoalSetup «Однушка», 36 мес. → «Дальше» → WaysToGoal big → «Вклад» → move to «СберВклад» → «Открыть на …» → confirm → «Готово». Then a car goal at 600 000 ₽ / 12 мес. → urgent set → «Копить или взять кредит» → «Копить тем же платежом» → savings account prefilled → «Открыть счёт» → «Готово». Then «А если инвестировать?» → InvestSim → «Открыть брокерский счёт» → confirm → «Готово». Recalcs make no model call; no page errors; nothing overflows at 374 px.
- [ ] Screenshot the showcase cases of every widget; compare with `Savings.dc.html`, `LoanInvest.dc.html`, `Conversation.dc.html`; fix every visible difference in one fix round.
- [ ] Run the eval on the subscription for the widget cases; record the «Виджеты» table; fix a widget that is not valid on the first try or not shown (catalog description or instruction), re-run that case.
- [ ] STOP and report to the owner.
