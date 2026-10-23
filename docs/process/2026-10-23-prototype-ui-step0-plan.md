# Prototype UI, Step 0 (bootstrap) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The prototype shows «Первые деньги» only, built on HeroUI v3 + Tailwind v4 with one Sber theme, shared building blocks, a catalog showcase, and live server-side recalculation on two reference calculators — matching a Claude Design canvas the owner approved.

**Architecture:** The engine does not change: on every turn the model composes the screen as an A2UI v0.9 message from the young-adult catalog, the server validates it, and `@a2ui/react` renders it with our catalog implementations. Bet 1 (roles kid / teen / parent) is deleted. Each catalog implementation is rebuilt from building blocks in `packages/web/src/ui/` that wrap HeroUI components and the Sber theme tokens. Calculators keep a slider draft in the widget, send a server action after a 300 ms pause, and show figures as current only while the server's echoed inputs equal the slider's.

**Tech Stack:** React 19.3.1, Vite 8.3.5, Tailwind CSS 4.3.3 (`@tailwindcss/vite` 4.3.3), HeroUI 3.2.6 (`@heroui/react`, `@heroui/styles`) on react-aria-components 1.22.1, `@a2ui/react` / `@a2ui/web_core` 0.14.0, vitest 5.0.5 + jsdom 30.1.3, `@testing-library/user-event` 14.6.8, Hono server, zod 3.25.76.

**Spec:** `docs/process/2026-10-23-prototype-ui-design.md` (Step 0). The engine it builds on: `docs/process/2026-10-22-prototype-engine-design.md`.

## Global Constraints

