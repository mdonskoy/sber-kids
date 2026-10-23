import type { FirstMoneyBanner, GoalId, GoalOption, Handoff, Product, QuickReplyId, Refusal, WayId } from '@proto/catalog';
import { pctText } from './format';

// Лиза, 19, first salary on a youth card. Rates are fixed backend constants, shown like a bank shows its rates.

export const LIZA = { name: 'Лиза', age: 19, salary: 45000 };
export const DEMO_RATES = { savings: 0.125, deposit: 0.135 };
export const DEFAULT_MONTHLY = 9000; // 20 % of the salary

export const GOAL_SETUP_BOUNDS = { amountMin: 10000, amountMax: 5000000, amountStep: 1000, monthsMin: 1, monthsMax: 60 };
/** Three price points per goal «на любой карман»; `pick` is the default, `months` the default term. */
export const GOAL_PRESETS: Record<GoalId, { presets: { name: string; amount: number }[]; pick: number; months: number }> = {
  cushion: { presets: [{ name: 'На месяц', amount: 30000 }, { name: 'На три месяца', amount: 90000 }, { name: 'На полгода', amount: 180000 }], pick: 1, months: 12 },
  vacation: { presets: [{ name: 'Россия', amount: 40000 }, { name: 'Турция', amount: 80000 }, { name: 'Азия', amount: 150000 }], pick: 1, months: 6 },
  apartment: { presets: [{ name: 'Студия', amount: 900000 }, { name: 'Однушка', amount: 1500000 }, { name: 'Двушка', amount: 2400000 }], pick: 1, months: 36 },
  car: { presets: [{ name: 'С пробегом', amount: 600000 }, { name: 'Новая', amount: 1500000 }, { name: 'Кроссовер', amount: 2500000 }], pick: 0, months: 24 },
  education: { presets: [{ name: 'Курсы', amount: 60000 }, { name: 'Колледж', amount: 200000 }, { name: 'Вуз, год', amount: 400000 }], pick: 1, months: 24 },
};
const presetAmount = (id: GoalId) => GOAL_PRESETS[id].presets[GOAL_PRESETS[id].pick].amount;

export const GOALS: Record<GoalId, { title: string; emoji: string; target: number; saveFor: string; loan: { title: string; rate: number; months: number; subsidised?: boolean } | null }> = {
  cushion: { title: 'Подушка безопасности', emoji: '🛟', target: presetAmount('cushion'), saveFor: 'на подушку безопасности', loan: null },
  vacation: { title: 'Отпуск', emoji: '🏖', target: presetAmount('vacation'), saveFor: 'на отпуск', loan: null },
  apartment: { title: 'Первый взнос на квартиру', emoji: '🏠', target: presetAmount('apartment'), saveFor: 'на первый взнос', loan: { title: 'Взять ту же сумму в кредит сейчас', rate: 0.18, months: 240 } },
  car: { title: 'Машина', emoji: '🚗', target: presetAmount('car'), saveFor: 'на машину', loan: { title: 'Автокредит сейчас', rate: 0.22, months: 60 } },
  education: { title: 'Учёба', emoji: '🎓', target: presetAmount('education'), saveFor: 'на учёбу', loan: { title: 'Образовательный кредит с господдержкой', rate: 0.03, months: 120, subsidised: true } },
};
export type WaySet = 'big' | 'small' | 'urgent' | 'risk';
/**
 * The amount and term pick the ways, not the goal type: small → piggy and spending; urgent → loan vs save; else deposit and account.
 * One exception (owner, 2026-10-23): a goal with a subsidised loan (education) always leads with the loan comparison.
 */
export const waySetFor = (amount: number, months: number, goalId?: GoalId): 'big' | 'small' | 'urgent' =>
  goalId && GOALS[goalId].loan?.subsidised ? 'urgent' : amount <= 150000 ? 'small' : months <= 12 ? 'urgent' : 'big';
export const WAYS: Record<WayId, { name: string; line: string }> = {
  deposit: { name: 'Вклад', line: `До ${pctText(DEMO_RATES.deposit)} годовых, деньги лежат до конца срока` },
  'savings-account': { name: 'Накопительный счёт', line: `${pctText(DEMO_RATES.savings)} годовых, снимай в любой момент` },
  piggy: { name: 'Копилка', line: 'Откладывает процент с каждой покупки' },
  spend: { name: 'Сэкономить на тратах', line: 'Посмотрим, что можно сократить без боли' },
  loan: { name: 'Копить или взять кредит', line: 'Сравним платёж по кредиту со временем накопления' },
  invest: { name: 'Инвестиции', line: 'Два ориентира и диапазон, без обещаний' },
};
export const WAY_SETS: Record<WaySet, readonly WayId[]> = { big: ['deposit', 'savings-account'], small: ['piggy', 'spend'], urgent: ['loan', 'savings-account'], risk: ['invest', 'deposit'] };
/** Follow-ups under the latest answer; a tap sends the text as Лиза's message. */
export const QUICK_REPLIES = { loan: 'Сравнить с кредитом', invest: 'А если инвестировать?', invite: 'Копить вместе с мамой', spend: 'Как сэкономить на тратах?' } as const satisfies Record<QuickReplyId, string>;
/** Cutting spending is the first lever for a small goal and a later one for a big goal; a small goal gets no loan. */
export const QUICK_REPLY_ORDER: Record<WaySet, readonly QuickReplyId[]> = {
  small: ['spend', 'invite', 'invest'],
  big: ['loan', 'invest', 'spend', 'invite'],
  urgent: ['loan', 'invest', 'spend', 'invite'],
  risk: ['loan', 'invest', 'spend', 'invite'],
};
export const GOAL_OPTIONS: GoalOption[] = (Object.keys(GOALS) as GoalId[]).map((id) => ({ id, title: GOALS[id].title, emoji: GOALS[id].emoji }));

