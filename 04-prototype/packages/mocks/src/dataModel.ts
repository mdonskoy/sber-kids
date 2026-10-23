import type { Role } from '@proto/catalog';
import { accountGrowth, futureValue, piggyTotal } from './calculators';
import { depositQuote } from './deposit';
import { ACCOUNT_BOUNDS, ACCOUNT_NOTE, BANNER, DEMO_RATES, GOALS, GOAL_OPTIONS, GOAL_PRESETS, GOAL_SETUP_BOUNDS, HANDOFF, INVEST_BENCHMARKS, INVEST_BOUNDS, INVEST_NOTE, INVEST_WARNING, LIZA, LOAN_BOUNDS, LOAN_NOTE, NOT_ADVICE, PIGGY_BOUNDS, PIGGY_NOTE, PRODUCTS, QUICK_REPLIES, QUICK_REPLY_ORDER, REALISTIC_AMOUNT, REFUSALS_NOT_AVAILABLE, DEPOSIT_BOUNDS, SPEND, SPEND_CUT_BOUNDS, SPEND_TOTAL, WAYS, WAY_SETS, waySetFor } from './youngAdult';
import { goalWaySet, loanQuote, spendCutQuote, type Store } from './store';

export type DataModel = Record<string, unknown>;
export interface BuildOptions { clock: string }

export function buildDataModel(role: Role, store: Store, _opts: BuildOptions): DataModel {
  switch (role) {
    case 'young-adult':
      return youngAdultModel(store);
  }
}

/** The product a way opens; a way whose product is open is done. */
const OPENS: Partial<Record<string, string>> = { deposit: 'deposit', 'savings-account': 'savings-account', invest: 'broker-account' };

