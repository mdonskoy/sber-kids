# Project design: Sber Kids GenAI Lab test assignment

Date: 2026-10-22 · Status: approved in chat, pending spec review

## Goal

Answer the test assignment for the role of GenAI Lab lead (kids' and youth banking, 6–24) at Sber.
The assignment (`00-brief/assignment.md`) asks for a **100-day plan**:

- **Goals** — two bets. Each bet has: a launch channel, a "kill within two weeks" criterion, a
  business metric of effect, and what a person can walk through by hand at the end of the quarter.
  One more bet is deliberately cut, with the reason.
- **How** the goals will be reached.
- **What** to ask for (resources, access, decisions).

The deliverable is a git repo handed to the hiring manager: an executive summary linking to
supporting docs, plus a prototype.

## Decisions

| Decision | Choice |
|---|---|
| Bet depth | 2 bets + 1 cut. Bet #1: full execution in corporate reality + prototype. Bet #2: one-pager with the four required attributes. |
| Research scope | 9 questions (below) |
| Research method | 4 thematic clusters run as parallel agents, one output file per question, then a synthesis |
| Language | Hiring-manager-facing artifacts (research, hypotheses, plan, prototype UI copy) in Russian. Code, commit messages and process docs in English. |
| Deadline | None; optimize for quality, pace stage by stage |
| Process | Stop for a joint review after every stage; the next stage starts only on the user's go |

## Stages

1. **Research** → `01-research/q1…q9.md` + `01-research/synthesis.md` (insights → hypothesis seeds).
2. **Hypotheses & prioritization** → `02-hypotheses/backlog.md` (long list) +
   `02-hypotheses/prioritization.md` (framework → 2 bets + 1 cut). Framework designed at stage 2.
3. **Execution** → `03-plan-100-days/plan.md` (goals / how / asks) + `bet-1-execution.md` (deep,
   corporate reality) + `bet-2.md` (one-pager).
4. **Prototype** → `04-prototype/`. Approach (stack, whether to use `~/dev-flow-template`, which is
   built for production changes and may be too heavy) decided at stage 4.

Final: `README.md` — executive summary in Russian with links to every artifact; push to a git remote.

## Research questions

| # | Question | Cluster |
|---|---|---|
| Q1 | Why does the bank need kids at all? Parent retention, growing future clients, other? | A. Market & economics |
| Q2 | Current kids'/youth MAU at Sber, as % of the RF population of that age, by segment | A |
| Q9 | Metrics baseline: unit economics of a kid/youth client, parent retention, LTV proxies from public reports; what "financial effect" and "~1M MAU" realistically mean | A |
| Q3 | Banking GenAI products already live: Sber (SberKot, GigaChat as point A), T-Bank, VTB, Alfa, international | B. Competitors & adjacent AI |
| Q4 | What is happening in kid-adjacent AI in other fields (health, games, productivity, content, education, science) — gestures to borrow | B |
| Q5 | Main scenarios of people 6–24, friction points and opportunities, by age bracket | C. Users & product |
| Q8 | Teardown of current journeys: SberKids, Детская СберКарта, youth 14–24 in SberBank Online — screens, app-store reviews, visible friction | C |
| Q6 | How GenUI, Agent-to-UI (A2UI), component catalogs and model states (empty, error, refusal) work | D. Technology & constraints |
| Q7 | Constraints: 152-FZ and minors' data, parental consent, Bank of Russia, RF AI regulation, mandatory stack (GigaChat), Sber "product factory" mechanics, channel ownership, iOS distribution (Sber apps off the RF App Store → release cycle and adoption; why server-driven UI matters more here) | D |

| Q10 | Channels beyond the app: ATM (incl. GigaChat ATM), branch, call center, SberDevices speaker/TV, school; RF + international references | Round 2 |
| Q11 | Non-financial engagement assets in the Sber ecosystem for 6–24 (education, content, health, productivity, games) | Round 2 |
| Q4+ | Q4 deepened: all six adjacent fields from the vacancy, with engagement benchmarks; gesture table rewritten | Round 2 |
| Q12 | International youth/teen/family neobanks: products, engagement mechanics, metrics | Round 2 |

Primary source for every cluster: the assignment and the vacancy page linked in it.

Round 2 (added 2026-10-22 after user review): the first synthesis framed bets too narrowly around money
and app channels. Metric frame changed to two layers, mapped to the hiring manager's two goals for next
year: one bet engagement-led (MAU/return, may be non-financial; business number = a proxy the bank
accepts, P&L link stated honestly as model-based), one bet financial-effect-led (rouble indicator vs
holdout). "Product factory", "one GenAI experiment this year" and "~1M MAU next year" come from the
conversation with the hiring manager and are cited as such.

## Research file template (Russian)

1. **TL;DR** — 3–5 bullets.
2. **Факты** — each with a number, source link, date and confidence (high / med / low).
3. **Что не нашли** — gaps and the proxies used instead.
4. **Что это значит для гипотез** — implications for the bets.

## Repo layout

```
README.md              executive summary (RU) + links
00-brief/              assignment + vacancy page snapshot
01-research/           q1…q9 + synthesis.md
02-hypotheses/         backlog.md + prioritization.md
03-plan-100-days/      plan.md + bet-1-execution.md + bet-2.md
04-prototype/          code
docs/process/          process specs (whether to keep them visible is decided before hand-off)
```

## Out of scope for now

Prioritization framework, prototype stack and use of `dev-flow-template` — designed at their stages
using what the research finds.
