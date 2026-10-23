import { describe, expect, it } from 'vitest';
import { accountGrowth, annuity, futureValue, monthsToTarget, depositIncome, piggyTotal, spendCut } from '../src/calculators';

describe('calculators', () => {
  it('grows a savings account: a start sum plus a monthly top-up, monthly capitalisation', () => {
    expect(accountGrowth(30000, 5000, 12, 0.125)).toEqual({ total: 97532, income: 7532 });
    expect(accountGrowth(30000, 0, 1, 0)).toEqual({ total: 30000, income: 0 });
  });

  it('a piggy bank puts aside a share of every card purchase', () => {
    expect(piggyTotal(22800, 3, 6)).toEqual({ monthly: 684, total: 4104 });
    expect(piggyTotal(22800, 10, 12)).toEqual({ monthly: 2280, total: 27360 });
  });

  it('compounds monthly contributions', () => {
    expect(futureValue(10000, 12, 0.12)).toBe(126825);
    expect(futureValue(10000, 12, 0)).toBe(120000);
  });

  it('finds the months to a target', () => {
    expect(monthsToTarget(126825, 10000, 0.12)).toBe(12);
    expect(monthsToTarget(120000, 10000, 0)).toBe(12);
    expect(monthsToTarget(1e12, 1, 0, 50)).toBe(50);
  });

  it('computes an annuity payment and the overpayment', () => {
    expect(annuity(100000, 0.12, 12)).toEqual({ payment: 8885, overpayment: 6619 });
    expect(annuity(120000, 0, 12)).toEqual({ payment: 10000, overpayment: 0 });
    expect(annuity(900000, 0.22, 60)).toEqual({ payment: 24857, overpayment: 591421 });
  });

  it('pays deposit interest at the end of the term, without capitalisation', () => {
    expect(depositIncome(100000, 12, 0.13)).toBe(13000);
    expect(depositIncome(30000, 12, 0.115)).toBe(3450);
    expect(depositIncome(10000, 3, 0)).toBe(0);
  });
  it('turns a spending cut into roubles and months', () => {
    expect(spendCut(6400, 20, null)).toEqual({ saved: 1280, monthsSooner: null });
    expect(spendCut(6400, 20, { target: 1500000, monthly: 9000, rate: 0.14 })).toEqual({ saved: 1280, monthsSooner: 8 });
    expect(spendCut(3100, 10, { target: 90000, monthly: 9000, rate: 0.14 })).toEqual({ saved: 310, monthsSooner: 0 });
  });
});
