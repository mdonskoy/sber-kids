import type { GoalId, Role, WayId } from '@proto/catalog';
import { PRICES_PER_MTOK, type ScenarioRegistry } from '@proto/server';
import type { EvalArgs } from './args';

export interface EvalCase { model: string; role: Role; scenarioId: string; force: 'none' | 'injection_text'; rep: number; setup?: { goal: GoalId; target?: { amount: number; months: number }; way?: WayId }; userText?: string; expect?: string }

/** «Первые деньги» widget cases (spec: a widget is done when the model uses it correctly — valid on the first try and shown). */
const WIDGET_CASES: Pick<EvalCase, 'setup' | 'userText' | 'expect'>[] = [
  { expect: 'GoalSetup', setup: { goal: 'apartment' }, userText: 'Моя цель: Первый взнос на квартиру' },
  { expect: 'WaysToGoal', setup: { goal: 'apartment', target: { amount: 1500000, months: 36 } }, userText: '1 500 000 ₽ за 36 мес.' },
  { expect: 'DepositCalculator', setup: { goal: 'apartment', target: { amount: 1500000, months: 36 }, way: 'deposit' }, userText: 'Хочу посмотреть: Вклад' },
  { expect: 'SavingsAccountCalculator', setup: { goal: 'apartment', target: { amount: 1500000, months: 36 }, way: 'savings-account' }, userText: 'Хочу посмотреть: Накопительный счёт' },
  { expect: 'PiggyBankCalculator', setup: { goal: 'vacation', target: { amount: 80000, months: 6 }, way: 'piggy' }, userText: 'Хочу посмотреть: Копилка' },
  { expect: 'LoanCompare', setup: { goal: 'car', target: { amount: 600000, months: 12 }, way: 'loan' }, userText: 'Хочу посмотреть: Копить или взять кредит' },
  { expect: 'InvestSim', setup: { goal: 'apartment', target: { amount: 1500000, months: 36 }, way: 'invest' }, userText: 'Хочу посмотреть: Инвестиции' },
];

export function buildMatrix(args: EvalArgs, scenarios: ScenarioRegistry): EvalCase[] {
  const cases: EvalCase[] = [];
  for (let rep = 0; rep < args.n; rep++) {
    for (const model of args.models) {
      for (const role of args.roles) {
        const list = scenarios.list(role);
        if (args.widgets) {
          if (role === 'young-adult') for (const w of WIDGET_CASES) if (args.widgets.includes(w.expect!)) cases.push({ model, role, scenarioId: 'first-money-chat', force: 'none', rep, ...w });
          continue;
        }
        for (const s of list) cases.push({ model, role, scenarioId: s.id, force: 'none', rep });
        if (list[0]) cases.push({ model, role, scenarioId: list[0].id, force: 'injection_text', rep });
        if (role === 'young-adult') for (const w of WIDGET_CASES) cases.push({ model, role, scenarioId: 'first-money-chat', force: 'none', rep, ...w });
      }
    }
  }
  return cases;
}

// Assumed tokens per screen for the estimate only: cached system prompt, fresh user turn with the data model,
// output including adaptive thinking. Replace with measured means after the first run.
const ASSUMED = { cacheRead: 6000, input: 2000, output: 3000 };

export function estimateCostUsd(cases: EvalCase[]): number {
  return cases.reduce((sum, c) => {
    const p = PRICES_PER_MTOK[c.model];
    return sum + (p ? (ASSUMED.cacheRead * p.cacheRead + ASSUMED.input * p.input + ASSUMED.output * p.output) / 1e6 : 0);
  }, 0);
}
