# Prototype UI — design spec

Date: 2026-10-23. Status: **draft for the owner's review**. Follows the [engine spec](2026-10-22-prototype-engine-design.md); the engine (Tasks 1–15, 17–19 of its [plan](2026-10-22-prototype-engine-plan.md)) is built on branch `prototype-engine`.

<!--
  Origin tags: [asked] in the owner's message of 2026-10-23; [answered: Qn] decided in a question on 2026-10-23
  (Q1 typeface, Q2 canvases, Q3 widget done, Q4 component base, Q5 live calculators, Q6 savings account,
  Q7 investments, Q8 loan); [approved: §n] a design section the owner approved in chat.
-->

## Goal

The owner's verdict on the built prototype: the interfaces look very bad — many fonts, crooked alignment, unclear accents [asked]. This spec covers three steps, in order [asked]:

0. **Bootstrap the interfaces** — one stack, one theme, shared building blocks, a showcase page.
1. **Every widget, one by one**, so that it works properly from the catalog.
2. **Tie the widgets into the CJM** of «Первые деньги».

Step 0 is specified in full here and gets its own plan. Steps 1 and 2 are scoped here (decisions and the widget list) and get their own plans when Step 0 is done.

## Decisions

- **The engine does not change: GenAI + A2UI.** On every turn the model still composes the screen — which catalog widgets, in what order, with what text, which calculator to offer — as an A2UI v0.9 message; the server still validates it and the official `@a2ui/react` renderer draws it. HeroUI is only what each catalog widget's single React implementation is made of: building blocks, not fixed screen templates [asked].
- **Bet 2 only.** The prototype shows «Первые деньги» only; bet 1 «Экран дня» is removed from the prototype altogether [asked]. The kid, teen and parent roles, their catalogs, scenarios, family mocks, actions (chores, transfers, lunch top-up, partner offer), widgets, tabs and eval cases are deleted; git history keeps them. The engine (catalog contract, validator, pipeline, fallback, telemetry, evals, debug panel) stays. `03-plan-100-days/` is untouched — bet 1 stays in the 100-day plan; only the illustration narrows.
- **Frontend rules** from the owner's dev-flow (`/Users/donskoy/molnio/docs/FRONTEND.md`) [asked]: React 19 + Vite + Tailwind v4 + HeroUI v3 (`@heroui/react` + `@heroui/styles`), no other UI kit; compose from HeroUI components, never hand-roll a widget HeroUI has (`onPress`, compound components, no provider); a Claude Design canvas the owner approved is the source of truth; impeccable for critique and polish.
- **Component base:** HeroUI v3 with our own Sber theme on top, not stock HeroUI and not Sber's Plasma [answered: Q4].
- **Typeface:** SB Sans — SB Sans Text for body, SB Sans Display for headings — loaded from Sber's public CDN (`cdn-app.sberdevices.ru/shared-static/0.0.0/styles/SBSansText.0.2.0.css`, `SBSansDisplay.0.2.0.css`, the files Sber's MIT-licensed Plasma design system uses), Inter as the fallback [answered: Q1]. The font files are not copied into the repo. The CDN states no font licence; acceptable for a private demo shown to Sber, revisit before anything public.
- **Canvases:** one foundation canvas in Step 0, then one canvas board per widget group in Step 1, each approved before that group is built [answered: Q2].
- **Widget "done"** (Step 1): it renders correctly from the catalog in every state on the showcase page and matches its canvas, **and** the model uses it correctly — its catalog description and props are reviewed and a per-widget eval case is valid on the first try [answered: Q3].
- **Calculators are live:** figures update about 0.3 s after a slider stops; each update is a server calculation with no model call, so every figure still comes from the bank's calculators, never from browser arithmetic (engine FR-021) [answered: Q5].
- **Products:** накопительный счёт stays as its own widget [answered: Q6]; the investment simulation stays [answered: Q7]; the loan appears only as a comparison with saving, only after a goal is chosen, with payment, overpayment and full cost (ПСК), and no «Оформить» button — the bet-2 rule «кредит показывается только по явной цели и только в сравнении» [answered: Q8].

## Step 0 — bootstrap [approved: §1, §2]

### Scope

Looks and construction only; what the widgets do does not change, except the live-recalculation mechanism (below). In order:

1. **Remove bet 1** (see Decisions). After it, the page is one phone — Лиза's chat — plus the collapsed debug panel. All remaining tests green.
2. **Stack:** add Tailwind v4 (`@tailwindcss/vite`) and HeroUI v3 to `packages/web`, exact versions pinned (current: `@heroui/react` 3.2.6, `@heroui/styles` 3.2.6, `tailwindcss` 4.3.3). Remove the hand-written `theme.css`.
3. **Sber theme** as HeroUI theme tokens, defined once:
   - type: SB Sans Text / Display; one scale of about five steps — title, section, body, caption, amount;
   - colour: Sber green only for the primary action and positive money; one neutral scale for text and borders; one warning and one error colour; no other accents;
   - a 4 px spacing grid; two radii (cards, controls).
4. **Shared building blocks** in `packages/web/src/ui/`, thin layers over HeroUI that every widget uses: `WidgetCard` (header with icon and title, body, actions row), `Amount`, `KeyValue`, `StatusChip`, `LegalNote` (legal small print, fixed text from the backend; not named `Disclosure`, which is a HeroUI component), `ActionRow` (one primary, then secondary), `CalcSlider` (labelled slider with value and bounds).
5. **Page chrome in HeroUI:** the phone frame, the page header, the chat input, and the debug panel.
6. **Catalog showcase** at `#/catalog`, team-only like the debug panel: every catalog widget rendered through the real A2UI renderer (`A2uiSurface`) with data from `@proto/mocks`, in each of its states — normal, empty, long text, error.
7. **Live recalculation**, one mechanism built end to end on the two reference calculators — вклад and Анализ трат (the pattern the other calculators reuse in Step 1): the slider keeps a local draft inside the widget (not in the A2UI data model, so a server answer for an older position never snaps the slider back); after about 0.3 s without movement the browser sends a calculator action; the server clamps the inputs, recalculates with `@proto/mocks` calculators, and answers with a data update that echoes the inputs it calculated for — no model call. The figures count as current only while those echoed inputs equal the slider's; otherwise they are dimmed and marked «Пересчитываем…», never shown as current.
8. **Three reference widgets** rebuilt to the approved canvas: `ConfirmOpenProduct` (the owner's example), **Анализ трат** (a list with a selectable row plus a calculator), **Вклад** calculator. Every other widget moves onto the new theme automatically and is reworked in its Step 1 group.

### Design gate

1. impeccable critique of screenshots of today's phone (including the owner's `ConfirmOpenProduct` screenshot) → a concrete list of problems the canvas must fix.
2. A Claude Design canvas, restricted to HeroUI v3 components, with three boards: tokens (type scale, colours, spacing, radii); chrome (phone frame, header, chat input); the three reference widgets with real data and their states.
3. The owner tweaks the canvas, saves, and says "design approved".
4. The canvas is committed to `04-prototype/design/foundation.dc.html` and linked from this spec's **Design** line.
5. Build through a plan, subagents and task reviews, as for the engine.
6. Showcase screenshots side by side with the canvas; an impeccable audit and polish pass; STOP for the owner.

**Design:** `04-prototype/design/foundation/` (canvas boards: tokens, chrome — home and chat, ConfirmOpenProduct, DepositCalculator, SpendAnalytics) and `04-prototype/design/tokens.md`; approved by the owner 2026-10-23. Reference: the dark theme of the chat in СберБанк Онлайн; the entry point sits on a bank-like home screen in place of an ad (owner, 2026-10-23). The app is dark only. Widget designs beyond the pattern are discussed per group in Step 1.

### Checks