- Work in the worktree `/Users/donskoy/sber-kids/.claude/worktrees/prototype-engine`, branch `prototype-engine`. Code lives in `04-prototype/`. Never touch `.obsidian/`, the braindump file, `01-research/`, `02-hypotheses/`, `03-plan-100-days/`. Never push or deploy.
- Process docs and code in English; everything shown inside the phone in Russian. Лиза is addressed with «ты».
- No meta copy inside the phone: no «демо», «прототип», «ИИ», «модель» in any on-screen string inside the phone frame (owner, 2026-10-23). The page header and the team-only debug panel / showcase are outside the phone.
- Versions are exact pins, never ranges: `@heroui/react` 3.2.6, `@heroui/styles` 3.2.6, `react-aria` 3.53.1, `react-aria-components` 1.22.1, `@internationalized/date` 3.12.4, `@react-aria/ssr` 3.10.1, `@react-aria/utils` 3.34.1, `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3, `@testing-library/user-event` 14.6.8. If a pinned version does not install, stop and report.
- Frontend rules (`/Users/donskoy/molnio/docs/FRONTEND.md`): compose from HeroUI components only — if HeroUI has one for the job, use it, never hand-roll it; `onPress`, not `onClick`, on HeroUI buttons; no Provider; no other UI kit.
- The engine does not change: the model composes screens as A2UI v0.9 messages; the server validates; `@a2ui/react` renders. Every money figure on screen comes from `@proto/mocks` calculators on the server — never from arithmetic in the browser (engine FR-021).
- Caller-keyed id lookups use own-key checks (`Object.hasOwn` or `.find` over an array), never `in` or bare indexing (engine ruling, Task 8).
- Claude access in checks: subscription only (`CLAUDE_AUTH=subscription`); never use or look for an API key. Implementer subagents never call a model, start a server against a model, or use credentials — live checks are the controller's.
- One commit per task (fix commits allowed), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- From `04-prototype/`: `npm test` (vitest, all packages), `npm run typecheck` (tsc over `packages/*/src` and `packages/*/test`), `npm run build` (web). All three green at every commit.

## File map

| Path (under `04-prototype/`) | Responsibility | Task |
|---|---|---|
| `packages/*` bet-1 files (list in Task 1) | deleted | 1 |
| `design/foundation.dc.html`, `design/tokens.md` | approved canvas; the token values it fixes | 2 |
| `docs/process/2026-10-23-ui-critique.md` (repo root `docs/`) | impeccable critique of today's UI | 2 |
| `packages/web/src/index.css` | Tailwind + HeroUI imports, Sber theme tokens | 3 |
| `packages/web/test/setup.ts`, `packages/web/test/heroui.smoke.test.tsx` | jsdom polyfills; proof HeroUI behaves in tests | 3 |
| `packages/web/src/ui/*` | building blocks over HeroUI; `useLiveCalc` | 4, 6 |
| `packages/web/src/catalog/*.tsx` | catalog implementations, rebuilt on the blocks | 4, 6 |
| `packages/web/src/phone/ChatPhone.tsx`, `src/App.tsx`, `src/debug/DebugPanel.tsx` | chrome in HeroUI | 4 |
| `packages/catalog/src/records.ts`, `components/firstMoney.ts`, `catalogs.ts` | `DepositCalculator`, `SpendAnalytics` (replaces `SpendBreakdown`) | 5 |
| `packages/mocks/src/{calculators,youngAdult,store,dataModel}.ts` | `depositReturn`, `spendCut`, calculator state, data keys | 5 |
| `packages/server/src/{actions,fallback,prompt}.ts`, `scenarios/first-money-chat.json` | `deposit.recalc`, `spend.recalc`; fallback and instructions | 5 |
| `packages/web/src/showcase/*` | `#/catalog` showcase page and its fixtures | 7 |
| `e2e/ui-check.sh` | real-Chromium responsive + page-error check | 8 |

---

### Task 1: Remove bet 1 «Экран дня»

**Files:** delete, modify and rewrite as listed below. Tests: the existing suite, rewritten where it used bet-1 fixtures.

**Interfaces:**
- Produces: `ROLES = ['young-adult'] as const` (so `Role` is `'young-adult'`); `CATALOGS` with one entry; `FORCE_STATES` without `'empty'`; `buildDataModel(role, store, { clock })` (no `empty`); `REFUSALS_NOT_AVAILABLE` and `HANDOFF` exported from `packages/mocks/src/youngAdult.ts`; `Persona` exported from `packages/web/src/phone/ChatPhone.tsx`; `INJECTED_RECIPE['young-adult']` is a static-only `ConfirmOpenProduct` (outcome `blocked`, code `static_only`).

Ruling recorded here (spec: "bet 1 … removed altogether"): the forced state `empty` is removed — the young-adult data model has no empty variant, so it would be a no-op button in the debug panel. `Models.screen` / `SCREEN_MODEL`, `/api/scenarios`, and `ActionResult.refresh` stay (generic engine, small).

Suggested order (run `npm run typecheck` after each package): mocks → catalog → server → evals → web → tests → README.

- [ ] **Step 1: mocks.** In `packages/mocks/src/youngAdult.ts` add, moved from `family.ts` with their text unchanged:
  ```ts
  export const REFUSALS_NOT_AVAILABLE: Refusal = /* the current REFUSALS.notAvailable object from family.ts, verbatim */;
  export const HANDOFF: Handoff = /* the current HANDOFF object from family.ts, verbatim */;
  ```
  (import `Handoff` from `@proto/catalog`). Delete `family.ts` and its `export *` in `index.ts`. In `store.ts` keep only `ActionError`, `clamp`, `Store { youngAdult }`, `createStore()` (young-adult part), `selectGoal`, `setSavingsScenario`, `openProduct`, `sendInvite`; delete `ChildState`, `TransferState`, `chore`, `markDone`, `findChoreForApproval`, `prepareTransfer`, `pending`, `confirmTransfer`, `cancelTransfer`, `dismissOffer`, `publicTransfer`. In `dataModel.ts` delete `byClock`, `lunchOf`, `statusOf`, `choresOf`, `childModel`, `parentModel`; `BuildOptions` becomes `{ clock: string }`; `buildDataModel(role, store, opts)` keeps its signature and returns `youngAdultModel(store)`; `youngAdultModel` uses `REFUSALS_NOT_AVAILABLE` and `HANDOFF`.

- [ ] **Step 2: catalog.** Delete `components/school.ts`, `components/teen.ts`. In `components/money.ts` delete `ConfirmTransferDef` (keep `DoneDef`); in `components/primitives.ts` delete `AskParentButtonDef`; in `index.ts` drop the `school` and `teen` exports. In `catalogs.ts`: `ROLES = ['young-adult'] as const`; delete `CHILD`, `CHILD_ACTIONS` and the `kid`, `teen`, `parent` entries. In `records.ts` delete every bet-1 schema and type (TimetableDay, HomeworkList, Lunch, the bet-1 `GoalSchema`, Chore/ChoreList, ChildSummary, PassEvents, Meals, Offer, Spending, Card, AgeTransition, Transfer) — keep `RefusalSchema`, `HandoffSchema`, `DoneSchema`, their types and the whole bet-2 section (`GOAL_IDS`, `GoalOptionsSchema` … `InviteSchema`); `RefusalSchema.nextAction` becomes `z.enum(['handoff.request', 'nav.home'])`. In `api.ts` remove `'empty'` from `FORCE_STATES`. In `modelSchema.ts` change the PATH example `e.g. /lunch` to `e.g. /plans`.

- [ ] **Step 3: server.** Delete `scenarios/morning.json`, `evening.json`, `school-day.json`.
  - `actions.ts`: delete the cases `chore.markDone`, `ask_parent`, `chore.approve`, `lunch.topup`, `transfer.confirm`, `transfer.cancel`, `offer.open`, `offer.dismiss` and their imports; the live-turn check becomes unconditional (`if (deps.surfaces.currentOf(role)?.surfaceId !== source.surfaceId) throw new ActionError('bad_state', 'Only the latest chat turn is live');`).
  - `pipeline.ts`: `refusalFor` returns `refusals.notAvailable`; delete the `empty` field from `Ctx` and every `empty:` property; the model choice stays as written.
  - `surfaces.ts`: delete `empty` from `SurfaceEntry` and from `dataFor`.
  - `fallback.ts`: delete `childGroups`, `parentGroups`, `section`; `groupsFor` returns `youngAdultGroups(dm, scenarioId)`.
  - `injections.ts`: keep only the `'young-adult'` keys; `INJECTED_RECIPE['young-adult']` becomes
    ```ts
    { components: [{ id: 'root', component: 'Column', children: ['p'] }, { id: 'p', component: 'ConfirmOpenProduct', product: { path: '/products/savings' } }] }
    ```
  - `prompt.ts`: `ROLE_POLICY` keeps only `'young-adult'`; the `catalog.role === 'young-adult'` conditionals become unconditional; rule 5's parenthesis becomes `(guaranteed returns, personal investment advice, credit outside PlanComparison, someone else's data, anything unsafe)`.
  - `staticScreens.ts`: delete `confirmTransferScreen`, `DONE.askedParent`, `DONE.offerOpened`, `DONE.transferDone`, `DONE.transferCancelled`, and `rub` if now unused.
  - `validate.ts`: delete the `too_many_offers` code, its `POLICY_CODES` entry and the EcosystemOffer count check.

- [ ] **Step 4: evals.** `src/args.ts` default roles `'young-adult'`; `src/report.ts` delete the `more than one EcosystemOffer` rule. Leave `results/2026-10-23-first-run.*` as history.

- [ ] **Step 5: web.** Move `export interface Persona { name: string; subtitle: string }` into `phone/ChatPhone.tsx` and delete `phone/Phone.tsx`, `catalog/school.tsx`, `catalog/teen.tsx`. In `catalog/index.ts` keep Column, Section, Text, Notice, EmptyState, Refusal, Handoff, Done and the eight bet-2 impls. Delete `ConfirmTransferImpl` from `money.tsx`, `AskParentButtonImpl` from `primitives.tsx`, `Empty` from `ui.tsx`, `api.scenarios` from `api.ts` if unused. `App.tsx`:
  ```tsx
  import { api } from './api';
  import { DebugProvider } from './debug/DebugContext';
  import { DebugPanel } from './debug/DebugPanel';
  import { ChatPhone, type Persona } from './phone/ChatPhone';

  export const PERSONAS: Record<'young-adult', Persona> = { 'young-adult': { name: 'Лиза, 19 лет', subtitle: 'СберБанк Онлайн' } };

  export function App() {
    return (
      <DebugProvider>
        <header className="app__head">
          <img src="/sber-logo.svg" alt="Сбер" />
          <h1>Прототип: «Первые деньги»</h1>
          <button type="button" className="btn btn--secondary" onClick={() => api.reset().then(() => location.reload())}>Сбросить демо</button>
        </header>
        <div className="phones"><ChatPhone persona={PERSONAS['young-adult']} /></div>
        <DebugPanel />
      </DebugProvider>
    );
  }
  ```
  `DebugPanel.tsx`: remove the «Телефон» select and the `empty` label; `role` is the constant `'young-adult'`. `index.html` `<title>` becomes `Первые деньги — прототип`.

- [ ] **Step 6: tests.** Delete `mocks/test/store.test.ts`, `server/test/actions.test.ts`, `web/test/phone.test.tsx`. Rewrite the rest to young-adult fixtures; the engine's safety tests keep their coverage with these replacements:
  - `server/test/validate.test.ts`: data `yaData` = `buildDataModel('young-adult', store, { clock: '10:05' })` after `selectGoal(store, 'apartment')`; good recipe `[root('t','g'), { id: 't', component: 'Text', text: { path: '/me/greeting' }, variant: 'title' }, { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } }]`. `forbidden_component`: validate an `InviteRelative` recipe against `{ ...CATALOGS['young-adult'], components: CATALOGS['young-adult'].components.filter((c) => c.name !== 'InviteRelative') }` → codes contain `forbidden_component`, `policyViolation` true. `literal_in_bound`: `{ id: 'p', component: 'PlanComparison', plans: [{ id: 'invest', resultHigh: 10000000 }] }`. `static_only`: `ConfirmOpenProduct` bound to `/products/savings`; with `allowStatic: true` it passes. `bad_bound_value`: `PlanComparison` bound to `/banner`; `bad_path`: `GoalPicker` bound to `/nope`. Delete the second-offer case.
  - `server/test/pipeline.test.ts`: fixtures as above with `{ role: 'young-adult', scenarioId: 'first-money-home' }`; the policy-violation case uses the literal `PlanComparison` and expects `data(r).static.refusal.code === 'not_available'`; "emits the data as it is when the model answers" holds the fake model, calls `selectGoal(deps.store, 'cushion')` meanwhile, and expects `data(await pending).goal.id === 'cushion'`; "re-renders home … dropping cards whose data is gone" generates a `PlanComparison` screen after `selectGoal`, replaces `deps.store` with `createStore()`, calls `rerenderHome('young-adult', deps)` and expects outcome `cached` and no `PlanComparison`; delete the forced-`empty` case.
  - `server/test/app.test.ts`, `prompt.test.ts`, `scenarios.test.ts`, `screens.test.ts`, `telemetry.test.ts`, `claude.test.ts`, `claude-code.test.ts`, `evals/test/eval.test.ts`, `mocks/test/dataModel.test.ts`, `catalog/test/catalogs.test.ts`, `web/test/*`: replace `kid`/`teen`/`parent` and `morning`/`evening`/`school-day` with `young-adult` / `first-money-home` / `first-money-chat`; delete cases that only test bet-1 behaviour (offers, chores, transfers, lunch, cross-phone payout, teen ⊇ kid); the eval matrix becomes 4 cases per model per rep (home, chat, chat with a goal, one injection) — `2 * 4 * 2` cases and `2 * 1 * 2` injections for two models and N = 2.
  - `server/test/firstMoney.test.ts`: add "an action outside the catalog is refused and changes nothing" (`chore.approve` on a young-adult surface → a Refusal static screen, store unchanged).
  - Port from the deleted `phone.test.tsx` to `web/test/firstMoney.test.tsx` (ChatPhone): a double click on «Составить план» sends one `/api/action/young-adult`; StrictMode loads the banner once; `emitRefresh(['young-adult'])` fetches `/api/data/young-adult?surfaceId=ya-1`; a failed refresh logs `console.warn('refresh failed', 'young-adult', …)` and keeps the screen.
  - `web/test/helpers.ts`: `scenarioId: 'first-money-home'`.

- [ ] **Step 7: README.** In `04-prototype/README.md`: title `# Прототип: «Первые деньги»`; line 3 links only bet 2; replace «Как пройти демо» with:
  ```markdown
  ## Как пройти демо (5 минут)

  1. **Первая зарплата.** На главной у Лизы (19 лет, СберБанк Онлайн) — поздравление с первой зарплатой. «Составить план» открывает разговор.
  2. **Цель.** Лиза выбирает цель кнопкой — например, «Первый взнос на квартиру». Экран на каждом шаге собирает модель из каталога компонентов; цифры в карточках считает банк.
  3. **План и калькуляторы.** Ползунки пересчитывают план на сервере, без модели.
  4. **Вопрос про доходность.** «гарантируй мне 30% доходности» — вежливый отказ без обещаний.
  5. **Открыть счёт.** Экран подтверждения собирает банк, а не модель: условия и раскрытие информации нельзя изменить. «Подтвердить» — «Готово».
  6. **Сброс.** «Сбросить демо» вверху страницы возвращает данные к исходным.
  ```
  In «Что важно в устройстве» replace the bet-1 examples: «Действия с деньгами — обычный код» says the product confirmation is a static server screen; the policy example becomes «например, обещание доходности». Replace the «Цифры» table and its notes with two lines: «Замер: `npm run eval -- --n 5`. Отчёты — в `packages/evals/results/`.» and «Целевое p95 времени до готового экрана: **16 с** — предварительно, по первому замеру через подписку; окончательное значение — по замеру на API после развёртывания.» (owner, 2026-10-23). In «Ограничения прототипа» remove «школы» and the sentence about the chat screen not being connected.

- [ ] **Step 8: verify.** From `04-prototype/`: `npm run typecheck`, `npm test`, `npm run build` — all green. Then `grep -rn -E "kid|teen|parent|Маша|Артём|Ольга|LunchCard|ParentChores|EcosystemOffer|chore|transfer|lunch" packages/*/src packages/server/scenarios` prints nothing except the word `parent` inside unrelated identifiers (list any hit in the report).

- [ ] **Step 9: commit.**
  ```bash
  git add -A 04-prototype
  git commit -m "refactor(prototype): bet 2 only — remove «Экран дня» roles, catalogs, data and actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 2: Design gate — critique, canvas, owner approval (controller and owner)

Not dispatched to an implementer: the controller runs it with the owner.

**Files:** Create `docs/process/2026-10-23-ui-critique.md`, `04-prototype/design/foundation.dc.html`, `04-prototype/design/tokens.md`.

**Interfaces:** Produces `04-prototype/design/tokens.md` — the approved values for every token Task 3 defines (same names), and the approved structure of the three reference widgets that Task 6 implements.

- [ ] **Step 1: screenshots.** With the server running on the subscription (Task 1 merged), capture with `agent-browser` the chat phone at: banner; goal question; plan (PlanComparison + ScenarioSliders); spending; product card; ConfirmOpenProduct; Refusal. Save under the scratchpad.
- [ ] **Step 2: critique.** Invoke the `impeccable` skill in critique mode on those screenshots and the owner's screenshot of ConfirmOpenProduct (typography, alignment, accents, spacing, hierarchy). Write the findings, most severe first, to `docs/process/2026-10-23-ui-critique.md`.
- [ ] **Step 3: canvas.** `Artifact` `action: "quickstart"`, `intent: "design"`; create the canvas from the Design type it names. Brief: «Первые деньги» for a 19-year-old in СберБанк Онлайн; HeroUI v3 components only; SB Sans Text / SB Sans Display; the token proposal from Task 3 Step 3 as the starting point; fix every critique finding. Three boards:
  1. **Tokens** — type scale (title, section, body, caption, amount), colours (accent, success, warning, danger, foreground, muted, background, surface, default, border), spacing (4 px grid), radii (card, control).
  2. **Chrome** — phone frame with the Сбер header and persona, the chat feed (user bubble, model turn), the chat input with «Отправить», the page header with «Сбросить демо».
  3. **Reference widgets**, real data, each state: `ConfirmOpenProduct` (Вклад; savings account); `SpendAnalytics` (Доставка еды −20 % selected; another category selected; with a goal / without a goal; recalculating); `DepositCalculator` (45 000 ₽ × 12 мес.; 300 000 ₽ × 36 мес.; recalculating). The data shapes are in Task 5 Step 1.
- [ ] **Step 4: owner approval.** Send the owner the canvas link; the owner tweaks, saves and says "design approved". Read the saved canvas back (`Artifact` `action: "read"`) and save its HTML to `04-prototype/design/foundation.dc.html`.
- [ ] **Step 5: tokens.** Write `04-prototype/design/tokens.md`: one table per group with the token name exactly as in Task 3 Step 3 and the approved value; plus, per reference widget, its anatomy (order of parts, which HeroUI component each part is). Set the spec's **Design** line to `04-prototype/design/foundation.dc.html`.
- [ ] **Step 6: commit.**
  ```bash
  git add docs/process/2026-10-23-ui-critique.md docs/process/2026-10-23-prototype-ui-design.md 04-prototype/design
  git commit -m "docs(prototype): UI critique and the approved foundation canvas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 3: HeroUI v3 + Tailwind v4 stack and the Sber theme

**Files:**
- Modify: `packages/web/package.json`, `packages/web/vite.config.ts`, `packages/web/vitest.config.ts`, `packages/web/index.html`, `packages/web/src/main.tsx`
- Create: `packages/web/src/index.css`, `packages/web/test/setup.ts`, `packages/web/test/heroui.smoke.test.tsx`

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- Theme values are tokens.md's, not Step 5's proposal: type tokens `text-amount` 28/34 600, `text-title` 22/28 600, `text-body` 17/22, `text-secondary` 15/20, `text-caption` 13/18 (there is no `text-section`); `--radius-card: 1.25rem`, `--radius-control: 0.875rem`, HeroUI `--radius: 0.875rem`; `--color-page: #08080A` in `@theme`.
- HeroUI colour variables exactly as tokens.md's Colour table (`--accent: #FFFFFF` with `--accent-foreground: #111214` — the primary button is white; `--success: #21A038`; `--background: #0F0F10`; `--surface: #1E1F22`; `--default: #2B2C30`; `--border`/`--separator: #34353A`; `--muted: #9A9DA3`; `--warning: #F2A33A`; `--danger: #FF6B5E`; `--focus: #21A038`), and their `-foreground` pairs.
- Dark only: `index.html` gets `<html lang="ru" class="dark" data-theme="dark">`; write the overrides under `:root, .dark, [data-theme="dark"]` so they win over HeroUI's own dark block (check the selector HeroUI's dark theme uses in `node_modules/@heroui/styles` and match its specificity; record what you found).
- `body`: `bg-page font-sans text-body text-foreground antialiased`.