function youngAdultModel(store: Store): DataModel {
  const ya = store.youngAdult;
  const { amount, months: depositMonths } = ya.deposit;
  const q = depositQuote(amount, depositMonths);
  const cut = spendCutQuote(store);
  const base = {
    me: { name: LIZA.name, greeting: `Привет, ${LIZA.name}!` },
    banner: BANNER,
    goals: GOAL_OPTIONS,
    products: { savings: PRODUCTS['savings-account'], deposit: PRODUCTS.deposit },
    refusals: { notAvailable: REFUSALS_NOT_AVAILABLE, notAdvice: NOT_ADVICE },
    handoff: HANDOFF,
    pickedWay: ya.pickedWay,
    accountCalc: {
      productId: 'savings-account', name: PRODUCTS['savings-account'].name, rate: DEMO_RATES.savings, start: REALISTIC_AMOUNT,
      ...ya.account, ...ACCOUNT_BOUNDS, ...accountGrowth(REALISTIC_AMOUNT, ya.account.topUp, ya.account.months, DEMO_RATES.savings),
      calculatedFor: { ...ya.account },
      note: ACCOUNT_NOTE, disclosure: PRODUCTS['savings-account'].disclosure, ctaLabel: PRODUCTS['savings-account'].ctaLabel,
    },
    investCalc: {
      ...ya.invest, ...INVEST_BOUNDS,
      benchmarks: INVEST_BENCHMARKS.map((b) => ({ id: b.id, name: b.name, line: b.line, total: futureValue(ya.invest.monthly, ya.invest.months, b.rate) })),
      paid: ya.invest.monthly * ya.invest.months, warning: INVEST_WARNING, disclosure: INVEST_NOTE,
      calculatedFor: { ...ya.invest },
    },
    piggyCalc: {
      ...ya.piggy, ...PIGGY_BOUNDS, monthlySpend: SPEND_TOTAL, ...piggyTotal(SPEND_TOTAL, ya.piggy.sharePct, ya.piggy.months),
      calculatedFor: { ...ya.piggy }, note: PIGGY_NOTE, ctaLabel: 'Включить копилку',
    },
    depositCalc: {
      productId: 'deposit', tariffName: q.tariffName, conditions: q.conditions, rate: q.rate,
      amount, months: depositMonths, ...DEPOSIT_BOUNDS, income: q.income, payoutLabel: q.payoutLabel, hint: q.hint,
      calculatedFor: { amount, months: depositMonths },
      disclosure: PRODUCTS.deposit.disclosure,
    },
    spendAnalytics: {
      periodLabel: 'Октябрь', total: SPEND_TOTAL,
      categories: SPEND.map((c) => ({ id: c.id, name: c.name, accusative: c.accusative, amount: c.amount, share: Math.round((c.amount / SPEND_TOTAL) * 100), cuttable: c.discretionary })),
      ...ya.spendCut, ...SPEND_CUT_BOUNDS, saved: cut.saved,
      goalTitle: ya.goalId ? GOALS[ya.goalId].title : null, monthsSooner: cut.monthsSooner,
      calculatedFor: { ...ya.spendCut },
    },
  };
  if (!ya.goalId || !ya.goalTarget) return { ...base, goal: null, goalSetup: null, loanCalc: null, ways: null, invite: null, quickReplies: null };

  const goal = GOALS[ya.goalId];
  const target = ya.goalTarget;
  // A step already done drops out of the plan: an opened product, the piggy bank switched on, the invite sent (owner, 2026-10-23).
  const done = (id: string) => (id === 'piggy' ? ya.piggyOn : id === 'invite' ? ya.inviteSent : OPENS[id] !== undefined && ya.openedProducts.includes(OPENS[id]));
  const rows = (set: keyof typeof WAY_SETS) => WAY_SETS[set].filter((id) => !done(id)).map((id) => ({ id, ...WAYS[id] }));
  const lq = loanQuote(store, ya.goalId);
  const subsidised = !!goal.loan?.subsidised;
  const waySet = goalWaySet(store);
  // A reply that repeats what is on screen is left out: the picked way's own, or — before a way is picked — any way already in the offered list.
  const onScreen = (id: string) => (ya.pickedWay ? id === ya.pickedWay : waySet !== null && rows(waySet).some((r) => r.id === id));
  const replies = waySet ? QUICK_REPLY_ORDER[waySet].filter((id) => !onScreen(id) && !done(id)).slice(0, 3).map((id) => ({ id, text: QUICK_REPLIES[id] })) : [];
  const quickReplies = replies.length ? replies : null;
  return {
    ...base,
    goalSetup: { goalId: ya.goalId, title: goal.title, emoji: goal.emoji, presets: GOAL_PRESETS[ya.goalId].presets, ...target, ...GOAL_SETUP_BOUNDS, ctaLabel: 'Дальше' },
    goal: { id: ya.goalId, title: goal.title, emoji: goal.emoji, target: target.amount, months: target.months, set: ya.goalSet },
    loanCalc: {
      goalTitle: goal.title, loanTitle: lq.loan.title, rate: lq.loan.rate, psk: lq.loan.rate, // no fees in the mock: the full cost equals the rate
      ...ya.loan, ...LOAN_BOUNDS, payment: lq.payment, overpayment: lq.overpayment,
      saveMonths: lq.saveMonths, saveRate: DEMO_RATES.savings,
      hint: {
        text: lq.warn ? 'Платёж больше трети зарплаты — банк может отказать'
          : subsidised ? 'Ставка с господдержкой ниже, чем доход на накопительном счёте'
          : 'Чем короче срок, тем меньше переплата',
        warn: lq.warn,
      },
      calculatedFor: { ...ya.loan }, disclosure: LOAN_NOTE, ctaLabel: 'Копить тем же платежом',
      // A subsidised loan gets a way to a bank specialist; there is still no application in the chat (owner, 2026-10-23).
      handoffLabel: subsidised ? 'Узнать про образовательный кредит' : null,
    },
    ways: {
      title: `Как копить ${goal.saveFor}`, target: target.amount, months: target.months, suggested: waySetFor(target.amount, target.months, ya.goalId),
      big: rows('big'), small: rows('small'), urgent: rows('urgent'), risk: rows('risk'),
    },
    invite: { relative: 'Маме', goalTitle: goal.title, text: 'Мама сможет пополнять твою цель через Совместный счёт. Деньги останутся твоими.', ctaLabel: 'Пригласить маму' },
    quickReplies,
  };
}
