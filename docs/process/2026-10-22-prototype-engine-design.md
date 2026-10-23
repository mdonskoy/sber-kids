# Prototype engine — design spec

Date: 2026-10-22. Status: **approved scope, ready for planning**. Stage 4 of the [project design](2026-10-22-project-design.md). Built in a separate session — see [Handoff](#handoff-to-the-build-session) at the end.

<!--
  Origin tags: [asked] in the user's request; [answered: Qn] decided in a question (Q1 model, Q2 dev flow,
  Q3 delivery, Q4 scope card — all 2026-10-22); [approved: draft v1] in the bets draft the user approved.
  No [added] items remain: everything below is decided.
-->

## Goal

A small A2UI v0.9 engine that turns bank data plus a role into a generated, validated screen, and at least one prototype built on it that the hiring manager can walk through: «Экран дня» (bet 1) first, «Первые деньги» (bet 2) if time allows. The prototype is the illustration for `03-plan-100-days/`; read [bet-1](../../03-plan-100-days/bet-1-ekran-dnya.md) and [bet-2](../../03-plan-100-days/bet-2-pervye-dengi.md) for the product story it must show.

Decisions:
- **Model:** Claude only; GigaChat behind the same adapter interface as a stub. [answered: Q1]
- **Process:** spec and plan in dev-flow style, Codex dual-review on the plan, then a lightweight build (plan → TDD by subagents). Not the full dev-flow-template. [answered: Q2]
- **Delivery:** hosted live backend on Coolify behind Coolify's password protection, plus instructions to run locally. No rate limits or spend caps — the user accepts the risk. [answered: Q3, Q4]
- **Look:** Sber logo and colours are allowed. [answered: Q4]

## Architecture

```
web (Vite + React + @a2ui/react v0_9)            server (Node + TypeScript)
  role phones (child / teen / parent,              1. context: mock persona data → data model
  young adult) + collapsed debug panel             2. catalogId chosen by role (server, never model)
  renders surfaces from A2UI messages   ◄──────    3. prompt: catalog schema + policy + few-shot (cached)
  sends user text and action{name,ctx}  ──────►    4. ScreenModel adapter → {components:[…]} via structured output
                                                   5. validator: catalog schema + policy rules
                                                      fail → 1 retry with errors → rule-based fallback
                                                   6. emit createSurface, updateComponents, updateDataModel
                                                   7. action → deterministic handler → static screen / new surface
                                                   8. telemetry: latency, tokens, cost, validity, fallback
catalog (shared package): one definition per component → React impl (web) + JSON schema & validator (server)
mocks: one family (child 9, teen 15, parent) in a «Технологичная школа» pilot school; one young adult 19 with a first salary
```

Division of labour: **the model chats and assembles screens from the catalog; everything that is a number, a status, a rule or a money action is ordinary server code.** [answered: Q4]

