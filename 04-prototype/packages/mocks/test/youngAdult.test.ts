import { describe, expect, it } from 'vitest';
import {
  FirstMoneyBannerSchema,
  GoalOptionsSchema,
  InviteSchema,
  InvestCalcSchema,
  LoanCalcSchema,
  ProductSchema,
  WaysSchema,
  AccountCalcSchema,
  PiggyCalcSchema,
  DepositCalcSchema,
  SpendAnalyticsSchema,
  GoalSetupSchema,
} from '@proto/catalog';
import { ActionError, DEPOSIT_BOUNDS, PRODUCTS, buildDataModel, createStore, openProduct, pickWay, selectGoal, setAccountCalc, setDepositCalc, setInvestCalc, setLoanCalc, setPiggyCalc, setSpendCut, setGoalTarget, waySetFor, GOAL_PRESETS, GOAL_SETUP_BOUNDS, GOALS } from '../src';

const ya = (store = createStore()) => buildDataModel('young-adult', store, { clock: '10:00' }) as any;

describe('young adult data', () => {
  it('clamps the savings-account sliders and exposes the calculator', () => {
    const s = createStore();
    expect(AccountCalcSchema.parse(buildDataModel('young-adult', s, { clock: '10:05' }).accountCalc)).toMatchObject({
      productId: 'savings-account', rate: 0.125, start: 30000, topUp: 5000, months: 12, total: 97532, income: 7532, calculatedFor: { topUp: 5000, months: 12 },
    });
    setAccountCalc(s, 999999, 99);
    expect(s.youngAdult.account).toEqual({ topUp: 50000, months: 60 });
    setAccountCalc(s, 1500, 0.4);
    expect(s.youngAdult.account).toEqual({ topUp: 2000, months: 1 });
    expect(() => setAccountCalc(s, Number.NaN, 3)).toThrow(ActionError);
  });

  it('clamps the piggy-bank sliders and exposes the calculator', () => {
    const s = createStore();
    expect(PiggyCalcSchema.parse(buildDataModel('young-adult', s, { clock: '10:05' }).piggyCalc)).toMatchObject({ sharePct: 3, months: 6, monthlySpend: 22800, monthly: 684, total: 4104, calculatedFor: { sharePct: 3, months: 6 } });
    setPiggyCalc(s, 0, 40);
    expect(s.youngAdult.piggy).toEqual({ sharePct: 1, months: 12 });
    expect(() => setPiggyCalc(s, 3, Number.NaN)).toThrow(ActionError);
  });

  it('starts with the banner and the goal options, no plan yet', () => {
    const dm = ya();
    expect(FirstMoneyBannerSchema.parse(dm.banner).amount).toBe(45000);
    expect(GoalOptionsSchema.parse(dm.goals)).toHaveLength(5);
    expect([dm.goal, dm.loanCalc, dm.ways, dm.invite]).toEqual([null, null, null, null]);
    expect(dm.plans).toBeUndefined();
    expect(dm.pickedWay).toBeNull();
    expect(ProductSchema.parse(dm.products.savings).disclosure).toContain('Не является публичной офертой');
  });

  it('builds the goal records for a big goal', () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    const dm = ya(store);
    expect(SpendAnalyticsSchema.parse(dm.spendAnalytics).goalTitle).toBe(dm.goal.title);
    expect(InviteSchema.parse(dm.invite).relative).toBe('Маме');
  });

  it('compares a car loan with saving the same payment', () => {
    const s = createStore();
    selectGoal(s, 'car');
    setLoanCalc(s, 900000, 60); // car loan 22 %
    expect(LoanCalcSchema.parse(ya(s).loanCalc)).toMatchObject({
      goalTitle: 'Машина', rate: 0.22, psk: 0.22, amount: 900000, months: 60, payment: 24857, overpayment: 591421, saveMonths: 31, saveRate: 0.125,
      hint: { warn: true, text: 'Платёж больше трети зарплаты — банк может отказать' }, calculatedFor: { amount: 900000, months: 60 }, ctaLabel: 'Копить тем же платежом',
    });
  });

  it('starts the loan at the goal target and the loan term, or the consumer-loan fallback', () => {
    const s = createStore();
    selectGoal(s, 'apartment');
    expect(s.youngAdult.loan).toEqual({ amount: 1500000, months: 240 });
    selectGoal(s, 'cushion'); // no dedicated loan; the target is below the minimum
    expect(s.youngAdult.loan).toEqual({ amount: 100000, months: 36 });
    expect(ya(s).loanCalc).toMatchObject({ loanTitle: 'Потребительский кредит', rate: 0.25 });
  });

  it('clamps the loan and investment sliders', () => {
    const s = createStore();
    setLoanCalc(s, 50, 400);
    expect(s.youngAdult.loan).toEqual({ amount: 100000, months: 300 });
    expect(() => setLoanCalc(s, Number.NaN, 12)).toThrow(ActionError);
    setInvestCalc(s, 1500, 5);
    expect(s.youngAdult.invest).toEqual({ monthly: 2000, months: 12 });
    expect(() => setInvestCalc(s, 5000, Number.NaN)).toThrow(ActionError);
  });

  it('simulates investing as two named benchmarks with the warning, without a goal', () => {
    const inv = InvestCalcSchema.parse(ya().investCalc);
    expect(inv).toMatchObject({ monthly: 5000, months: 60, paid: 300000, calculatedFor: { monthly: 5000, months: 60 } });
    expect(inv.benchmarks.map((b) => b.total)).toEqual([387185, 481073]);
    expect(inv.warning).toBe('Это не прогноз и не рекомендация. Можно получить меньше, чем вложишь');
    expect(ProductSchema.parse(PRODUCTS['broker-account'])).toMatchObject({ id: 'broker-account', name: 'Брокерский счёт', rate: 0 });
    expect(PRODUCTS['broker-account'].termsLines.at(-1)).toBe('Остальные инструменты — после теста на знания');
  });

  it('offers ways that fit the goal, and records the way Лиза picks', () => {
    const s = createStore();
    selectGoal(s, 'apartment');
    const ways = WaysSchema.parse(ya(s).ways);
    expect(ways).toMatchObject({ title: 'Как копить на первый взнос', target: 1500000, suggested: 'big' });
    expect(ways.big.map((w) => w.id)).toEqual(['deposit', 'savings-account']);
    expect(ways.small.map((w) => w.id)).toEqual(['piggy', 'spend']);
    expect(ways.big[0].line).toBe('До 13,5% годовых, деньги лежат до конца срока');
    selectGoal(s, 'vacation');
    expect(WaysSchema.parse(ya(s).ways).suggested).toBe('small');
    pickWay(s, 'piggy');
    expect(ya(s).pickedWay).toBe('piggy');
    expect(() => pickWay(s, 'toString')).toThrow(ActionError);
    selectGoal(s, 'car');
    expect(ya(s).pickedWay).toBeNull(); // a new goal starts with no way picked
    expect(() => selectGoal(s, 'yacht' as any)).toThrow(ActionError);
  });

  it('rejects forged ids that only exist on the object prototype, without changing state', () => {
    const store = createStore();
    const before = structuredClone(store.youngAdult);
    expect(() => selectGoal(store, 'toString' as any)).toThrow(ActionError);
    expect(() => selectGoal(store, '__proto__' as any)).toThrow(ActionError);
    expect(() => openProduct(store, '__proto__')).toThrow(ActionError);
    expect(() => openProduct(store, 'toString')).toThrow(ActionError);
    expect(store.youngAdult).toEqual(before);
    openProduct(store, 'deposit');
    expect(store.youngAdult.openedProducts).toEqual(['deposit']);
  });

  it('clamps calculator input on the server', () => {
    const s = createStore();
    setDepositCalc(s, 999999999, 1);
    expect(s.youngAdult.deposit).toEqual({ amount: DEPOSIT_BOUNDS.amountMax, months: DEPOSIT_BOUNDS.monthsMin });
    setDepositCalc(s, 15000, 7.6);
    expect(s.youngAdult.deposit).toEqual({ amount: 15000, months: 8 });
    expect(() => setDepositCalc(s, Number.NaN, 12)).toThrow(ActionError);
    setSpendCut(s, 'taxi', 33);
    expect(s.youngAdult.spendCut).toEqual({ categoryId: 'taxi', cutPct: 35 });
    expect(() => setSpendCut(s, 'groceries', 20)).toThrow(ActionError); // not a category you can cut
    expect(() => setSpendCut(s, 'toString', 20)).toThrow(ActionError);
  });

  it('builds both calculators, with goal figures only once a goal is chosen', () => {
    const s = createStore();
    const before = ya(s);
    expect(DepositCalcSchema.parse(before.depositCalc)).toMatchObject({ tariffName: 'Выгодный старт', amount: 30000, months: 12, rate: 0.115, income: 3450, payoutLabel: '23 октября 2027', calculatedFor: { amount: 30000, months: 12 } });
    expect(SpendAnalyticsSchema.parse(before.spendAnalytics)).toMatchObject({ categoryId: 'delivery', cutPct: 20, saved: 1280, goalTitle: null, monthsSooner: null });
    selectGoal(s, 'apartment');
    const after = ya(s);
    expect(after.spendAnalytics).toMatchObject({ goalTitle: 'Первый взнос на квартиру', monthsSooner: expect.any(Number) });
    expect(after.spend).toBeUndefined();
  });

  it('picks the set of ways from the amount and the term, not the goal type', () => {
    expect(waySetFor(80000, 6)).toBe('small');
    expect(waySetFor(1500000, 36)).toBe('big');
    expect(waySetFor(600000, 12)).toBe('urgent');
    expect(waySetFor(150000, 3)).toBe('small');
  });

  it('education leads with the subsidised loan, with a way to a specialist', () => {
    expect(waySetFor(60000, 24, 'education')).toBe('urgent');
    expect(waySetFor(1500000, 36, 'apartment')).toBe('big');
    const s = createStore();
    selectGoal(s, 'education');
    setGoalTarget(s, 200000, 24);
    const dm = buildDataModel('young-adult', s, { clock: '10:05' }) as any;
    expect(dm.ways.suggested).toBe('urgent');
    expect(dm.loanCalc).toMatchObject({ rate: 0.03, handoffLabel: 'Узнать про образовательный кредит', hint: { text: 'Ставка с господдержкой ниже, чем доход на накопительном счёте' } });
    selectGoal(s, 'car');
    expect((buildDataModel('young-adult', s, { clock: '10:05' }) as any).loanCalc.handoffLabel).toBeNull();
  });

  it('starts a goal at its default preset, not yet set', () => {
    const s = createStore();
    expect(ya(s).goalSetup).toBeNull();
    selectGoal(s, 'vacation');
    const dm = ya(s);
    expect(GoalSetupSchema.parse(dm.goalSetup)).toMatchObject({ goalId: 'vacation', amount: 80000, months: 6, ...GOAL_SETUP_BOUNDS, ctaLabel: 'Дальше' });
    expect(dm.goalSetup.presets.map((p: any) => p.amount)).toEqual([40000, 80000, 150000]);
    expect(dm.goal).toMatchObject({ target: 80000, months: 6, set: false });
    expect(WaysSchema.parse(dm.ways)).toMatchObject({ target: 80000, months: 6, suggested: 'small' });
    for (const id of Object.keys(GOALS) as (keyof typeof GOALS)[]) expect(GOALS[id].target).toBe(GOAL_PRESETS[id].presets[GOAL_PRESETS[id].pick].amount);
    expect(GOALS.car.target).toBe(600000);
  });

  it('sets the amount and term: rounded, clamped, and the ways and the loan follow', () => {
    const s = createStore();
    expect(() => setGoalTarget(s, 100000, 6)).toThrow(ActionError);
    selectGoal(s, 'vacation');
    pickWay(s, 'piggy');
    setGoalTarget(s, 1500500, 70);
    expect(s.youngAdult.goalTarget).toEqual({ amount: 1501000, months: 60 });
    expect(s.youngAdult.goalSet).toBe(true);
    expect(s.youngAdult.loan.amount).toBe(1501000);
    const dm = ya(s);
    expect(dm.goal).toMatchObject({ target: 1501000, months: 60, set: true });
    expect(dm.ways.suggested).toBe('big');
    expect(() => setGoalTarget(s, Number.NaN, 6)).toThrow(ActionError);
    expect(s.youngAdult.goalTarget).toEqual({ amount: 1501000, months: 60 });
    selectGoal(s, 'car');
    expect(s.youngAdult).toMatchObject({ goalSet: false, pickedWay: null, goalTarget: { amount: 600000, months: 24 } });
  });

  it('offers four sets of ways, and lets Лиза pick the loan and investing', () => {
    const s = createStore();
    selectGoal(s, 'apartment');
    const ways = WaysSchema.parse(ya(s).ways);
    expect(ways.urgent.map((w) => w.id)).toEqual(['loan', 'savings-account']);
    expect(ways.risk.map((w) => w.id)).toEqual(['invest', 'deposit']);
    expect(ways.urgent[0]).toMatchObject({ name: 'Копить или взять кредит' });
    expect(ways.risk[0]).toMatchObject({ name: 'Инвестиции' });
    pickWay(s, 'loan');
    expect(s.youngAdult.pickedWay).toBe('loan');
    pickWay(s, 'invest');
    expect(s.youngAdult.pickedWay).toBe('invest');
  });
});