- The existing suite, minus the deleted bet-1 tests, stays green; `npm run typecheck` and `npm run build` clean.
- A showcase test renders every catalog widget in each of its states with no errors.
- Responsive: the page at widths 560 / 760 / 1000 / 1400 has `scrollWidth ≤ innerWidth` and no element past the right edge.
- A real-Chromium check with `agent-browser` on the running server (jsdom missed this morning's blank page): the chat loads, a calculator updates live, no page errors.
- Live recalculation: tests that a slider move sends one calculator action after the pause, that no model is called, and that a slow earlier answer never overwrites a newer one.
- The reference widgets' screenshots match the canvas; impeccable audit has no open high-severity findings.

## Step 1 — widgets one by one (scoped; own plan later)

The «Первые деньги» catalog after Step 1:

| Widget | Calculator: input → server output |
|---|---|
| `FirstMoneyBanner` | — (entry into the conversation) |
| `GoalPicker` | — (the only way to choose a goal) |
| Варианты под цель (replaces `PlanComparison`) | — (two or three options the model picks for the goal; a tap opens that option's calculator in the chat) |
| Анализ трат | category + cut % → ₽ a month freed, months closer to the goal |
| Копилка (small goals) | sum or share of spending → total in N months |
| Накопительный счёт | monthly top-up + term → balance with interest |
| Вклад | amount + term → tariff (name, conditions, rate), income, payout date, a hint how to earn more |
| Симуляция инвестиций | monthly amount + term → low–high range, fixed «не прогноз и не рекомендация» |
| Копить или взять кредит | amount + term → payment, overpayment, ПСК, next to the time to save the same sum; only after a goal is chosen; no «Оформить» |
| Пригласить родственника | — |
| `ConfirmOpenProduct` | — (static, server-built confirmation with full disclosure) |
| Shared: `Text`, `Section`, `Column`, `Notice`, `Refusal`, `Handoff`, `EmptyState`, `Done` | — |

`PlanComparison` and the shared `ScenarioSliders` are removed: each product carries its own calculator. Groups for canvases and builds, in this order (owner, 2026-10-23): **savings** (Варианты под цель, Вклад, Накопительный счёт, Копилка) first; spending and loan (Анализ трат, Копить или взять кредит); investments; conversation (banner, goal picker, invite, confirm, shared). Each group: canvas board → approval → build → showcase + eval case per widget.

### The path these widgets serve [asked 2026-10-23]

Today in СберБанк Онлайн the path exists but is broken across screens — a chat card «Откройте вклад или счёт» → «Узнать больше» → a list of deposits → a product page with a plain calculator, or a separate GigaChat — and none of it is interactive in the chat. Here it is one conversation:

1. The model asks the goal.
2. In the dialogue the model offers two or three options that fit the goal, asking a question when the goal doesn't say enough. Rules for the model's instruction:

   | Goal | Options |
   |---|---|
   | small or soon (a phone, a trip) | save on spending, Копилка |
   | big, no rush (a down payment, education) | Вклад, Накопительный счёт |
   | big and urgent | Копить или взять кредит |
   | ready for more risk | Симуляция инвестиций (broker account) |

3. A tapped option opens its calculator in the chat.

### Savings calculators [asked 2026-10-23]

- **One layout** for Вклад, Накопительный счёт, Копилка: the result on top in large type, the sliders below, a hint, the legal note, the primary button. The live-recalculation mechanism of Step 0 is unchanged.
- **Вклад sliders:** amount 10 000–500 000 ₽ in steps of 1 000 ₽; term 1–36 months in steps of one month, shown in months («18 мес.»). The starting amount is realistic for Лиза: her balance minus the month's mandatory spending, rounded down to 5 000 ₽ (45 000 − 9 800 − 2 300 → 30 000 ₽).
- **The tariff follows amount and term** and its name, conditions and rate change live: «Выгодный старт» — от 10 000 ₽, от 1 месяца, до 12,5% (10 000 ₽ на 7 месяцев → 10,5%, as on the product page); «СберВклад» — от 100 000 ₽, от 1 месяца, до 13,5%. Накопительный счёт — 12,5%. Rates are a mock grid by amount and term in `@proto/mocks`, capped at these headline values (the bank's published 13,5% includes rate boosts; boosts are out, so 13,5% is the top of the grid). The server picks the tariff and rate; the model never states a rate.
- **Result:** income and the payout date («+609,86 ₽ к 23 мая 2027»); the button carries the amount («Открыть на 30 000 ₽»).
- **Hint** — how to earn more by changing amount or term only («На 12 мес. ставка выше», «От 100 000 ₽ — СберВклад, до 13,5%»). Rate boosts («надбавки») are out of scope for now (owner, 2026-10-23).

**Design:** the board `04-prototype/design/foundation/Savings.dc.html` (goal options for a big and a small goal; Вклад live, tariff switch at 100 000 ₽, stale; Накопительный счёт; Копилка) — approved by the owner 2026-10-23. It supersedes the Step 0 `Deposit.dc.html` board for the deposit layout.

### The remaining groups in one build [asked 2026-10-23]

The owner asked to go faster: the spending-and-loan, investments and conversation groups get their boards approved together and one build. Анализ трат keeps its Step 0 board with two changes (owner, 2026-10-23): the result moves on top like the other calculators, and a button «Откладывать сэкономленное» opens the savings account with the freed amount as the top-up.

- **Goal amount.** After the goal, a card «Сколько нужно и к какому сроку»: three price points per goal «на любой карман» (квартира — студия, однушка, двушка; отпуск — Россия, Турция, Азия; машина — с пробегом, новая, кроссовер; подушка, учёба likewise), amount slider in steps of 1 000 ₽, term in months, «Дальше». The amount and term — not the goal type — pick the ways: small or soon → Копилка, траты; big with time → Вклад, Накопительный счёт; big and urgent → Копить или взять кредит, Накопительный счёт. Education always leads with the loan comparison (owner, 2026-10-23): the student loan with state support (3%) costs less than saving earns, so its card adds «Узнать про образовательный кредит» → a bank specialist (handoff); still no application in the chat. Cutting spending is the first lever for small goals and a later one for big goals (owner, 2026-10-23): first among the quick replies for a small goal; for a big goal it comes only as a later quick reply. In the small set the Копилка stays first — a product, its conversion comes first. «Откладывать сэкономленное» leads to the Копилка for a small goal and to the Накопительный счёт for a big one (deposits take one lump sum, no top-ups).
- **Копить или взять кредит.** Result on top: the loan's payment, overpayment and ПСК; below, how many months saving the same payment takes at the savings-account rate. Sliders: amount, loan term in months. Hint: a payment above a third of the salary may be refused; otherwise a shorter term means less overpayment. No loan application from the chat (owner, 2026-10-23): the only button is «Копить тем же платежом» → the savings account with that top-up → «Открыть счёт».
- **Симуляция инвестиций.** Two named benchmarks instead of bare rates: «Как фонд гособлигаций — около 10% в год» and «Как индекс акций Мосбиржи — в среднем около 18% в год, бывают годы в минусе» (assumed figures, marked «ориентиры условные»), next to «Твои взносы»; the warning «не прогноз и не рекомендация, можно получить меньше» always shown; no single securities (that would be a personal recommendation). Buttons: «Открыть брокерский счёт» → confirmation with risks → «Готово»; «Сравнить с накопительным счётом» → the savings account with the same monthly amount and term.
- **Every path ends in opening a product** (owner, 2026-10-23: «не застрять в перебросе между опциями»).
- **Conversation.** Banner (owner, 2026-10-23): a one-line title «Первая зарплата — 45 000 ₽», the question «Хочешь сохранить и приумножить?» as the second level, the action «Составить план»; no other line. A tap that moves the chat on (goal, amount, way, quick reply, compare) appears as Лиза's bubble. Under the last answer, two or three quick replies from a bank-built list. Invite «Копить вместе с мамой». Confirmation, «Готово» and «Не получилось» in «ты».
- `PlanComparison` is removed: the loan and investment calculators replace it.

**Design:** `04-prototype/design/foundation/LoanInvest.dc.html` and `Conversation.dc.html`, approved by the owner 2026-10-23. The Step 0 boards `Deposit.dc.html` and `Confirm.dc.html` are deleted (superseded by `Savings.dc.html` and `Conversation.dc.html`).

## Step 2 — the CJM [closed 2026-10-23, owner]

Tie the widgets into the «Первые деньги» journey: which widgets the model offers at which stage (no goal yet → goal chosen → comparing → opening a product → inviting a relative), the transitions and actions between them, and the copy in Лиза's «ты» throughout (today's «вы» strings in `ConfirmOpenProduct` and the failed-action screen are fixed here). The owner's package of per-scenario edits lands here.

Closed without its own plan: the Step 1 builds covered it. The journey (goal → amount and term → ways → calculator → product or invite, every path ending in a product) came with "The remaining groups in one build"; the owner's click-through edits landed as 0466a95 («К плану» brings back the plan), c3a05db (a finished step drops out of the plan) and 71bad2a (every back button reads «К плану»); no «вы» copy is left.

## Non-goals

- Bet 1 anywhere in the prototype.
- Changing `03-plan-100-days/`.
- A loan application from the chat; personal investment advice; any promise of returns.

## Open items carried over

- p95 target in the README: 16 s, provisional; the final value is set from the hosted (API) latency measured after deploy (owner, 2026-10-23).
- Deploy (engine plan Task 16) comes after Steps 0–2, the eval re-run and the final review; owner's deploy answers are in the engine SDD ledger (no basic auth for now, by the owner's choice).
