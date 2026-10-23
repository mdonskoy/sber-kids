import type { ReactComponentImplementation } from '@a2ui/react/v0_9';
import { Catalog } from '@a2ui/web_core/v0_9';
import { CATALOGS, type Role } from '@proto/catalog';
import {
  ConfirmOpenProductImpl,
  DepositCalculatorImpl,
  FirstMoneyBannerImpl,
  GoalPickerImpl,
  GoalSetupImpl,
  InvestSimImpl,
  InviteRelativeImpl,
  LoanCompareImpl,
  PiggyBankCalculatorImpl,
  ProductCardImpl,
  QuickRepliesImpl,
  SavingsAccountCalculatorImpl,
  SpendAnalyticsImpl,
  WaysToGoalImpl,
} from './firstMoney';
import { DoneImpl } from './money';
import { ColumnImpl, EmptyStateImpl, HandoffImpl, NoticeImpl, RefusalImpl, SectionImpl, TextImpl } from './primitives';

const IMPLS: Record<string, ReactComponentImplementation> = {
  Column: ColumnImpl,
  Section: SectionImpl,
  Text: TextImpl,
  Notice: NoticeImpl,
  EmptyState: EmptyStateImpl,
  Refusal: RefusalImpl,
  Handoff: HandoffImpl,
  Done: DoneImpl,
  FirstMoneyBanner: FirstMoneyBannerImpl,
  GoalPicker: GoalPickerImpl,
  GoalSetup: GoalSetupImpl,
  WaysToGoal: WaysToGoalImpl,
  SpendAnalytics: SpendAnalyticsImpl,
  DepositCalculator: DepositCalculatorImpl,
  SavingsAccountCalculator: SavingsAccountCalculatorImpl,
  PiggyBankCalculator: PiggyBankCalculatorImpl,
  LoanCompare: LoanCompareImpl,
  InvestSim: InvestSimImpl,
  ProductCard: ProductCardImpl,
  InviteRelative: InviteRelativeImpl,
  QuickReplies: QuickRepliesImpl,
  ConfirmOpenProduct: ConfirmOpenProductImpl,
};

export const IMPLEMENTED: ReadonlySet<string> = new Set(Object.keys(IMPLS));

/** The React catalog for one role: exactly that role's components, under the same catalog id the server uses. */
export function reactCatalog(role: Role) {
  const def = CATALOGS[role];
  const impls = def.components.map((c) => {
    const impl = IMPLS[c.name];
    if (!impl) throw new Error(`No React implementation for ${c.name}`);
    return impl;
  });
  return new Catalog(def.id, 'v0.9', impls, []);
}