export const BANNER: FirstMoneyBanner = {
  title: 'Первая зарплата',
  lead: 'Хочешь сохранить и приумножить?',
  amount: LIZA.salary,
  ctaLabel: 'Составить план',
};

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

const DISCLOSURE = 'Не является публичной офертой. Условия, ставки и тарифы — в документах продукта на сайте банка.';
export const PRODUCTS: Record<'savings-account' | 'deposit' | 'broker-account', Product> = {
  'savings-account': {
    id: 'savings-account',
    name: 'Накопительный счёт',
    rate: DEMO_RATES.savings,
    termsLines: ['Пополнять и снимать — в любой момент', 'Проценты начисляются каждый месяц'],
    disclosure: DISCLOSURE,
    ctaLabel: 'Открыть счёт',
  },
  deposit: {
    id: 'deposit',
    name: 'Вклад',
    rate: DEMO_RATES.deposit,
    termsLines: ['Срок — от одного месяца до трёх лет', 'Снять раньше срока без потери процентов нельзя'],
    disclosure: DISCLOSURE,
    ctaLabel: 'Открыть вклад',
  },
  'broker-account': {
    id: 'broker-account',
    name: 'Брокерский счёт',
    rate: 0,
    termsLines: ['Открыть — бесплатно, комиссии — по тарифу брокера', 'Пополнить — с карты в любой момент', 'Доход не гарантирован — можно получить меньше, чем вложишь', 'Остальные инструменты — после теста на знания'],
    disclosure: INVEST_NOTE,
    ctaLabel: 'Открыть брокерский счёт',
  },
};

export const SPEND = [
  { id: 'groceries', name: 'Продукты', accusative: 'продукты', amount: 9800, discretionary: false },
  { id: 'delivery', name: 'Доставка еды', accusative: 'доставку еды', amount: 6400, discretionary: true },
  { id: 'taxi', name: 'Такси', accusative: 'такси', amount: 3100, discretionary: true },
  { id: 'transport', name: 'Транспорт', accusative: 'транспорт', amount: 2300, discretionary: false },
  { id: 'subscriptions', name: 'Подписки', accusative: 'подписки', amount: 1200, discretionary: true },
];

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
  { id: 'start', name: 'Выгодный старт', minAmount: 10000, conditions: 'от 10 000 ₽, от 1 месяца · без пополнения и снятия, доход в конце срока', rates: [0.09, 0.1, 0.105, 0.115, 0.125, 0.11] },
  { id: 'sber', name: 'СберВклад', minAmount: 100000, conditions: 'от 100 000 ₽, от 1 месяца · без пополнения и снятия, доход в конце срока', rates: [0.1, 0.11, 0.12, 0.13, 0.135, 0.12] },
];

export const DEPOSIT_BOUNDS = { amountMin: 10000, amountMax: 500000, amountStep: 1000, monthsMin: 1, monthsMax: 36 };
export const DEPOSIT_DEFAULT = { amount: REALISTIC_AMOUNT, months: 12 };
export const SPEND_CUT_BOUNDS = { cutMin: 5, cutMax: 50, cutStep: 5 };
export const SPEND_CUT_DEFAULT = { categoryId: 'delivery', cutPct: 20 };

export const NOT_ADVICE: Refusal = {
  code: 'not_advice',
  reason: 'Мы не обещаем доходность и не даём персональных инвестиционных рекомендаций.',
  nextStep: 'Можем показать симуляцию по двум ориентирам — без обещаний.',
  nextAction: 'nav.home',
  nextLabel: 'Вернуться к плану',
};

export const REFUSALS_NOT_AVAILABLE: Refusal = {
  code: 'not_available',
  reason: 'Этого в приложении сейчас нет.',
  nextStep: 'Специалист банка поможет в чате.',
  nextAction: 'handoff.request',
  nextLabel: 'Написать специалисту',
};

export const HANDOFF: Handoff = {
  title: 'Нужна помощь человека?',
  text: 'Продолжим с сотрудником банка в чате поддержки.',
  ctaLabel: 'Позвать специалиста',
};

export const ACCOUNT_BOUNDS = { topUpMin: 0, topUpMax: 50000, topUpStep: 1000, monthsMin: 1, monthsMax: 60 };
export const ACCOUNT_DEFAULT = { topUp: 5000, months: 12 };
export const ACCOUNT_NOTE = 'Снять можно в любой момент — проценты за прошлые месяцы останутся';

export const PIGGY_BOUNDS = { shareMin: 1, shareMax: 10, shareStep: 1, monthsMin: 1, monthsMax: 12 };
export const PIGGY_DEFAULT = { sharePct: 3, months: 6 };
export const PIGGY_NOTE = 'Выключить можно в любой момент, отложенное останется твоим';