**Interfaces:**
- Consumes: `04-prototype/design/tokens.md` (Task 2).
- Produces: Tailwind utilities for the theme — `font-sans`, `font-display`, `text-title`, `text-section`, `text-body`, `text-caption`, `text-amount`, `rounded-card`, `rounded-control`, and HeroUI's `bg-accent`, `text-accent-foreground`, `text-success`, `text-warning`, `text-danger`, `text-foreground`, `text-muted`, `bg-background`, `bg-surface`, `bg-default`, `border-border`; a vitest setup file; the confirmed test method for HeroUI presses and sliders (recorded in the report).

- [ ] **Step 1: install.** From `04-prototype/`:
  ```bash
  npm i -w @proto/web @heroui/react@3.2.6 @heroui/styles@3.2.6 react-aria@3.53.1 react-aria-components@1.22.1 @internationalized/date@3.12.4 @react-aria/ssr@3.10.1 @react-aria/utils@3.34.1
  npm i -w @proto/web -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 @testing-library/user-event@14.6.8
  ```
  Then edit `packages/web/package.json` so every new entry is the exact version (no `^`).

- [ ] **Step 2: write the failing smoke test** `packages/web/test/heroui.smoke.test.tsx`:
  ```tsx
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { Button, Label, Radio, RadioGroup, Slider } from '@heroui/react';

  afterEach(() => cleanup());

  describe('HeroUI in jsdom', () => {
    it('fires onPress on a click', () => {
      const onPress = vi.fn();
      render(<Button onPress={onPress}>Отправить</Button>);
      fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('changes a slider by keyboard and by a change event', async () => {
      const onChange = vi.fn();
      render(
        <Slider minValue={0} maxValue={10} step={1} defaultValue={5} onChange={onChange}>
          <Label>Срок</Label>
          <Slider.Output />
          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
        </Slider>,
      );
      const thumb = screen.getByRole('slider');
      await userEvent.setup().type(thumb, '{ArrowRight}');
      fireEvent.change(thumb, { target: { value: '8' } });
      const values = onChange.mock.calls.map(([v]) => v);
      expect(values.length).toBeGreaterThan(0);
      // Record in the report which of the two events produced a value (keyboard → 6, change → 8).
    });

    it('selects a radio option', () => {
      const onChange = vi.fn();
      render(
        <RadioGroup aria-label="Категория" value="a" onChange={onChange}>
          <Radio value="a"><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control>Доставка еды</Radio.Content></Radio>
          <Radio value="b"><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control>Такси</Radio.Content></Radio>
        </RadioGroup>,
      );
      fireEvent.click(screen.getByRole('radio', { name: 'Такси' }));
      expect(onChange).toHaveBeenCalledWith('b');
    });
  });
  ```

- [ ] **Step 3: run it.** `npx vitest run packages/web/test/heroui.smoke.test.tsx` — expected FAIL before Step 4 only if jsdom lacks a polyfill; record the output. If a part name or prop differs from the code above, fix the test to the real API (the `.d.ts` in `node_modules/@heroui/react/dist/components/*`) and list the difference.

