import { describe, expect, it } from 'vitest';
import { DEPOSIT_DEFAULT, REALISTIC_AMOUNT, createStore, depositIncome, depositProduct, depositQuote, payoutLabel, pctText, rubText, setDepositCalc } from '../src';

describe('deposit tariffs', () => {
  it('starts at a realistic amount for Лиза: salary minus mandatory spending, rounded down to 5 000', () => {
    expect(REALISTIC_AMOUNT).toBe(30000);
    expect(DEPOSIT_DEFAULT).toEqual({ amount: 30000, months: 12 });
  });
  it('picks the tariff by amount and the rate by term', () => {
    expect(depositQuote(10000, 7)).toMatchObject({ tariffId: 'start', tariffName: 'Выгодный старт', rate: 0.105 });
    expect(depositQuote(30000, 12)).toMatchObject({ tariffName: 'Выгодный старт', rate: 0.115, income: 3450, payoutLabel: '23 октября 2027' });
    expect(depositQuote(100000, 6)).toMatchObject({ tariffId: 'sber', tariffName: 'СберВклад', rate: 0.12, income: 6000 });
    expect(depositQuote(150000, 18)).toMatchObject({ tariffName: 'СберВклад', rate: 0.135 });
  });
  it('hints how to earn more by term or amount only', () => {
    expect(depositQuote(30000, 12).hint).toEqual({ text: 'На 13 мес. ставка выше — 12,5%', apply: { amount: 30000, months: 13 } });
    expect(depositQuote(100000, 30).hint).toEqual({ text: 'На 13 мес. ставка выше — 13,5%', apply: { amount: 100000, months: 13 } });
    expect(depositQuote(30000, 18).hint.text).toMatch(/^От 100\s000\s₽ — СберВклад, до 13,5%$/);
    expect(depositQuote(30000, 18).hint.apply).toEqual({ amount: 100000, months: 18 });
    expect(depositQuote(150000, 18).hint).toEqual({ text: 'Это лучшая ставка для такой суммы', apply: null });
  });
  it('pays income at the end of the term, counted from the demo «today»', () => {
    expect(depositIncome(100000, 6, 0.12)).toBe(6000);
    expect(payoutLabel(3)).toBe('23 января 2027');
    expect(payoutLabel(12)).toBe('23 октября 2027');
  });
  it('formats server-built copy the bank way', () => {
    expect(rubText(100000)).toMatch(/^100\s000\s₽$/);
    expect(pctText(0.125)).toBe('12,5%');
    expect(pctText(0.13)).toBe('13%');
  });
  it('clamps the sliders to the bounds and the 1 000 ₽ step', () => {
    const s = createStore();
    setDepositCalc(s, 5000, 0);
    expect(s.youngAdult.deposit).toEqual({ amount: 10000, months: 1 });
    setDepositCalc(s, 123456, 40);
    expect(s.youngAdult.deposit).toEqual({ amount: 123000, months: 36 });
  });
  it('builds the confirmation record from what the calculator shows', () => {
    const s = createStore();
    setDepositCalc(s, 150000, 18);
    const p = depositProduct(s);
    expect(p).toMatchObject({ id: 'deposit', name: 'Вклад «СберВклад»', rate: 0.135 });
    expect(p.termsLines[0]).toMatch(/^Сумма — 150\s000\s₽$/);
    expect(p.termsLines[1]).toBe('Срок — 18 мес.');
    expect(p.termsLines[2]).toMatch(/^Доход — \+30\s375\s₽ к 23 апреля 2028$/);
    expect(p.ctaLabel).toMatch(/^Открыть на 150\s000\s₽$/);
  });
});
