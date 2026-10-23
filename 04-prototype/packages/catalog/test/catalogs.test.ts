import { describe, expect, it } from 'vitest';
import { ALL_COMPONENTS, CATALOGS, ROLES, toModelJsonSchema } from '../src';

const names = (role: (typeof ROLES)[number]) => CATALOGS[role].components.map((c) => c.name);

describe('role catalogs', () => {
  it('has one catalog, for the young adult', () => {
    expect(ROLES).toEqual(['young-adult']);
    expect(Object.keys(CATALOGS)).toEqual(['young-adult']);
  });

  it('keeps static-only components out of the model schema', () => {
    const branches = (toModelJsonSchema(CATALOGS['young-adult']) as any).properties.components.items.anyOf;
    const offered = branches.map((b: any) => b.properties.component.const);
    expect(offered).not.toContain('ConfirmOpenProduct');
    expect(offered).not.toContain('Done');
  });

  it('lists every component once in ALL_COMPONENTS', () => {
    expect(ALL_COMPONENTS.get('LoanCompare')?.props.loan.kind).toBe('bound');
    expect(ALL_COMPONENTS.has('PlanComparison')).toBe(false);
    expect(ALL_COMPONENTS.size).toBe(new Set(ROLES.flatMap(names)).size);
  });

  it('gives the young adult the «Первые деньги» components and keeps the product confirmation static', () => {
    expect(names('young-adult')).toEqual(expect.arrayContaining(['FirstMoneyBanner', 'GoalPicker', 'GoalSetup', 'WaysToGoal', 'SpendAnalytics', 'DepositCalculator', 'SavingsAccountCalculator', 'PiggyBankCalculator', 'LoanCompare', 'InvestSim', 'ProductCard', 'InviteRelative', 'QuickReplies']));
    expect(names('young-adult')).not.toContain('PlanComparison');
    expect(CATALOGS['young-adult'].components.find((c) => c.name === 'ConfirmOpenProduct')?.staticOnly).toBe(true);
    expect(CATALOGS['young-adult'].actions).toEqual(expect.arrayContaining(['chat.open', 'goal.select', 'way.pick', 'goal.setup', 'account.recalc', 'loan.recalc', 'loan.save', 'invest.recalc', 'invest.compare', 'piggy.recalc', 'piggy.enable', 'product.open', 'product.confirm', 'product.cancel', 'invite.send', 'nav.home', 'handoff.request', 'reply.pick', 'spend.save']));
  });
});