- [ ] **Step 4: test setup.** `packages/web/test/setup.ts`:
  ```ts
  // jsdom lacks these; HeroUI hooks and react-aria collections call them.
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  }
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
  }
  Element.prototype.scrollIntoView ??= () => {};
  ```
  `packages/web/vitest.config.ts`: `test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'] }`. Do not polyfill `PointerEvent` unless a test fails without it (a fake one flips react-aria's press handling).

- [ ] **Step 5: the theme.** `packages/web/vite.config.ts` adds `import tailwindcss from '@tailwindcss/vite'` and `plugins: [react(), tailwindcss()]`. `packages/web/index.html` `<head>` gains, before the title:
  ```html
  <link rel="stylesheet" href="https://cdn-app.sberdevices.ru/shared-static/0.0.0/styles/SBSansText.0.2.0.css" />
  <link rel="stylesheet" href="https://cdn-app.sberdevices.ru/shared-static/0.0.0/styles/SBSansDisplay.0.2.0.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap&subset=cyrillic" />
  ```
  `packages/web/src/index.css` — the proposal below; replace each value with the approved one from `04-prototype/design/tokens.md` and list every change in the report:
  ```css
  @import "tailwindcss";
  @import "@heroui/styles";

  @theme {
    --font-sans: "SB Sans Text", Inter, system-ui, sans-serif;
    --font-display: "SB Sans Display", "SB Sans Text", Inter, system-ui, sans-serif;
    --text-title: 1.375rem;   --text-title--line-height: 1.75rem;   --text-title--font-weight: 600;
    --text-section: 1.0625rem; --text-section--line-height: 1.375rem; --text-section--font-weight: 600;
    --text-body: 0.9375rem;   --text-body--line-height: 1.25rem;
    --text-caption: 0.8125rem; --text-caption--line-height: 1.125rem;
    --text-amount: 1.5rem;    --text-amount--line-height: 1.75rem;  --text-amount--font-weight: 600;
    --radius-card: 1.25rem;
    --radius-control: 0.75rem;
  }

  /* Sber theme on HeroUI's variables. Unlayered, after the imports, so it wins over HeroUI's defaults. */
  :root {
    --accent: #21a038;
    --accent-foreground: #ffffff;
    --success: #21a038;
    --warning: #e8a21a;
    --danger: #e5484d;
    --foreground: #1f1f22;
    --muted: #74777c;
    --background: #f2f3f5;
    --surface: #ffffff;
    --default: #eceef1;
    --border: #e2e4e8;
    --separator: #eceef1;
    --focus: var(--accent);
    --radius: 0.75rem;
  }

  body { @apply bg-background font-sans text-body text-foreground antialiased; }
  ```
  `packages/web/src/main.tsx` imports `./index.css` before `./theme.css` (Task 4 deletes `theme.css`).

- [ ] **Step 6: run.** `npx vitest run packages/web/test/heroui.smoke.test.tsx` → PASS. Record in the report: does `fireEvent.click` fire `onPress`; which slider event changes the value (keyboard, change event, or both). Later tasks use the method that works.

- [ ] **Step 7: browser check of the theme.** `npm run build` succeeds. The controller (not the implementer) later confirms in Chromium that a primary `Button` is Sber green and text is SB Sans — Task 8.

- [ ] **Step 8: full suite and commit.** `npm test`, `npm run typecheck`, `npm run build` green.
  ```bash
  git add 04-prototype/packages/web 04-prototype/package-lock.json
  git commit -m "feat(prototype): HeroUI v3 + Tailwind v4 with the Sber theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 4: Building blocks, chrome, and every widget on the theme

**Files:**
- Create: `packages/web/src/ui/money.ts`, `ui/WidgetCard.tsx`, `ui/Amount.tsx`, `ui/KeyValue.tsx`, `ui/StatusChip.tsx`, `ui/LegalNote.tsx`, `ui/ActionRow.tsx`, `ui/CalcSlider.tsx`, `ui/CalcResult.tsx`, `ui/PhoneFrame.tsx`, `ui/index.ts`
- Modify: `packages/web/src/catalog/ui.tsx`, `catalog/primitives.tsx`, `catalog/money.tsx`, `catalog/firstMoney.tsx`, `phone/ChatPhone.tsx`, `phone/Skeleton.tsx`, `App.tsx`, `debug/DebugPanel.tsx`, `main.tsx`
- Delete: `packages/web/src/theme.css`
- Test: `packages/web/test/ui.test.tsx`; update `test/debug.test.tsx`

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- `ui/money.ts`: `duration(months)` replaces `months(n)` — «8 мес.», «1 год», «2 года», «5 лет», «1 год 6 мес.», «3 года 2 мес.» (Russian plural rules: 1 год, 2–4 года, 5+ лет; 11–14 лет). The ui test asserts `duration(8)`, `duration(12)`, `duration(24)`, `duration(60)`, `duration(18)`, `duration(38)` with those strings.
- `ui/icons.tsx` (new): authored stroke line icons as React components, `aria-hidden`, `currentColor`, 28 px default, 1.8 stroke — `SafeIcon`, `ChartIcon`, `PercentIcon`, `CalendarIcon`, `CashIcon`, `InfoIcon`, `AlertIcon`, `BackIcon`, `SendIcon` (arrow up), `CheckIcon`; paths copied from the canvas boards. No emoji anywhere in the UI.
- `WidgetCard({ icon?: ReactNode; title: string; subtitle?: string; children; actions?: ReactNode })` — no `meta`, no `tone`; anatomy per tokens.md «Card». `IconRow({ icon: ReactNode; value: ReactNode; label?: string })` (new block). `ResultBox({ children })` (new block: `default` bg, radius control, padding 14/16). `CalcSlider` adds `minLabel`/`maxLabel` captions under the track; label muted left, value 600 right. `ActionRow` stacks full-width `size="lg"` buttons (primary white, secondary `default`). `LegalNote` → `text-caption text-muted`.
- Chrome per tokens.md «Chrome»: `PhoneFrame` has two views — `HomeScreen` (new, `phone/HomeScreen.tsx`: the decorative bank home with the slot where the home surface renders; balance and tile figures from `@proto/mocks` `LIZA.salary`, so move `@proto/mocks` to web `dependencies` in this task) and the chat view (header with icon `Button` «Назад» back to home, «Сегодня», bubbles, round send). `chat.open` switches to the chat view; «Назад» returns home without resetting the chat. Model `Text` with `variant: 'body'` renders as the left bubble; Лиза's bubble shows the local HH:MM it was sent. Waiting: three-dot bubble + one `Skeleton` card, history not faded. Error: the failed-answer card with «Повторить», which repeats the last request (text or action). Past turns: `inert` and their buttons hidden, no opacity.
- Tests in this task: `ui.test.tsx` as below with the `duration` cases; a `chrome.test.tsx` — home view shows the banner slot; pressing the banner sends `chat.open` and shows the chat view; «Назад» shows home again with the chat kept; a failed request shows «Не получилось ответить» and «Повторить» sends the same request again.

**Interfaces:**
- Consumes: Task 3 utilities; `04-prototype/design/tokens.md` anatomy.
- Produces (from `packages/web/src/ui`):
  - `rub(v: number): string`, `months(n: number): string` (`'12 мес.'`), `ratePct(r: number): string` (moved from `catalog/firstMoney.tsx`, same behaviour)
  - `WidgetCard({ icon?: string; title: string; meta?: string; tone?: 'default' | 'accent'; children; actions?: ReactNode })`
  - `Amount({ value: number; tone?: 'default' | 'positive'; size?: 'body' | 'amount' })`
  - `KeyValue({ rows: { label: string; value: ReactNode }[] })`
  - `StatusChip({ tone: 'success' | 'warning' | 'default'; children })`
  - `LegalNote({ text: string })`
  - `ActionRow({ primary?: ActionSpec; secondary?: ActionSpec[] })`, `ActionSpec = { label: string; onPress: () => void }`
  - `CalcSlider({ label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void })`
  - `CalcResult({ isCurrent: boolean; children })` — `aria-busy={!isCurrent}`; when not current, dimmed and «Пересчитываем…»
  - `PhoneFrame({ persona: { name: string; subtitle: string }; children; footer?: ReactNode })`

- [ ] **Step 1: failing tests** `packages/web/test/ui.test.tsx`:
  ```tsx
  import { cleanup, fireEvent, render, screen } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { ActionRow, Amount, CalcResult, KeyValue, months, rub, ratePct } from '../src/ui';

  afterEach(() => cleanup());

  describe('building blocks', () => {
    it('formats roubles, months and rates the bank way', () => {
      expect(rub(45000).replace(/\s/g, ' ')).toBe('45 000 ₽');
      expect(months(12)).toBe('12 мес.');
      expect(ratePct(0.145)).toBe('14,5% годовых');
    });
    it('puts one primary action first', () => {
      const a = vi.fn(); const b = vi.fn();
      render(<ActionRow primary={{ label: 'Подтвердить', onPress: a }} secondary={[{ label: 'Отмена', onPress: b }]} />);
      const buttons = screen.getAllByRole('button').map((x) => x.textContent);
      expect(buttons).toEqual(['Подтвердить', 'Отмена']);
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
      expect(a).toHaveBeenCalledTimes(1);
    });
    it('marks figures that are being recalculated', () => {
      const { rerender } = render(<CalcResult isCurrent={false}><Amount value={1000} /></CalcResult>);
      expect(screen.getByText('Пересчитываем…')).toBeTruthy();
      expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
      rerender(<CalcResult isCurrent><Amount value={1000} /></CalcResult>);
      expect(screen.queryByText('Пересчитываем…')).toBeNull();
    });
    it('renders label–value rows', () => {
      render(<KeyValue rows={[{ label: 'Ставка', value: '15% годовых' }]} />);
      expect(screen.getByText('Ставка')).toBeTruthy();
      expect(screen.getByText('15% годовых')).toBeTruthy();
    });
  });
  ```
  Run `npx vitest run packages/web/test/ui.test.tsx` → FAIL (module `../src/ui` not found).

- [ ] **Step 2: the blocks.** Implement to the canvas anatomy in `tokens.md`. Starting code (adjust classes to the approved canvas; keep the props):
  ```tsx
  // ui/money.ts
  const RUB = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
  const PCT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  export const rub = (v: number) => RUB.format(v);
  export const months = (n: number) => `${n} мес.`;
  /** The bank's rate as is: up to two decimals, decimal comma, no trailing zeros. */
  export const ratePct = (r: number) => `${PCT.format(Math.round(r * 10000) / 100)}% годовых`;
  ```
  ```tsx
  // ui/WidgetCard.tsx
  import type { ReactNode } from 'react';
  import { Card } from '@heroui/react';
  export function WidgetCard(props: { icon?: string; title: string; meta?: string; tone?: 'default' | 'accent'; children: ReactNode; actions?: ReactNode }) {
    return (
      <Card className={`rounded-card ${props.tone === 'accent' ? 'ring-1 ring-accent' : ''}`}>
        <Card.Header className="flex items-center gap-2">
          {props.icon && <span aria-hidden className="text-section">{props.icon}</span>}
          <Card.Title className="font-display text-section">{props.title}</Card.Title>
          {props.meta && <span className="ml-auto text-caption text-muted">{props.meta}</span>}
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">{props.children}</Card.Content>
        {props.actions && <Card.Footer>{props.actions}</Card.Footer>}
      </Card>
    );
  }
  ```
  ```tsx
  // ui/Amount.tsx
  import { rub } from './money';
  export const Amount = ({ value, tone = 'default', size = 'body' }: { value: number; tone?: 'default' | 'positive'; size?: 'body' | 'amount' }) => (
    <span className={`tabular-nums ${size === 'amount' ? 'font-display text-amount' : 'text-body'} ${tone === 'positive' ? 'text-success' : 'text-foreground'}`}>{rub(value)}</span>
  );
  ```
  ```tsx
  // ui/KeyValue.tsx
  import { Fragment, type ReactNode } from 'react';
  export const KeyValue = ({ rows }: { rows: { label: string; value: ReactNode }[] }) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
      {rows.map((r) => (
        <Fragment key={r.label}><dt className="text-muted">{r.label}</dt><dd className="text-right font-medium">{r.value}</dd></Fragment>
      ))}
    </dl>
  );
  ```
  ```tsx
  // ui/StatusChip.tsx
  import type { ReactNode } from 'react';
  import { Chip } from '@heroui/react';
  export const StatusChip = ({ tone, children }: { tone: 'success' | 'warning' | 'default'; children: ReactNode }) => (
    <Chip color={tone} size="sm"><Chip.Label>{children}</Chip.Label></Chip>
  );
  ```
  ```tsx
  // ui/LegalNote.tsx
  /** Fixed rendering of backend disclosure text; the model cannot place or edit it. */
  export const LegalNote = ({ text }: { text: string }) => <p className="text-caption text-muted">{text}</p>;
  ```
  ```tsx
  // ui/ActionRow.tsx
  import { Button } from '@heroui/react';
  export interface ActionSpec { label: string; onPress: () => void }
  export function ActionRow({ primary, secondary = [] }: { primary?: ActionSpec; secondary?: ActionSpec[] }) {
    return (
      <div className="flex flex-wrap gap-2">
        {primary && <Button variant="primary" className="rounded-control" onPress={primary.onPress}>{primary.label}</Button>}
        {secondary.map((s) => <Button key={s.label} variant="secondary" className="rounded-control" onPress={s.onPress}>{s.label}</Button>)}
      </div>
    );
  }
  ```
  ```tsx
  // ui/CalcSlider.tsx
  import { Label, Slider } from '@heroui/react';
  export function CalcSlider(p: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
    return (
      <Slider className="w-full" minValue={p.min} maxValue={p.max} step={p.step} value={p.value} onChange={(v) => p.onChange(Array.isArray(v) ? v[0] : v)}>
        <div className="flex items-baseline justify-between text-body">
          <Label>{p.label}</Label>
          <Slider.Output className="font-medium tabular-nums">{() => p.format(p.value)}</Slider.Output>
        </div>
        <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
      </Slider>
    );
  }
  ```
  ```tsx
  // ui/CalcResult.tsx
  import type { ReactNode } from 'react';
  import { Spinner } from '@heroui/react';
  /** Figures are the bank's; while the sliders differ from what they were calculated for, they are not current. */
  export function CalcResult({ isCurrent, children }: { isCurrent: boolean; children: ReactNode }) {
    return (
      <div aria-busy={!isCurrent} aria-live="polite" className="flex flex-col gap-2">
        <div className={isCurrent ? '' : 'opacity-50'}>{children}</div>
        {!isCurrent && <span className="inline-flex items-center gap-1 text-caption text-muted"><Spinner size="sm" color="current" />Пересчитываем…</span>}
      </div>
    );
  }
  ```
  ```tsx
  // ui/PhoneFrame.tsx
  import type { ReactNode } from 'react';
  export function PhoneFrame({ persona, children, footer }: { persona: { name: string; subtitle: string }; children: ReactNode; footer?: ReactNode }) {
    return (
      <div className="flex h-[780px] w-full max-w-[390px] flex-col overflow-hidden rounded-[2.5rem] border-8 border-foreground bg-background">
        <header className="flex items-center gap-3 bg-surface px-4 py-3">
          <img src="/sber-logo.svg" alt="Сбер" className="h-6" />
          <div className="flex flex-col"><b className="text-body">{persona.name}</b><span className="text-caption text-muted">{persona.subtitle}</span></div>
        </header>
        <main className="flex-1 overflow-y-auto px-3 py-3">{children}</main>
        {footer && <div className="bg-surface px-3 py-2">{footer}</div>}
      </div>
    );
  }
  ```
  `ui/index.ts` re-exports all of the above.

- [ ] **Step 3: widgets on the blocks.** `catalog/ui.tsx` keeps `renderChildren` and `dispatch`, re-exports `rub` from `../ui`, and its `Card`, `Btn`, `Pill` become thin adapters (`Card` → `WidgetCard`, `Btn` → HeroUI `Button` with `onPress={props.onClick}` and `variant={kind === 'secondary' ? 'secondary' : 'primary'}`, `Pill` → `StatusChip` with `ok → success`, `warning → warning`, `info → default`). In every remaining catalog implementation (`primitives.tsx`, `money.tsx`, `firstMoney.tsx`) replace each `theme.css` class with Tailwind utilities on the tokens: `col` → `flex flex-col gap-3`; `sec__title` → `font-display text-section`; `txt--title` → `font-display text-title`; `txt--body` → `text-body`; `txt--caption`, `muted` → `text-caption text-muted`; `list` → `flex flex-col gap-1`; `row` → `flex justify-between gap-3`; `row__side` → `text-muted tabular-nums`; `dl` → `KeyValue`; `big` → `Amount size="amount"`; `btns` → `ActionRow`; `slider` → `CalcSlider`; `disclosure` → `LegalNote`; `notice notice--info|warning` → HeroUI `Alert status="accent"|"warning"` (`Alert.Indicator`, `Alert.Content`, `Alert.Description`); `empty` → `flex flex-col items-center gap-1 py-6 text-center`. `ratePct` moves to `ui/money.ts` (update the import in `firstMoney.test.tsx`).

- [ ] **Step 4: chrome.** `ChatPhone.tsx` renders inside `PhoneFrame` with the feed (`flex flex-col gap-3`), user bubble `self-end max-w-[80%] rounded-card bg-accent px-3 py-2 text-body text-accent-foreground`, earlier turns `inert` as today, and the footer:
  ```tsx
  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
    <TextField className="flex-1" aria-label="Сообщение" value={text} onChange={setText} isDisabled={phone.busy || phone.loading}>
      <Input placeholder="Напиши сообщение" maxLength={500} />
    </TextField>
    <Button type="submit" className="rounded-control" isDisabled={phone.busy || phone.loading}>Отправить</Button>
  </form>
  ```
  `Skeleton.tsx` uses HeroUI `Skeleton` (`<Skeleton className="h-24 rounded-card" />` × 3) inside the existing `aria-busy="true" aria-label="Загрузка экрана"` wrapper. `App.tsx` header: `flex items-center gap-4 px-6 py-4`, the logo, `<h1 className="font-display text-title">Прототип: «Первые деньги»</h1>`, and `<Button variant="secondary" className="ml-auto rounded-control" onPress={() => api.reset().then(() => location.reload())}>Сбросить демо</Button>`; the phone centred below. `DebugPanel.tsx`: the `<details>` becomes HeroUI `Disclosure` with `Disclosure.Heading` → `Disclosure.Trigger` «Отладка (для команды)» `Disclosure.Indicator`, `Disclosure.Content` → `Disclosure.Body`; selects stay native `<select>` with labels (team-only); «Повторить экран» is a HeroUI `Button`. Update `test/debug.test.tsx`: collapsed means the trigger has `aria-expanded="false"`; open it by clicking the trigger.

- [ ] **Step 5: delete `theme.css`** and its import in `main.tsx`. `grep -rn 'className="' packages/web/src | grep -E 'card|btn|pill|txt--|muted|phone__|notice|empty|feed|bubble|turn|sec__|row__|dl|big'` lists nothing that relied on `theme.css` (report any hit and what replaced it).

- [ ] **Step 6: run and commit.** `npx vitest run packages/web/test/ui.test.tsx` PASS; `npm test`, `npm run typecheck`, `npm run build` green.
  ```bash
  git add -A 04-prototype/packages/web
  git commit -m "feat(prototype): building blocks over HeroUI; chrome and every widget on the Sber theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 5: Server calculators — DepositCalculator and SpendAnalytics