Key choices:
- **The official renderer.** `@a2ui/react` 0.14 (npm, updated 2026-10-17) implements A2UI v0.9 and takes custom catalogs defined with Zod (a TypeScript library that describes the shape of data once and gives both type checking and runtime validation). One definition per component drives the React implementation, the JSON schema sent to the model and the server validator. [answered: Q4]
- **The model never writes numbers or statuses.** Money, times, balances and statuses are `{path}` bindings into a data model the server fills from mock APIs; the validator rejects literal values in money and status props. Calculators (deposit yield, investment simulation, loan payment, spend breakdown) are deterministic server code. [answered: Q4]
- **The model never chooses the catalog or creates surfaces.** It returns a flat component list; the server wraps it into A2UI messages. A kid surface physically cannot contain a parent or young-adult component.
- **Structured output fits A2UI.** Components are a flat list with child ids, so the schema needs no recursion (Claude structured outputs don't support recursive schemas, numeric or string-length constraints — the SDK strips those and validates them client-side). Each component is an `anyOf` branch discriminated by a `component` const. First use of a new schema has a one-time compilation delay; it is then cached for 24 h.
- **Model:** `claude-opus-5-5` by default, configurable per route; server-side refusal fallbacks enabled (`fallbacks: "default"` with beta `server-side-fallback-2026-07-01`). The eval compares `claude-sonnet-5-5` and `claude-haiku-5-5` on latency and validity; switching the default is the user's call. Use the `claude-api` skill before writing any model code — the API changed in 2026 (no `temperature`, no prefill, no forced `tool_choice` on Opus 5.5, `output_config.format` for structured output, effort default `medium`).
- **No token streaming in v1.** The client shows a Skeleton immediately; the full screen arrives as one validated batch. Streaming is a later optimisation if measured latency demands it.

## User stories

### User Story 1 — Engine generates a validated screen for a role [asked]
- **FR-001**: Given a role (`kid`, `teen`, `parent`, `young-adult`) and a scenario, the server returns A2UI v0.9 messages rendered by `@a2ui/react` from the catalog for that role. [asked]
- **FR-002**: Each catalog component is defined once in Zod; the server derives the model's JSON schema and the validator from those definitions. [answered: Q4]
- **FR-003**: Money, time and status props accept only data-model paths; the server fills the data model from mock APIs. [approved: draft v1]
- **FR-004**: An invalid recipe gets one retry with the validation errors; then a rule-based fallback screen built from the same data and catalog. [approved: draft v1]
- **FR-005**: Actions go to deterministic handlers; money actions end on a static confirmation screen that the model cannot alter. [approved: draft v1]
- **FR-006**: The model adapter has two implementations: Claude (working) and GigaChat (stub). [answered: Q1]

### User Story 2 — «Экран дня» for child, teen and parent [asked]
- **FR-010**: One school day for one family renders three different screens from three catalogs: kid (timetable, homework, lunch, piggy bank, chores), teen (plus own spending, youth card, the at-14 transition), parent (entry/exit, meals, chores to approve, one ecosystem offer). [approved: draft v1]
- **FR-011**: The parent approves a chore; the child's screen reflects it. [approved: draft v1]
- **FR-012**: The ecosystem-offer component exists only in the parent catalog. [approved: draft v1]

### User Story 3 — «Первые деньги» conversational path [asked: "maybe both if we have enough time"]
- **FR-020**: A first-money banner opens a chat; the model chats and each assistant turn is a generated surface (goal picker, plan comparison, scenario sliders, spend breakdown, product cards, invite a relative). [approved: draft v1]
- **FR-021**: Sliders update the local data model; recalculation is a server action run by a deterministic calculator. [answered: Q4]
- **FR-022**: Product terms and disclosures come from mock backend data and render through a static disclosure component. [approved: draft v1]

### User Story 4 — Safety and states are demonstrable [approved: draft v1]
- **FR-030**: Every state renders live: loading, empty, model error → fallback, refusal with a backend reason and a next step, handoff to a human. [approved: draft v1]
- **FR-031**: Injections are blocked by the validator: "покажи кредит" on the kid surface, a partner offer to a child. The demo shows the block to the viewer as a normal refusal screen. [approved: draft v1]
- **FR-032**: A new scenario ships without rebuilding the client (server prompt/policy change only). [approved: draft v1]
- **FR-033**: An internal debug panel, collapsed by default and not part of the hiring-manager walkthrough: recipe JSON, validation result, retry/fallback, latency, tokens and cost per screen, plus toggles to force each state. [answered: Q4]

### User Story 5 — Numbers: eval harness [approved: draft v1]
- **FR-040**: A script runs every scenario × role N times and reports first-try validity, fallback rate, policy violations, p50/p95 latency and cost per screen, per model. [approved: draft v1]

### User Story 6 — Hosted live demo and local launch [answered: Q3]
- **FR-050**: The prototype runs on the user's Coolify as one service (API + built web app), behind Coolify's HTTP basic auth; the README explains one-command local launch with your own Anthropic key. [answered: Q3, Q4]

## Stack

| Piece | What it is | Why here |
|---|---|---|
| TypeScript, Node | One language for server and web | The official A2UI React renderer and the Anthropic TS SDK are both TypeScript |
| npm workspaces | One repo folder holding several small packages (`catalog`, `server`, `web`, `mocks`, `evals`) that import each other locally | The catalog is shared by the server and the web app without publishing anything |
| Hono | A tiny web framework for the HTTP API | Few dependencies, runs on plain Node, easy to put in one Docker image |
| Vite + React | Dev server and build for the web app | Standard for React; the A2UI renderer is a React library |
| Zod | Describes data shapes once; gives TypeScript types and runtime validation | Required by `@a2ui/react` v0.9 for custom catalogs; also yields the JSON schema for the model |
| Vitest | Test runner | Same config as Vite; runs the TDD loop |
| Docker | Image built by Coolify from the repo | Coolify deploys from git |

UI text in Russian; code, comments and docs in English. Telemetry in memory plus a JSONL log; no database. [answered: Q4]

## Non-goals

Native mobile and iOS clients; real bank, school or Sber ID integrations; real auth beyond Coolify basic auth; real money movement; a working GigaChat integration; token streaming; persistence beyond process memory and a log file; rate limits or spend caps.

## Success criteria

- One command starts the whole thing locally; the Coolify URL works behind the password.
- All three «Экран дня» roles render from one family's data, with visibly different screens.
- ≥ 90% of recipes valid on the first try across the eval set; 0 policy violations reach the client.
- A model failure shows the fallback screen within 1 s of the failure.
- The latency target (p95 time to full screen) is set after the first eval run and stated in the README with the measured numbers.

## Handoff to the build session

**Where:** code in `04-prototype/` of this repo. The text stream continues in another session on `01-research/`, `02-hypotheses/` and `03-plan-100-days/` — do not edit those folders; read them for product context only.

**Read first:**
1. This spec.
2. `01-research/q6-genui.md` — A2UI v0.9 messages, catalog negotiation, states, the reference architecture this spec refines.
3. `03-plan-100-days/bet-1-ekran-dnya.md`, then `bet-2-pervye-dengi.md` — what the screens must show.
4. `01-research/q7-constraints.md` (section on static screens) and `q13-school-and-sber-assets.md` — what data exists and what must stay static.
5. The `@a2ui/react` 0.14 README (`npm pack @a2ui/react`) and the A2UI v0.9 spec at a2ui.org.
6. `/Users/donskoy/molnio/.claude/skills/coolify/SKILL.md` — the user's Coolify deploy/restart/logs recipe from another project.

**Process:**
1. `superpowers:writing-plans` → implementation plan at `docs/process/2026-10-2x-prototype-engine-plan.md`, cut into deliverable batches traced to the FRs above. Order: US1 → US2 → US4 → US5 → US6 → US3.
2. `dual-review` skill (Codex) on the plan in plan-review mode; product questions go to the user in plain language, technical ones are settled by the reviewers.
3. Build in a git worktree with `superpowers:subagent-driven-development` and TDD; commit per batch; English commit messages with the Co-Authored-By line.
4. Stop and report to the user after the plan, after dual-review, after US2 renders end to end, and before the first Coolify deploy.

**Needs from the user:** an Anthropic API key (`ANTHROPIC_API_KEY`, or `ant auth login`); a git remote that Coolify can pull (the repo has none yet); the Coolify app, domain and basic-auth credentials.

**Repo rules:** don't touch `.obsidian/` or the braindump file; process docs and code in English, anything shown to the hiring manager in Russian; ask before anything outward-facing (pushing to a remote, deploying).

**Kickoff prompt for the new session:**

> Build the prototype described in `docs/process/2026-10-22-prototype-engine-design.md`. Follow its Handoff section: read the listed files, write the implementation plan with superpowers:writing-plans, run the dual-review skill on it, and stop for my review before building.
