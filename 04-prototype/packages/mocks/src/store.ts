import type { GoalId, WayId } from '@proto/catalog';
import { ACCOUNT_BOUNDS, ACCOUNT_DEFAULT, DEFAULT_MONTHLY, DEMO_RATES, DEPOSIT_BOUNDS, DEPOSIT_DEFAULT, GOALS, GOAL_PRESETS, GOAL_SETUP_BOUNDS, INVEST_BOUNDS, INVEST_DEFAULT, LIZA, LOAN_BOUNDS, LOAN_FALLBACK, PIGGY_BOUNDS, PIGGY_DEFAULT, PRODUCTS, WAYS, SPEND, SPEND_CUT_BOUNDS, SPEND_CUT_DEFAULT, waySetFor, type WaySet } from './youngAdult';
import { annuity, monthsToTarget, spendCut } from './calculators';

export interface YoungAdultState { goalId: GoalId | null; goalTarget: { amount: number; months: number } | null; goalSet: boolean; monthly: number; pickedWay: WayId | null; history: string[]; openedProducts: string[]; inviteSent: boolean; deposit: { amount: number; months: number }; account: { topUp: number; months: number }; loan: { amount: number; months: number }; invest: { monthly: number; months: number }; piggy: { sharePct: number; months: number }; piggyOn: boolean; spendCut: { categoryId: string; cutPct: number } }
export interface Store { youngAdult: YoungAdultState }

export class ActionError extends Error {
  constructor(readonly code: 'not_found' | 'bad_state', message: string) {
    super(message);
  }
}

export function createStore(): Store {
  return {
    youngAdult: { goalId: null, goalTarget: null, goalSet: false, monthly: DEFAULT_MONTHLY, pickedWay: null, history: [], openedProducts: [], inviteSent: false, deposit: { ...DEPOSIT_DEFAULT }, account: { ...ACCOUNT_DEFAULT }, loan: { amount: LOAN_BOUNDS.amountMin, months: LOAN_FALLBACK.months }, invest: { ...INVEST_DEFAULT }, piggy: { ...PIGGY_DEFAULT }, piggyOn: false, spendCut: { ...SPEND_CUT_DEFAULT } },
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function selectGoal(store: Store, goalId: GoalId): void {
  if (!Object.hasOwn(GOALS, goalId)) throw new ActionError('not_found', `No goal ${goalId}`);
  const goal = GOALS[goalId];
  const ya = store.youngAdult;
  const preset = GOAL_PRESETS[goalId];
  ya.goalId = goalId;
  ya.goalTarget = { amount: preset.presets[preset.pick].amount, months: preset.months };
  ya.goalSet = false;
  ya.pickedWay = null;
  const b = LOAN_BOUNDS;
  ya.loan = { amount: clamp(ya.goalTarget.amount, b.amountMin, b.amountMax), months: clamp((goal.loan ?? LOAN_FALLBACK).months, b.monthsMin, b.monthsMax) };
}

/** The amount and term Лиза chose for the goal: they pick the ways, and the loan starts from the same amount. */
export function setGoalTarget(store: Store, amount: number, months: number): void {
  const ya = store.youngAdult;
  if (!ya.goalId) throw new ActionError('bad_state', 'The amount and term need a goal');
  if (!Number.isFinite(amount) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Goal values must be numbers');
  const b = GOAL_SETUP_BOUNDS;
  ya.goalTarget = { amount: clamp(Math.round(amount / b.amountStep) * b.amountStep, b.amountMin, b.amountMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
  ya.goalSet = true;
  ya.loan = { ...ya.loan, amount: clamp(ya.goalTarget.amount, LOAN_BOUNDS.amountMin, LOAN_BOUNDS.amountMax) };
}

/** The way set for the amount and term Лиза chose; null until she has set them. */
export function goalWaySet(store: Store): WaySet | null {
  const ya = store.youngAdult;
  return ya.goalSet && ya.goalTarget && ya.goalId ? waySetFor(ya.goalTarget.amount, ya.goalTarget.months, ya.goalId) : null;
}

export function pickWay(store: Store, wayId: string): void {
  if (!Object.hasOwn(WAYS, wayId)) throw new ActionError('not_found', `No way ${wayId}`);
  store.youngAdult.pickedWay = wayId as WayId;
}

export function setAccountCalc(store: Store, topUp: number, months: number): void {
  if (!Number.isFinite(topUp) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = ACCOUNT_BOUNDS;
  store.youngAdult.account = { topUp: clamp(Math.round(topUp / b.topUpStep) * b.topUpStep, b.topUpMin, b.topUpMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}

export function setLoanCalc(store: Store, amount: number, months: number): void {
  if (!Number.isFinite(amount) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = LOAN_BOUNDS;
  store.youngAdult.loan = { amount: clamp(Math.round(amount / b.amountStep) * b.amountStep, b.amountMin, b.amountMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}

/** The loan on the sliders for the goal, and how long saving its payment on the savings account takes. */
export function loanQuote(store: Store, goalId: GoalId) {
  const ya = store.youngAdult;
  const loan = GOALS[goalId].loan ?? LOAN_FALLBACK;
  const a = annuity(ya.loan.amount, loan.rate, ya.loan.months);
  return { loan, payment: a.payment, overpayment: a.overpayment, saveMonths: monthsToTarget(ya.loan.amount, a.payment, DEMO_RATES.savings), warn: a.payment > LIZA.salary / 3 };
}

/** The cut on the sliders: roubles freed a month and, with a goal, how many months sooner it is reached. */
export function spendCutQuote(store: Store) {
  const ya = store.youngAdult;
  const category = SPEND.find((c) => c.id === ya.spendCut.categoryId)!;
  const goal = ya.goalId && ya.goalTarget ? { target: ya.goalTarget.amount, monthly: ya.monthly, rate: DEMO_RATES.savings } : null;
  return spendCut(category.amount, ya.spendCut.cutPct, goal);
}

export function setInvestCalc(store: Store, monthly: number, months: number): void {
  if (!Number.isFinite(monthly) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = INVEST_BOUNDS;
  store.youngAdult.invest = { monthly: clamp(Math.round(monthly / b.monthlyStep) * b.monthlyStep, b.monthlyMin, b.monthlyMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}

export function setPiggyCalc(store: Store, sharePct: number, months: number): void {
  if (!Number.isFinite(sharePct) || !Number.isFinite(months)) throw new ActionError('bad_state', 'Calculator values must be numbers');
  const b = PIGGY_BOUNDS;
  store.youngAdult.piggy = { sharePct: clamp(Math.round(sharePct / b.shareStep) * b.shareStep, b.shareMin, b.shareMax), months: clamp(Math.round(months), b.monthsMin, b.monthsMax) };
}

export function enablePiggy(store: Store): void {
  store.youngAdult.piggyOn = true;
}

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

export function openProduct(store: Store, productId: string): void {
  if (!Object.hasOwn(PRODUCTS, productId)) throw new ActionError('not_found', `No product ${productId}`);
  store.youngAdult.openedProducts.push(productId);
}

export function sendInvite(store: Store): void {
  store.youngAdult.inviteSent = true;
}
