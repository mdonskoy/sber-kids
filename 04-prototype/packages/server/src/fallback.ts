import type { Role, WayId } from '@proto/catalog';
import type { DataModel } from '@proto/mocks';
import type { Recipe, RecipeComponent } from './validate';

// The same data and catalog as the model uses, laid out by fixed rules.
// Shown when the model fails; also the few-shot example in the system prompt.

type Group = RecipeComponent[]; // the first element is the root-level child

export const HOME_SCENARIO = 'first-money-home';

function youngAdultGroups(dm: DataModel, scenarioId: string | undefined, waysReply: string): Group[] {
  if (scenarioId === HOME_SCENARIO) return [[{ id: 'banner', component: 'FirstMoneyBanner', banner: { path: '/banner' } }]];
  const reply = (text: string): Group => [{ id: 'reply', component: 'Text', text, variant: 'body' }];
  if (!dm.goal) return [reply('На что хочешь накопить? Выбери цель.'), [{ id: 'goals', component: 'GoalPicker', goals: { path: '/goals' } }]];
  const way = dm.pickedWay as WayId | null;
  const calculators: Record<WayId, Group> = {
    deposit: [{ id: 'calc', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }],
    'savings-account': [{ id: 'calc', component: 'SavingsAccountCalculator', account: { path: '/accountCalc' } }],
    piggy: [{ id: 'calc', component: 'PiggyBankCalculator', piggy: { path: '/piggyCalc' } }],
    spend: [{ id: 'calc', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }],
    loan: [{ id: 'calc', component: 'LoanCompare', loan: { path: '/loanCalc' } }],
    invest: [{ id: 'calc', component: 'InvestSim', invest: { path: '/investCalc' } }],
  };
  if (!(dm.goal as { set: boolean }).set) return [reply('Сколько нужно и к какому сроку? Выбери подходящий вариант или подвигай ползунки.'), [{ id: 'setup', component: 'GoalSetup', setup: { path: '/goalSetup' } }]];
  const replies: Group[] = dm.quickReplies ? [[{ id: 'replies', component: 'QuickReplies', replies: { path: '/quickReplies' } }]] : [];
  if (way && Object.hasOwn(calculators, way)) return [reply('Вот калькулятор. Подвигай ползунки — банк сразу пересчитает.'), calculators[way], ...replies];
  const ways = dm.ways as Record<'big' | 'small' | 'urgent', unknown[]> & { suggested: 'big' | 'small' | 'urgent' };
  const suggested = ways.suggested;
  if (ways[suggested].length === 0) return [reply(replies.length ? 'Всё из этого плана уже сделано. Можно посмотреть ещё:' : 'Всё из этого плана уже сделано.'), ...replies];
  return [
    reply(waysReply),
    [{ id: 'ways', component: 'WaysToGoal', ways: { path: '/ways' }, set: suggested }],
    ...replies,
  ];
}

function groupsFor(dm: DataModel, scenarioId: string | undefined, waysReply: string): Group[] {
  return youngAdultGroups(dm, scenarioId, waysReply);
}

/** `waysReply` replaces the reply above the ways to the goal («К плану» after a finished step). */
export function ruleBasedScreen(role: Role, dm: DataModel, opts: { notice: boolean; scenarioId?: string; waysReply?: string }): Recipe {
  // No greeting heading: the home slot is one card, and each chat turn is a reply.
  const head: RecipeComponent[] = [];
  if (opts.notice) head.push({ id: 'notice', component: 'Notice', text: 'Показываем главное. Подсказки обновятся чуть позже.', tone: 'info' });
  const groups = groupsFor(dm, opts.scenarioId, opts.waysReply ?? 'Вот варианты под твою цель. Выбери, с чего начать.');
  return {
    components: [
      { id: 'root', component: 'Column', children: [...head.map((c) => c.id), ...groups.map((g) => g[0].id)] },
      ...head,
      ...groups.flat(),
    ],
  };
}