**Files:**
- Modify: `packages/catalog/src/records.ts`, `components/firstMoney.ts`, `catalogs.ts`; `packages/mocks/src/calculators.ts`, `youngAdult.ts`, `store.ts`, `dataModel.ts`; `packages/server/src/actions.ts`, `fallback.ts`, `prompt.ts`, `scenarios/first-money-chat.json`; `packages/web/src/catalog/firstMoney.tsx`, `catalog/index.ts`, `packages/web/test/firstMoney.test.tsx` (removal of SpendBreakdown only)
- Test: `packages/mocks/test/calculators.test.ts`, `packages/mocks/test/youngAdult.test.ts`, `packages/server/test/firstMoney.test.ts`

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- `SpendAnalyticsSchema.categories[]` gains `accusative: string` (used in «Сократить «{accusative}» на»); `SPEND` entries gain it: «продукты», «доставку еды», «такси», «транспорт», «подписки».
- `BANNER` becomes `{ title: 'Первая зарплата', subtitle: 'Соберём план под твою цель', amount: LIZA.salary, ctaLabel: 'Составить план' }` (the home-slot card shows «{title} — {amount}»).

**Interfaces:**
- Produces in `@proto/catalog`: `DepositCalcSchema`, `SpendAnalyticsSchema`, types `DepositCalc`, `SpendAnalytics`; `DepositCalculatorDef` (prop `deposit`, path `/depositCalc`); `SpendAnalyticsDef` (prop `spend`, path `/spendAnalytics`) replacing `SpendBreakdownDef`; young-adult actions gain `deposit.recalc` and `spend.recalc`.
- Produces in `@proto/mocks`: `depositReturn(amount, months, annualRate) → { total, income }`; `spendCut(amount, cutPct, goal | null) → { saved, monthsSooner }`; `DEPOSIT_BOUNDS`, `DEPOSIT_DEFAULT`, `SPEND_CUT_BOUNDS`, `SPEND_CUT_DEFAULT`; `setDepositCalc(store, amount, months)`; `setSpendCut(store, categoryId, cutPct)`; data keys `depositCalc` and `spendAnalytics` (always present; `goalTitle`, `monthsSooner` null without a goal). `SpendBreakdownSchema`, `spendTip` and the `spend` data key are removed.
- Action contexts (fixed in Task 6's implementations): `deposit.recalc { amount: number, months: number }`, `spend.recalc { categoryId: string, cutPct: number }`.

- [ ] **Step 1: failing tests.** `packages/mocks/test/calculators.test.ts` add:
  ```ts
  it('grows a deposit with monthly capitalisation', () => {
    expect(depositReturn(100000, 12, 0.15)).toEqual({ total: 116075, income: 16075 });
    expect(depositReturn(45000, 24, 0.15)).toEqual({ total: 60631, income: 15631 });
    expect(depositReturn(1000, 3, 0)).toEqual({ total: 1000, income: 0 });
  });
  it('turns a spending cut into roubles and months', () => {
    expect(spendCut(6400, 20, null)).toEqual({ saved: 1280, monthsSooner: null });
    expect(spendCut(6400, 20, { target: 1500000, monthly: 9000, rate: 0.14 })).toEqual({ saved: 1280, monthsSooner: 8 });
    expect(spendCut(3100, 10, { target: 90000, monthly: 9000, rate: 0.14 })).toEqual({ saved: 310, monthsSooner: 0 });
  });
  ```
  `packages/mocks/test/youngAdult.test.ts` add:
  ```ts
  it('clamps calculator input on the server', () => {
    const s = createStore();
    setDepositCalc(s, 999999999, 1);
    expect(s.youngAdult.deposit).toEqual({ amount: DEPOSIT_BOUNDS.amountMax, months: DEPOSIT_BOUNDS.monthsMin });
    setDepositCalc(s, 1500, 7.6);
    expect(s.youngAdult.deposit).toEqual({ amount: 2000, months: 8 });
    expect(() => setDepositCalc(s, Number.NaN, 12)).toThrow(ActionError);
    setSpendCut(s, 'taxi', 33);
    expect(s.youngAdult.spendCut).toEqual({ categoryId: 'taxi', cutPct: 35 });
    expect(() => setSpendCut(s, 'groceries', 20)).toThrow(ActionError); // not a category you can cut
    expect(() => setSpendCut(s, 'toString', 20)).toThrow(ActionError);
  });
  it('builds both calculators, with goal figures only once a goal is chosen', () => {
    const s = createStore();
    const before = buildDataModel('young-adult', s, { clock: '10:05' }) as any;
    expect(DepositCalcSchema.parse(before.depositCalc)).toMatchObject({ amount: 45000, months: 12, income: 7234, total: 52234, calculatedFor: { amount: 45000, months: 12 } });
    expect(SpendAnalyticsSchema.parse(before.spendAnalytics)).toMatchObject({ categoryId: 'delivery', cutPct: 20, saved: 1280, goalTitle: null, monthsSooner: null });
    selectGoal(s, 'apartment');
    const after = buildDataModel('young-adult', s, { clock: '10:05' }) as any;
    expect(after.spendAnalytics).toMatchObject({ goalTitle: 'Первый взнос на квартиру', monthsSooner: expect.any(Number) });
    expect(after.spend).toBeUndefined();
  });
  ```
  `packages/server/test/firstMoney.test.ts` add, reusing the file's `deps`, `PICKER`, `view` helpers and its existing walk to the chat surface (home → `chat.open`, as in the first `it` of the file):
  ```ts
  async function chatSurface() {
    const { d, fake } = deps([PICKER]);
    const home = await generateScreen({ role: 'young-adult', scenarioId: 'first-money-home' }, d);
    const opened = await handleAction({ role: 'young-adult', name: 'chat.open', surfaceId: view(home).surfaceId, context: {} }, d);
    return { d, fake, surfaceId: view(opened).surfaceId };
  }

  it('recalculates a deposit in code, without a model call', async () => {
    const { d, fake, surfaceId } = await chatSurface();
    const calls = fake.calls.length;
    const r = await handleAction({ role: 'young-adult', name: 'deposit.recalc', surfaceId, context: { amount: 300000, months: 36 } }, d);
    expect(r.kind).toBe('data');
    expect(fake.calls.length).toBe(calls);
    const dm = (r as any).messages[0].updateDataModel.value;
    expect(dm.depositCalc).toMatchObject({ amount: 300000, months: 36, calculatedFor: { amount: 300000, months: 36 } });
  });
  it('refuses a spending cut for a forged or fixed category', async () => {
    const { d, surfaceId } = await chatSurface();
    for (const categoryId of ['toString', 'groceries']) {
      const r = await handleAction({ role: 'young-adult', name: 'spend.recalc', surfaceId, context: { categoryId, cutPct: 20 } }, d);
      expect(r.kind).toBe('screen'); // DONE.actionFailed, «Не получилось»
      expect(d.store.youngAdult.spendCut).toEqual(SPEND_CUT_DEFAULT);
    }
  });
  ```
  (If the file's first test reaches the chat surface differently — e.g. the home screen comes from a cached rule-based screen — copy that walk instead; the two assertions do not change.)
  Run: `npx vitest run packages/mocks packages/server/test/firstMoney.test.ts` → FAIL (missing exports).

- [ ] **Step 2: records and defs.** `packages/catalog/src/records.ts` (bet-2 section), replacing `SpendBreakdownSchema`:
  ```ts
  export const DepositCalcSchema = z.object({
    productId: z.literal('deposit'),
    name: z.string(),
    rate: z.number(),
    amount: z.number(),
    months: z.number(),
    amountMin: z.number(),
    amountMax: z.number(),
    amountStep: z.number(),
    monthsMin: z.number(),
    monthsMax: z.number(),
    income: z.number(),
    total: z.number(),
    /** The inputs the figures were calculated for. The browser shows the figures as current only while its sliders equal these. */
    calculatedFor: z.object({ amount: z.number(), months: z.number() }),
    disclosure: z.string(),
    ctaLabel: z.string(),
  });
  export const SpendAnalyticsSchema = z.object({
    periodLabel: z.string(),
    total: z.number(),
    categories: z.array(z.object({ id: z.string(), name: z.string(), amount: z.number(), share: z.number(), cuttable: z.boolean() })).min(1),
    categoryId: z.string(),
    cutPct: z.number(),
    cutMin: z.number(),
    cutMax: z.number(),
    cutStep: z.number(),
    saved: z.number(),
    goalTitle: z.string().nullable(),
    monthsSooner: z.number().nullable(),
    calculatedFor: z.object({ categoryId: z.string(), cutPct: z.number() }),
  });
  export type DepositCalc = z.infer<typeof DepositCalcSchema>;
  export type SpendAnalytics = z.infer<typeof SpendAnalyticsSchema>;
  ```
  `components/firstMoney.ts`, replacing `SpendBreakdownDef`:
  ```ts
  export const SpendAnalyticsDef = defineComponent('SpendAnalytics', 'Spending by category; the user picks a category and a cut, and the bank shows the roubles freed a month and, with a goal, how much sooner it is reached. Neutral tone, never shaming.', {
    spend: bound(SpendAnalyticsSchema, 'Path /spendAnalytics'),
  });
  export const DepositCalculatorDef = defineComponent('DepositCalculator', 'A term deposit calculator: the user sets the amount and the term, and the bank shows the income and the final sum. Opens the deposit.', {
    deposit: bound(DepositCalcSchema, 'Path /depositCalc'),
  });
  ```
  `catalogs.ts`: in the young-adult components replace `SpendBreakdownDef` with `SpendAnalyticsDef`, add `DepositCalculatorDef` after it; actions add `'deposit.recalc', 'spend.recalc'`.

- [ ] **Step 3: calculators, state, data.** `packages/mocks/src/calculators.ts` — delete `spendTip`; add:
  ```ts
  /** A term deposit with monthly capitalisation, rounded to the rouble. */
  export function depositReturn(amount: number, months: number, annualRate: number) {
    const total = Math.round(amount * (1 + annualRate / 12) ** months);
    return { total, income: total - amount };
  }

  /** Cutting one category by cutPct %: roubles freed a month and, with a goal, how many months sooner it is reached. */
  export function spendCut(amount: number, cutPct: number, goal: { target: number; monthly: number; rate: number } | null) {
    const saved = Math.round((amount * cutPct) / 100);
    const monthsSooner = goal ? monthsToTarget(goal.target, goal.monthly, goal.rate) - monthsToTarget(goal.target, goal.monthly + saved, goal.rate) : null;
    return { saved, monthsSooner };
  }
  ```
  `youngAdult.ts`: `SPEND` entries gain ids — `groceries` Продукты, `delivery` Доставка еды, `taxi` Такси, `transport` Транспорт, `subscriptions` Подписки (amounts and `discretionary` unchanged); add
  ```ts
  export const DEPOSIT_BOUNDS = { amountMin: 1000, amountMax: 500000, amountStep: 1000, monthsMin: 3, monthsMax: 36 };
  export const DEPOSIT_DEFAULT = { amount: LIZA.salary, months: 12 };
  export const SPEND_CUT_BOUNDS = { cutMin: 5, cutMax: 50, cutStep: 5 };
  export const SPEND_CUT_DEFAULT = { categoryId: 'delivery', cutPct: 20 };
  ```
  and change `PRODUCTS.deposit` to `name: 'Вклад'`, `termsLines: ['Срок — от трёх месяцев до трёх лет', 'Снять раньше срока без потери процентов нельзя']`.
  `store.ts`: `YoungAdultState` gains `deposit: { amount: number; months: number }` and `spendCut: { categoryId: string; cutPct: number }`, initialised from the defaults (copies, not the shared objects); add
  ```ts
  export function setDepositCalc(store: Store, amount: number, months: number): void {
    if (!Number.isFinite(amount) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
    const b = DEPOSIT_BOUNDS;
    store.youngAdult.deposit = { amount: clamp(Math.round(amount / b.amountStep) * b.amountStep, b.amountMin, b.amountMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
  }

  export function setSpendCut(store: Store, categoryId: string, cutPct: number): void {
    if (!SPEND.find((c) => c.id === categoryId && c.discretionary)) throw new ActionError('not_found', `No category ${categoryId} to cut`);
    if (!Number.isFinite(cutPct)) throw new ActionError('bad_state', 'Calculator values must be numbers');
    const b = SPEND_CUT_BOUNDS;
    store.youngAdult.spendCut = { categoryId, cutPct: clamp(Math.round(cutPct / b.cutStep) * b.cutStep, b.cutMin, b.cutMax) };
  }
  ```
  `dataModel.ts` `youngAdultModel`: remove `spend`; add to `base` (present with or without a goal):
  ```ts
  const { amount, months: depositMonths } = ya.deposit;
  const depositFigures = depositReturn(amount, depositMonths, DEMO_RATES.deposit);
  const spendTotal = SPEND.reduce((sum, c) => sum + c.amount, 0);
  const cutCategory = SPEND.find((c) => c.id === ya.spendCut.categoryId)!;
  const goalForCut = ya.goalId ? { target: GOALS[ya.goalId].target, monthly: ya.monthly, rate: DEMO_RATES.savings } : null;
  const cut = spendCut(cutCategory.amount, ya.spendCut.cutPct, goalForCut);
  // in base:
  depositCalc: {
    productId: 'deposit', name: PRODUCTS.deposit.name, rate: DEMO_RATES.deposit,
    amount, months: depositMonths, ...DEPOSIT_BOUNDS, ...depositFigures,
    calculatedFor: { amount, months: depositMonths },
    disclosure: PRODUCTS.deposit.disclosure, ctaLabel: PRODUCTS.deposit.ctaLabel,
  },
  spendAnalytics: {
    periodLabel: 'Октябрь', total: spendTotal,
    categories: SPEND.map((c) => ({ id: c.id, name: c.name, amount: c.amount, share: Math.round((c.amount / spendTotal) * 100), cuttable: c.discretionary })),
    ...ya.spendCut, ...SPEND_CUT_BOUNDS, saved: cut.saved,
    goalTitle: ya.goalId ? GOALS[ya.goalId].title : null, monthsSooner: cut.monthsSooner,
    calculatedFor: { ...ya.spendCut },
  },
  ```

- [ ] **Step 4: actions, fallback, instruction.** `actions.ts` cases:
  ```ts
  case 'deposit.recalc':
    setDepositCalc(deps.store, Number(context.amount), Number(context.months));
    return refreshData(input, deps, []);
  case 'spend.recalc':
    setSpendCut(deps.store, str(context, 'categoryId'), Number(context.cutPct));
    return refreshData(input, deps, []);
  ```
  `fallback.ts` `youngAdultGroups` (with a goal): replace the `SpendBreakdown` group with `[{ id: 'spend', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }]` and add `[{ id: 'deposit', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }]` after it. `scenarios/first-money-chat.json` instruction: replace `in later turns add SpendBreakdown, a ProductCard and, near the end, InviteRelative` with `in later turns add SpendAnalytics, DepositCalculator or a ProductCard and, near the end, InviteRelative`. `packages/server/src/prompt.ts` young-adult policy: wherever it names `SpendBreakdown`, name `SpendAnalytics` and add «`DepositCalculator` when she asks about a deposit or a lump sum».

- [ ] **Step 5: web, so typecheck stays clean.** `SpendBreakdownDef` no longer exists, so in `packages/web/src/catalog/firstMoney.tsx` delete `SpendBreakdownImpl`, in `catalog/index.ts` its registry entry, and in `test/firstMoney.test.tsx` its test cases. Do not add `DepositCalculator` / `SpendAnalytics` implementations — Task 6 does. Until then `web/test/catalog.test.tsx` "implements every component" is red; that one red test is accepted between Task 5 and Task 6 (as between the engine's Tasks 18 and 19).

- [ ] **Step 6: run and commit.** `npx vitest run packages/mocks packages/server packages/catalog packages/evals` PASS; `npm run typecheck` clean. Full `npm test`: green except `web/test/catalog.test.tsx` "implements every component" (DepositCalculator, SpendAnalytics have no React implementation until Task 6) — state it in the report.
  ```bash
  git add -A 04-prototype/packages/catalog 04-prototype/packages/mocks 04-prototype/packages/server 04-prototype/packages/web
  git commit -m "feat(prototype): deposit and spending calculators on the server, recalculated without the model" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 6: Live calculators and the three reference widgets in the browser

**Files:**
- Create: `packages/web/src/ui/useLiveCalc.ts`
- Modify: `packages/web/src/ui/index.ts`, `packages/web/src/catalog/firstMoney.tsx`, `packages/web/src/catalog/index.ts`
- Test: `packages/web/test/liveCalc.test.tsx`; update `packages/web/test/firstMoney.test.tsx`

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- Widget markup follows tokens.md «Widget anatomy» for `DepositCalculator`, `SpendAnalytics`, `ConfirmOpenProduct` (and `FirstMoneyBanner` for the home slot, already restyled in Task 4 if it fits there; otherwise here). In the sample code below: `months` → `duration`; `WidgetCard` takes `icon={<SafeIcon />}` and `subtitle`, not `meta`; results go in `ResultBox`; the deposit title is «{name} — {ratePct(rate)}»; SpendAnalytics uses HeroUI `Meter` per row and `accusative` in the slider label; `monthsSooner > 0` renders «на {duration(n)} раньше».
- `ConfirmOpenProduct`: title «Открыть {name with a lower-case first letter}», terms lines split on « — » into icon rows per tokens.md; after «Подтвердить»/«Отмена» a local `choice` state replaces the buttons with the «Подтверждено» / «Отменено» status. Tests assert the status replaces the buttons.

**Interfaces:**
- Consumes: Task 4 blocks; Task 5 records, defs and action contexts; `04-prototype/design/tokens.md` anatomy of the three reference widgets.
- Produces: `useLiveCalc<T extends Record<string, string | number>>(server: T, send: (inputs: T) => void): { inputs: T; isCurrent: boolean; change(patch: Partial<T>): void }`; `RECALC_DELAY_MS = 300`, `RECALC_RETRY_MS = 2000`; `DepositCalculatorImpl`, `SpendAnalyticsImpl`, rebuilt `ConfirmOpenProductImpl`.

- [ ] **Step 1: failing tests** `packages/web/test/liveCalc.test.tsx`:
  ```tsx
  import { act, cleanup, render, screen } from '@testing-library/react';
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
  import { RECALC_DELAY_MS, RECALC_RETRY_MS, useLiveCalc } from '../src/ui';

  function Probe({ server, send }: { server: { amount: number }; send: (v: { amount: number }) => void }) {
    const c = useLiveCalc(server, send);
    (globalThis as any).calc = c;
    return <span data-current={String(c.isCurrent)}>{c.inputs.amount}</span>;
  }
  const calc = () => (globalThis as any).calc as ReturnType<typeof useLiveCalc<{ amount: number }>>;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  describe('useLiveCalc', () => {
    it('sends once, after the pause, with the last value', () => {
      const send = vi.fn();
      render(<Probe server={{ amount: 1000 }} send={send} />);
      act(() => calc().change({ amount: 2000 }));
      act(() => calc().change({ amount: 3000 }));
      act(() => vi.advanceTimersByTime(RECALC_DELAY_MS - 1));
      expect(send).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith({ amount: 3000 });
      expect(screen.getByText('3000').dataset.current).toBe('false');
    });
    it('is current again once the server answers for these inputs', () => {
      const send = vi.fn();
      const { rerender } = render(<Probe server={{ amount: 1000 }} send={send} />);
      act(() => calc().change({ amount: 3000 }));
      act(() => vi.advanceTimersByTime(RECALC_DELAY_MS));
      rerender(<Probe server={{ amount: 2000 }} send={send} />); // an older answer: still not current
      expect(screen.getByText('3000').dataset.current).toBe('false');
      rerender(<Probe server={{ amount: 3000 }} send={send} />);
      expect(screen.getByText('3000').dataset.current).toBe('true');
    });
    it('sends again if no answer comes (the request was dropped while another was in flight)', () => {
      const send = vi.fn();
      render(<Probe server={{ amount: 1000 }} send={send} />);
      act(() => calc().change({ amount: 3000 }));
      act(() => vi.advanceTimersByTime(RECALC_DELAY_MS + RECALC_RETRY_MS + RECALC_DELAY_MS));
      expect(send).toHaveBeenCalledTimes(2);
    });
  });
  ```
  In `packages/web/test/firstMoney.test.tsx` add (with the file's `mount` and a data model from `buildDataModel('young-adult', …)`), using the slider event Task 3 confirmed:
  ```tsx
  it('recalculates the deposit live, and marks figures stale until the bank answers', () => {
    vi.useFakeTimers();
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText(/7\s234\s₽/)).toBeTruthy();
    fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '24' } }); // months
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'deposit.recalc', context: { amount: 45000, months: 24 } });
    vi.useRealTimers();
  });
  it('picks a category to cut', () => {
    vi.useFakeTimers();
    const actions = mount([root('s'), { id: 's', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    fireEvent.click(screen.getByRole('radio', { name: /Такси/ }));
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'spend.recalc', context: { categoryId: 'taxi', cutPct: 20 } });
    expect(screen.getByRole('radio', { name: /Продукты/ }).hasAttribute('disabled') || screen.getByRole('radio', { name: /Продукты/ }).getAttribute('aria-disabled') === 'true').toBe(true);
    vi.useRealTimers();
  });
  it('confirms opening with the full disclosure and fixed actions', async () => {
    const data = { ...buildDataModel('young-adult', createStore(), { clock: '10:05' }), static: { product: PRODUCTS.deposit } };
    const actions = mount([root('c'), { id: 'c', component: 'ConfirmOpenProduct', product: { path: '/static/product' } }], data);
    expect(screen.getByText(PRODUCTS.deposit.disclosure)).toBeTruthy();
    for (const line of PRODUCTS.deposit.termsLines) expect(screen.getByText(line, { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.confirm', context: { productId: 'deposit' } }));
  });
  ```
  Run `npx vitest run packages/web/test/liveCalc.test.tsx packages/web/test/firstMoney.test.tsx` → FAIL.

- [ ] **Step 2: `ui/useLiveCalc.ts`.**
  ```ts
  import { useEffect, useRef, useState } from 'react';

  export const RECALC_DELAY_MS = 300;
  export const RECALC_RETRY_MS = 2000;

  const same = <T extends Record<string, string | number>>(a: T, b: T) => Object.keys(b).every((k) => a[k] === b[k]);

  /**
   * A calculator's inputs: the slider draft lives here, the figures stay the bank's.
   * After a pause the draft is sent; the figures are current only while the server's echoed inputs equal the draft.
   * A request can be dropped by the phone's one-action-at-a-time guard, so an unanswered draft is sent again.
   */
  export function useLiveCalc<T extends Record<string, string | number>>(server: T, send: (inputs: T) => void) {
    const [draft, setDraft] = useState<T | null>(null);
    const [attempt, setAttempt] = useState(0);
    const sendRef = useRef(send);
    sendRef.current = send;
    const serverKey = JSON.stringify(Object.keys(server).sort().map((k) => [k, server[k]]));
    const pending = draft !== null && !same(draft, server);

    useEffect(() => {
      if (draft && same(draft, server)) setDraft(null);
    }, [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const draftKey = draft ? JSON.stringify(draft) : '';
    useEffect(() => {
      if (!pending || !draft) return;
      const t = setTimeout(() => sendRef.current(draft), RECALC_DELAY_MS);
      const r = setTimeout(() => setAttempt((n) => n + 1), RECALC_DELAY_MS + RECALC_RETRY_MS);
      return () => {
        clearTimeout(t);
        clearTimeout(r);
      };
    }, [pending, draftKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
      inputs: draft ?? server,
      isCurrent: !pending,
      change: (patch: Partial<T>) => setDraft((d) => ({ ...(d ?? server), ...patch }) as T),
    };
  }
  ```
  Export it and both constants from `ui/index.ts`.

- [ ] **Step 3: the three reference widgets** in `catalog/firstMoney.tsx`, to the approved canvas anatomy (`tokens.md`); the code below is the structure — layout classes follow the canvas, props and actions do not change:
  ```tsx
  export const DepositCalculatorImpl = createComponentImplementation(DepositCalculatorDef.api, ({ props, context }) => {
    const d = props.deposit as DepositCalc | undefined;
    const calc = useLiveCalc(d ? d.calculatedFor : { amount: 0, months: 0 }, (inputs) => dispatch(context, 'deposit.recalc', inputs));
    if (!d) return null;
    return (
      <WidgetCard icon="🏦" title={d.name} meta={ratePct(d.rate)}>
        <CalcSlider label="Сумма" value={calc.inputs.amount} min={d.amountMin} max={d.amountMax} step={d.amountStep} format={rub} onChange={(amount) => calc.change({ amount })} />
        <CalcSlider label="Срок" value={calc.inputs.months} min={d.monthsMin} max={d.monthsMax} step={1} format={months} onChange={(m) => calc.change({ months: m })} />
        <CalcResult isCurrent={calc.isCurrent}>
          <KeyValue rows={[{ label: 'Доход', value: <Amount value={d.income} tone="positive" /> }, { label: 'В конце срока', value: <Amount value={d.total} /> }]} />
        </CalcResult>
        <LegalNote text={d.disclosure} />
        <ActionRow primary={{ label: d.ctaLabel, onPress: () => dispatch(context, 'product.open', { productId: d.productId }) }} />
      </WidgetCard>
    );
  });

  export const SpendAnalyticsImpl = createComponentImplementation(SpendAnalyticsDef.api, ({ props, context }) => {
    const s = props.spend as SpendAnalytics | undefined;
    const calc = useLiveCalc(s ? s.calculatedFor : { categoryId: '', cutPct: 0 }, (inputs) => dispatch(context, 'spend.recalc', inputs));
    if (!s) return null;
    const picked = s.categories.find((c) => c.id === calc.inputs.categoryId);
    return (
      <WidgetCard icon="📊" title="Куда уходят деньги" meta={s.periodLabel}>
        <RadioGroup aria-label="Категория трат" value={calc.inputs.categoryId} onChange={(categoryId) => calc.change({ categoryId })}>
          {s.categories.map((c) => (
            <Radio key={c.id} value={c.id} isDisabled={!c.cuttable}>
              <Radio.Content className="flex w-full justify-between gap-3">
                <Radio.Control><Radio.Indicator /></Radio.Control>
                <span className="flex-1">{c.name}</span>
                <span className="text-muted tabular-nums">{rub(c.amount)} · {c.share}%</span>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        <CalcSlider label={`Сократить «${picked?.name ?? ''}»`} value={calc.inputs.cutPct} min={s.cutMin} max={s.cutMax} step={s.cutStep} format={(v) => `на ${v}%`} onChange={(cutPct) => calc.change({ cutPct })} />
        <CalcResult isCurrent={calc.isCurrent}>
          <KeyValue rows={[
            { label: 'Освободится в месяц', value: <Amount value={s.saved} tone="positive" /> },
            ...(s.goalTitle !== null && s.monthsSooner !== null ? [{ label: `До цели «${s.goalTitle}»`, value: s.monthsSooner > 0 ? `на ${months(s.monthsSooner)} ближе` : 'почти без изменений' }] : []),
          ]} />
        </CalcResult>
      </WidgetCard>
    );
  });

  export const ConfirmOpenProductImpl = createComponentImplementation(ConfirmOpenProductDef.api, ({ props, context }) => {
    const p = props.product as Product | undefined;
    if (!p) return null;
    return (
      <WidgetCard icon="🔒" title="Подтверди открытие">
        <KeyValue rows={[{ label: 'Продукт', value: p.name }, { label: 'Ставка', value: ratePct(p.rate) }]} />
        <ul className="flex flex-col gap-1 text-body">{p.termsLines.map((t) => <li key={t}>{t}</li>)}</ul>
        <LegalNote text={p.disclosure} />
        <p className="text-caption text-muted">Условия зафиксированы. Проверь перед подтверждением.</p>
        <ActionRow primary={{ label: 'Подтвердить', onPress: () => dispatch(context, 'product.confirm', { productId: p.id }) }} secondary={[{ label: 'Отмена', onPress: () => dispatch(context, 'product.cancel', { productId: p.id }) }]} />
      </WidgetCard>
    );
  });
  ```
  The «Подтверди / Проверь» wording follows the «ты» rule; the engine's spec mandated these strings in the «вы» form before the owner's rule — record the change. Remove `SpendBreakdownImpl`; register `DepositCalculator: DepositCalculatorImpl` and `SpendAnalytics: SpendAnalyticsImpl` in `catalog/index.ts`. The hooks run before the early `return null` (rules of hooks).

- [ ] **Step 4: run and commit.** Focused tests PASS; `npm test` fully green (the Task 5 red test is green again), `npm run typecheck`, `npm run build`.
  ```bash
  git add -A 04-prototype/packages/web
  git commit -m "feat(prototype): live deposit and spending calculators; reference widgets to the approved canvas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 7: Catalog showcase at `#/catalog`

**Files:**
- Create: `packages/web/src/showcase/mount.ts`, `showcase/fixtures.ts`, `showcase/Showcase.tsx`
- Modify: `packages/web/src/App.tsx`, `packages/web/src/debug/DebugPanel.tsx`, `packages/web/package.json` (move `@proto/mocks` from devDependencies to dependencies, `"*"`)
- Test: `packages/web/test/showcase.test.tsx`

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- The showcase page is dark (`bg-page`), headings `font-display text-title`; each case sits in a 374 px column on `bg-background`. Add a `HomeScreen` case group (the home view with the banner slot) so the chrome is reviewable without the model.

**Interfaces:**
- Consumes: `reactCatalog('young-adult')`, `CATALOGS['young-adult']`, `@proto/mocks` (`createStore`, `selectGoal`, `buildDataModel`, `PRODUCTS`).
- Produces: `mountSurface(components: unknown[], data: unknown, onAction?: (a: ActionPayload) => void): SurfaceModel<any>`; `showcaseCases(): ShowcaseCase[]` with `ShowcaseCase = { component: string; variant: 'normal' | 'long-text' | 'no-data'; components: unknown[]; data: unknown }`; `<Showcase />`.

- [ ] **Step 1: failing test** `packages/web/test/showcase.test.tsx`:
  ```tsx
  import { cleanup, render } from '@testing-library/react';
  import { afterEach, describe, expect, it, vi } from 'vitest';
  import { A2uiSurface } from '@a2ui/react/v0_9';
  import { CATALOGS } from '@proto/catalog';
  import { mountSurface } from '../src/showcase/mount';
  import { showcaseCases } from '../src/showcase/fixtures';

  afterEach(() => cleanup());

  describe('catalog showcase', () => {
    it('has a normal case for every young-adult component, static-only included', () => {
      const covered = new Set(showcaseCases().filter((c) => c.variant === 'normal').map((c) => c.component));
      for (const def of CATALOGS['young-adult'].components) expect(covered, def.name).toContain(def.name);
    });
    it('renders every case without an error', () => {
      const errors = vi.spyOn(console, 'error');
      for (const c of showcaseCases()) {
        const { container, unmount } = render(<A2uiSurface surface={mountSurface(c.components, c.data)} />);
        if (c.variant === 'no-data') expect(container.textContent, `${c.component} ${c.variant}`).toBe('');
        else expect(container.textContent?.length, `${c.component} ${c.variant}`).toBeGreaterThan(0);
        unmount();
      }
      expect(errors).not.toHaveBeenCalled();
    });
  });
  ```
  Run → FAIL (modules missing).

- [ ] **Step 2: `showcase/mount.ts`** (the same pattern the tests use):
  ```ts
  import { MessageProcessor, type ActionPayload, type SurfaceModel } from '@a2ui/web_core/v0_9';
  import { CATALOGS } from '@proto/catalog';
  import { reactCatalog } from '../catalog';

  let seq = 0;
  /** One young-adult surface from a recipe and a data model, rendered by the real A2UI renderer. */
  export function mountSurface(components: unknown[], data: unknown, onAction: (a: ActionPayload) => void = () => {}): SurfaceModel<any> {
    const surfaceId = `showcase-${++seq}`;
    const p = new MessageProcessor([reactCatalog('young-adult')], async (a) => onAction(a));
    p.processMessages([
      { version: 'v0.9', createSurface: { surfaceId, catalogId: CATALOGS['young-adult'].id } },
      { version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: data } },
      { version: 'v0.9', updateComponents: { surfaceId, components } },
    ] as any);
    return p.model.surfacesMap.get(surfaceId)!;
  }
  ```

- [ ] **Step 3: `showcase/fixtures.ts`.** Data: `noGoal = buildDataModel('young-adult', createStore(), { clock: '10:05' })`; `withGoal` after `selectGoal(store, 'apartment')`; static data `{ static: { product: PRODUCTS.deposit, done: { title: 'Готово', text: 'Вклад открыт.', backLabel: 'К плану' } } }` merged in. One `normal` case per component (prop names as in the defs in `packages/catalog/src/components/*.ts`): `Column` (with a `Text` child), `Section` (title «Мои цели», a `Text` child), `Text` (`'Вот план под твою цель.'`, body), `Notice` (`'Показываем главное. Подсказки обновятся чуть позже.'`, info), `EmptyState` (`'Пока пусто'`, `'Здесь появятся твои цели'`), `Refusal` (`/refusals/notAdvice`), `Handoff` (`/handoff`), `Done` (`/static/done`), `FirstMoneyBanner` (`/banner`), `GoalPicker` (`/goals`), `PlanComparison` (`/plans`, withGoal), `ScenarioSliders` (`/scenario`, withGoal), `SpendAnalytics` (`/spendAnalytics`, withGoal), `DepositCalculator` (`/depositCalc`), `ProductCard` (`/products/savings`), `InviteRelative` (`/invite`, withGoal), `ConfirmOpenProduct` (`/static/product`). `long-text` cases for `Text`, `FirstMoneyBanner`, `ProductCard`, `ConfirmOpenProduct`, `SpendAnalytics`: the same data with each human-readable string tripled (`s + ' ' + s + ' ' + s`), numbers unchanged. `no-data` cases for every component bound to a goal-dependent key (`PlanComparison`, `ScenarioSliders`, `InviteRelative`) using `noGoal`.

  Ruling on the spec's four states (normal, empty, long text, error): "empty" is the `no-data` case (the bound key is null, the widget renders nothing); "error" has no widget-level form in this engine — malformed data never reaches a widget because the server validator rejects the screen and the rule-based fallback answers — so the error states shown are the screen-level ones that exist: the `Refusal`, `Handoff` and `Done` (`DONE.actionFailed`) cases above, plus a `Notice` warning case (`'Не получилось обновить. Попробуй ещё раз.'`, warning).

- [ ] **Step 4: `showcase/Showcase.tsx` and the route.** The page lists the cases grouped by component — a `font-display text-section` heading per component, then each variant in a 390 px column labelled with its variant (`обычный`, `длинный текст`, `нет данных — виджет скрыт`). Actions are logged with `console.info('showcase action', a)`. `App.tsx`: `const [hash, setHash] = useState(location.hash)` with a `hashchange` listener; `#/catalog` renders `<Showcase />` instead of the phone (header stays). `DebugPanel` body gets a link «Каталог виджетов» → `#/catalog` and, on the showcase, «К телефону» → `#/`.

- [ ] **Step 5: run and commit.** `npx vitest run packages/web/test/showcase.test.tsx` PASS; `npm test`, `npm run typecheck`, `npm run build` green.
  ```bash
  git add -A 04-prototype/packages/web 04-prototype/package-lock.json
  git commit -m "feat(prototype): catalog showcase with every widget in every state" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 8: Real-browser checks, canvas comparison, impeccable audit — then STOP (controller)

**Files:** Create `04-prototype/e2e/ui-check.sh`; fixes from the audit go through an implementer as fix rounds.

**Design deltas — bind over the code below (owner approved the canvas 2026-10-23).** `04-prototype/design/tokens.md` and the boards in `04-prototype/design/foundation/` are the source of truth; where this task's sample code (written before the canvas) differs, tokens.md wins. The app is dark only.
- Also check: the phone opens on the home view; the banner opens the chat; «Назад» returns home; primary buttons are white with dark text; positive money and icons are #21A038; `getComputedStyle(document.body).fontFamily` starts with `"SB Sans Text"`. Compare against the boards in `design/foundation/`.

- [ ] **Step 1: the check script** `04-prototype/e2e/ui-check.sh` (needs a running server; `agent-browser` on PATH):
  ```bash
  #!/bin/bash
  # Real-Chromium check: no page errors, no horizontal overflow at four widths, on the phone and the showcase.
  set -u
  BASE=${1:-http://localhost:8787}
  fail=0
  for path in "/" "/#/catalog"; do
    for w in 560 760 1000 1400; do
      agent-browser errors --clear >/dev/null
      agent-browser open "$BASE$path" >/dev/null
      agent-browser set viewport "$w" 900 >/dev/null
      agent-browser wait 2500 >/dev/null
      over=$(agent-browser eval "JSON.stringify({sw: document.documentElement.scrollWidth, iw: innerWidth, past: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length})")
      errs=$(agent-browser errors)
      echo "$path @ $w: $over ${errs:+errors: $errs}"
      python3 -c "import json,sys; d=json.loads(json.loads(sys.argv[1])); sys.exit(0 if d['sw']<=d['iw'] and d['past']==0 else 1)" "$over" || fail=1
      [ -n "$errs" ] && fail=1
    done
  done
  exit $fail
  ```
- [ ] **Step 2: run it** against the server on the subscription (`npm run start` from `04-prototype/`): exit 0. Also, by hand in `agent-browser`: the banner → «Составить план» → a goal → the deposit calculator: move a slider, see «Пересчитываем…», then the new figures with no new model screen in the debug panel; the spending widget: pick «Такси», change the cut; «Открыть вклад» → ConfirmOpenProduct → «Подтвердить» → «Готово». Primary buttons are Sber green; text is SB Sans (`getComputedStyle(document.body).fontFamily` starts with `"SB Sans Text"`).
- [ ] **Step 3: compare with the canvas.** Screenshot the three reference widgets in the showcase and the chrome; put them side by side with the canvas boards; list every visible difference.
- [ ] **Step 4: audit.** Invoke `impeccable` in audit mode on the showcase and the chat; fix every high-severity finding and every canvas difference through an implementer fix round (re-run Steps 1–3 after).
- [ ] **Step 5: commit and STOP.**
  ```bash
  git add 04-prototype/e2e
  git commit -m "test(prototype): real-browser responsive and page-error check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```
  Report to the owner: screenshots (canvas vs build), the audit result, what changed from the canvas and why, the check output. Step 1 (widgets one by one) starts only on the owner's go.
