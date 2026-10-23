import { PRODUCTS, buildDataModel, createStore, selectGoal, setDepositCalc, setGoalTarget, setLoanCalc } from '@proto/mocks';

export interface ShowcaseCase {
  component: string;
  variant: 'normal' | 'long-text' | 'no-data';
  components: unknown[];
  data: unknown;
  /** What the case shows when a component has more than one normal case. */
  note?: string;
}

const clock = { clock: '10:05' };
const noGoal = buildDataModel('young-adult', createStore(), clock);
const withGoal = (() => {
  const store = createStore();
  selectGoal(store, 'apartment');
  setGoalTarget(store, 1500000, 36);
  return buildDataModel('young-adult', store, clock);
})();
const urgentCar = (() => {
  const s = createStore();
  selectGoal(s, 'car');
  setGoalTarget(s, 600000, 12);
  return buildDataModel('young-adult', s, clock);
})();
const carLoan = (() => {
  const s = createStore();
  selectGoal(s, 'car');
  setLoanCalc(s, 900000, 60);
  return buildDataModel('young-adult', s, clock);
})();
const sberDeposit = (() => {
  const s = createStore();
  setDepositCalc(s, 150000, 18);
  return buildDataModel('young-adult', s, clock);
})();
// Static screens carry their data in code on the server; these are the same records.
const statics = {
  static: {
    product: PRODUCTS.deposit,
    done: { title: 'Готово', text: 'Вклад открыт.', backLabel: 'К плану' },
    doneFailed: { title: 'Не получилось', text: 'Это уже сделано или устарело. Вернись к плану.', backLabel: 'К плану' },
  },
};
const data = (base: Record<string, unknown>) => ({ ...base, ...statics });

/** Three times each Russian string, so a long label shows how the widget wraps; numbers, ids and keys stay. */
function tripled(value: unknown): unknown {
  if (typeof value === 'string') return /[А-Яа-яЁё]/.test(value) ? `${value} ${value} ${value}` : value;
  if (Array.isArray(value)) return value.map(tripled);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tripled(v)]));
  return value;
}

/** A Column root holding one widget (plus optional extra components). */
const recipe = (component: string, props: Record<string, unknown>, extra: unknown[] = [], children = ['w']) => [
  { id: 'root', component: 'Column', children },
  { id: 'w', component, ...props },
  ...extra,
];
const path = (p: string) => ({ path: p });
const textChild = (id: string, text: string) => ({ id, component: 'Text', text, variant: 'body' });

/** One widget bound to one data path, with the property name the catalog def uses. */
const bound = (component: string, prop: string, p: string) => recipe(component, { [prop]: path(p) });

export function showcaseCases(): ShowcaseCase[] {
  const normal = (component: string, components: unknown[], d: unknown = noGoal, note?: string): ShowcaseCase => ({ component, variant: 'normal', components, data: d, note });
  const longText = (component: string, components: unknown[], d: Record<string, unknown>): ShowcaseCase => ({ component, variant: 'long-text', components, data: tripled(d) });
  const noData = (component: string, components: unknown[]): ShowcaseCase => ({ component, variant: 'no-data', components, data: noGoal });

  const banner = bound('FirstMoneyBanner', 'banner', '/banner');
  const product = bound('ProductCard', 'product', '/products/savings');
  const confirm = bound('ConfirmOpenProduct', 'product', '/static/product');
  const spend = bound('SpendAnalytics', 'spend', '/spendAnalytics');
  const loan = bound('LoanCompare', 'loan', '/loanCalc');
  const invite = bound('InviteRelative', 'invite', '/invite');
  const sentence = 'Вот план под твою цель.';

  return [
    normal('Column', recipe('Column', { children: ['t'] }, [textChild('t', 'Вот план под твою цель.')], ['w'])),
    normal('Section', recipe('Section', { title: 'Мои цели', children: ['t'] }, [textChild('t', 'Вот план под твою цель.')])),
    normal('Text', recipe('Text', { text: sentence, variant: 'body' })),
    { component: 'Text', variant: 'long-text', components: recipe('Text', { text: tripled(sentence), variant: 'body' }), data: noGoal },
    normal('Notice', recipe('Notice', { text: 'Показываем главное. Подсказки обновятся чуть позже.', tone: 'info' })),
    normal('Notice', recipe('Notice', { text: 'Не получилось обновить. Попробуй ещё раз.', tone: 'warning' }), noGoal, 'предупреждение'),
    normal('EmptyState', recipe('EmptyState', { title: 'Пока пусто', hint: 'Здесь появятся твои цели' })),
    normal('Refusal', bound('Refusal', 'refusal', '/refusals/notAdvice')),
    normal('Handoff', bound('Handoff', 'handoff', '/handoff')),
    normal('Done', bound('Done', 'done', '/static/done'), data(noGoal)),
    normal('Done', bound('Done', 'done', '/static/doneFailed'), data(noGoal), 'действие не удалось'),
    normal('FirstMoneyBanner', banner),
    longText('FirstMoneyBanner', banner, noGoal),
    normal('GoalPicker', bound('GoalPicker', 'goals', '/goals')),
    normal('GoalSetup', bound('GoalSetup', 'setup', '/goalSetup'), withGoal),
    longText('GoalSetup', bound('GoalSetup', 'setup', '/goalSetup'), withGoal),
    noData('GoalSetup', bound('GoalSetup', 'setup', '/goalSetup')),
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'big' }), withGoal, 'большая цель'),
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'small' }), withGoal, 'маленькая или скорая цель'),
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'urgent' }), urgentCar, 'скорая цель: кредит или накопления'),
    normal('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'risk' }), withGoal, 'готова к риску'),
    noData('WaysToGoal', recipe('WaysToGoal', { ways: path('/ways'), set: 'big' })),
    normal('SpendAnalytics', spend, withGoal),
    longText('SpendAnalytics', spend, withGoal),
    normal('DepositCalculator', bound('DepositCalculator', 'deposit', '/depositCalc')),
    normal('DepositCalculator', bound('DepositCalculator', 'deposit', '/depositCalc'), sberDeposit, 'СберВклад от 100 000 ₽'),
    normal('SavingsAccountCalculator', bound('SavingsAccountCalculator', 'account', '/accountCalc')),
    normal('PiggyBankCalculator', bound('PiggyBankCalculator', 'piggy', '/piggyCalc')),
    normal('LoanCompare', loan, carLoan, 'автокредит, платёж больше трети зарплаты'),
    normal('LoanCompare', loan, withGoal, 'первый взнос — та же сумма в кредит'),
    noData('LoanCompare', loan),
    normal('InvestSim', bound('InvestSim', 'invest', '/investCalc')),
    normal('ProductCard', product),
    longText('ProductCard', product, noGoal),
    normal('InviteRelative', invite, withGoal),
    normal('QuickReplies', bound('QuickReplies', 'replies', '/quickReplies'), withGoal),
    noData('QuickReplies', bound('QuickReplies', 'replies', '/quickReplies')),
    noData('InviteRelative', invite),
    normal('ConfirmOpenProduct', confirm, data(noGoal)),
    longText('ConfirmOpenProduct', confirm, data(noGoal)),
  ];
}
