// Deterministic bank calculators. Every number on a «Первые деньги» screen comes from here.

/** Future value of equal monthly contributions with monthly compounding, rounded to the rouble. */
export function futureValue(monthly: number, months: number, annualRate: number): number {
  const r = annualRate / 12;
  return Math.round(r === 0 ? monthly * months : (monthly * ((1 + r) ** months - 1)) / r);
}

/** A savings account: a start sum plus a top-up at the end of every month, monthly capitalisation, rounded to the rouble. */
export function accountGrowth(start: number, topUp: number, months: number, annualRate: number) {
  let balance = start;
  for (let m = 0; m < months; m++) balance = balance * (1 + annualRate / 12) + topUp;
  const total = Math.round(balance);
  return { total, income: total - start - topUp * months };
}

/** A piggy bank: a share of every card purchase, put aside each month, rounded to the rouble. */
export function piggyTotal(monthlySpend: number, sharePct: number, months: number) {
  const monthly = Math.round((monthlySpend * sharePct) / 100);
  return { monthly, total: monthly * months };
}

export function monthsToTarget(target: number, monthly: number, annualRate: number, maxMonths = 600): number {
  for (let m = 1; m <= maxMonths; m++) if (futureValue(monthly, m, annualRate) >= target) return m;
  return maxMonths;
}

export function annuity(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12;
  const payment = r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
  return { payment: Math.round(payment), overpayment: Math.round(payment * months - principal) };
}

/** A term deposit: interest paid at the end of the term, no capitalisation, rounded to the rouble. */
export function depositIncome(amount: number, months: number, annualRate: number): number {
  return Math.round((amount * annualRate * months) / 12);
}

/** Cutting one category by cutPct %: roubles freed a month and, with a goal, how many months sooner it is reached. */
export function spendCut(amount: number, cutPct: number, goal: { target: number; monthly: number; rate: number } | null) {
  const saved = Math.round((amount * cutPct) / 100);
  const monthsSooner = goal ? monthsToTarget(goal.target, goal.monthly, goal.rate) - monthsToTarget(goal.target, goal.monthly + saved, goal.rate) : null;
  return { saved, monthsSooner };
}
