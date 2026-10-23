import { z } from 'zod';
import type { ComponentDef } from './define';
import { DoneDef } from './components/money';
import {
  ConfirmOpenProductDef,
  DepositCalculatorDef,
  SavingsAccountCalculatorDef,
  PiggyBankCalculatorDef,
  FirstMoneyBannerDef,
  GoalPickerDef,
  GoalSetupDef,
  InvestSimDef,
  InviteRelativeDef,
  LoanCompareDef,
  ProductCardDef,
  QuickRepliesDef,
  SpendAnalyticsDef,
  WaysToGoalDef,
} from './components/firstMoney';
import {
  ColumnDef,
  EmptyStateDef,
  HandoffDef,
  NoticeDef,
  RefusalDef,
  SectionDef,
  TextDef,
} from './components/primitives';

export const ROLES = ['young-adult'] as const;
export type Role = (typeof ROLES)[number];
export const RoleSchema = z.enum(ROLES);

export interface CatalogDef {
  id: string;
  role: Role;
  title: string;
  components: readonly ComponentDef[];
  actions: readonly string[];
}

const BASE = [ColumnDef, SectionDef, TextDef, NoticeDef, EmptyStateDef, RefusalDef, HandoffDef];

export const CATALOGS: Record<Role, CatalogDef> = {
  'young-adult': {
    id: 'urn:sber-kids:catalog:young-adult:v1',
    role: 'young-adult',
    title: '18–24, первые деньги, СБОЛ',
    components: [
      ...BASE,
      FirstMoneyBannerDef,
      GoalPickerDef,
  GoalSetupDef,
      WaysToGoalDef,
      SpendAnalyticsDef,
      DepositCalculatorDef,
      SavingsAccountCalculatorDef,
      PiggyBankCalculatorDef,
      LoanCompareDef,
      InvestSimDef,
      ProductCardDef,
      InviteRelativeDef,
      QuickRepliesDef,
      ConfirmOpenProductDef,
      DoneDef,
    ],
    actions: ['chat.open', 'goal.select', 'goal.setup', 'way.pick', 'deposit.recalc', 'account.recalc', 'loan.recalc', 'loan.save', 'invest.recalc', 'invest.compare', 'piggy.recalc', 'piggy.enable', 'spend.recalc', 'spend.save', 'reply.pick', 'product.open', 'product.confirm', 'product.cancel', 'invite.send', 'nav.home', 'handoff.request'],
  },
};

export const ALL_COMPONENTS: ReadonlyMap<string, ComponentDef> = new Map(
  Object.values(CATALOGS).flatMap((catalog) => catalog.components.map((c) => [c.name, c] as const)),
);
