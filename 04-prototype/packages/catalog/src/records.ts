import { z } from 'zod';

// Shapes of the values the server puts into the data model. The validator checks
// that every bound prop points at a value of the right shape.

export const RefusalSchema = z.object({
  code: z.string(),
  reason: z.string(),
  nextStep: z.string(),
  nextAction: z.enum(['handoff.request', 'nav.home']),
  nextLabel: z.string(),
});
export const HandoffSchema = z.object({ title: z.string(), text: z.string(), ctaLabel: z.string() });
export const DoneSchema = z.object({ title: z.string(), text: z.string(), backLabel: z.string() });

export type Refusal = z.infer<typeof RefusalSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type Done = z.infer<typeof DoneSchema>;

// Bet 2 «Первые деньги».

export const GOAL_IDS = ['cushion', 'vacation', 'apartment', 'car', 'education'] as const;
export type GoalId = (typeof GOAL_IDS)[number];

export const FirstMoneyBannerSchema = z.object({ title: z.string(), lead: z.string(), amount: z.number(), ctaLabel: z.string() });
export const GoalOptionsSchema = z.array(z.object({ id: z.enum(GOAL_IDS), title: z.string(), emoji: z.string() })).min(1);
export const PiggyCalcSchema = z.object({
  sharePct: z.number(),
  months: z.number(),
  shareMin: z.number(),
  shareMax: z.number(),
  shareStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  monthlySpend: z.number(),
  monthly: z.number(),
  total: z.number(),
  calculatedFor: z.object({ sharePct: z.number(), months: z.number() }),
  note: z.string(),
  ctaLabel: z.string(),
});
export const AccountCalcSchema = z.object({
  productId: z.literal('savings-account'),
  name: z.string(),
  rate: z.number(),
  start: z.number(),
  topUp: z.number(),
  months: z.number(),
  topUpMin: z.number(),
  topUpMax: z.number(),
  topUpStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  total: z.number(),
  income: z.number(),
  calculatedFor: z.object({ topUp: z.number(), months: z.number() }),
  note: z.string(),
  disclosure: z.string(),
  ctaLabel: z.string(),
});

export const LoanCalcSchema = z.object({
  goalTitle: z.string(),
  loanTitle: z.string(),
  rate: z.number(),
  /** The full cost of the loan; equals the rate while the mock has no fees. */
  psk: z.number(),
  amount: z.number(),
  months: z.number(),
  amountMin: z.number(),
  amountMax: z.number(),
  amountStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  payment: z.number(),
  overpayment: z.number(),
  /** Months to the same sum on the savings account, topping it up by the payment. */
  saveMonths: z.number(),
  saveRate: z.number(),
  hint: z.object({ text: z.string(), warn: z.boolean() }),
  /** Set only for a subsidised loan: a secondary button to a bank specialist. */
  handoffLabel: z.string().nullable(),
  calculatedFor: z.object({ amount: z.number(), months: z.number() }),
  disclosure: z.string(),
  ctaLabel: z.string(),
});
export const InvestCalcSchema = z.object({
  monthly: z.number(),
  months: z.number(),
  monthlyMin: z.number(),
  monthlyMax: z.number(),
  monthlyStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  benchmarks: z.array(z.object({ id: z.string(), name: z.string(), line: z.string(), total: z.number() })).min(1),
  paid: z.number(),
  warning: z.string(),
  disclosure: z.string(),
  calculatedFor: z.object({ monthly: z.number(), months: z.number() }),
});

export const DepositCalcSchema = z.object({
  productId: z.literal('deposit'),
  tariffName: z.string(),
  conditions: z.string(),
  rate: z.number(),
  amount: z.number(),
  months: z.number(),
  amountMin: z.number(),
  amountMax: z.number(),
  amountStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  income: z.number(),
  payoutLabel: z.string(),
  /** How to earn more; `apply` is the slider position the hint moves to. */
  hint: z.object({ text: z.string(), apply: z.object({ amount: z.number(), months: z.number() }).nullable() }),
  /** The inputs the figures were calculated for. The browser shows the figures as current only while its sliders equal these. */
  calculatedFor: z.object({ amount: z.number(), months: z.number() }),
  disclosure: z.string(),
});
export const SpendAnalyticsSchema = z.object({
  periodLabel: z.string(),
  total: z.number(),
  categories: z.array(z.object({ id: z.string(), name: z.string(), accusative: z.string(), amount: z.number(), share: z.number(), cuttable: z.boolean() })).min(1),
  categoryId: z.string(),
  cutPct: z.number(),
  cutMin: z.number(),
  cutMax: z.number(),
  cutStep: z.number(),
  saved: z.number(),
  goalTitle: z.string().nullable(),
  monthsSooner: z.number().nullable(),
  calculatedFor: z.object({ categoryId: z.string(), cutPct: z.number() }),
});
export const ProductSchema = z.object({
  id: z.enum(['savings-account', 'deposit', 'broker-account']),
  name: z.string(),
  rate: z.number(),
  termsLines: z.array(z.string()),
  disclosure: z.string(),
  ctaLabel: z.string(),
});
export const WAY_IDS = ['deposit', 'savings-account', 'piggy', 'spend', 'loan', 'invest'] as const;
export type WayId = (typeof WAY_IDS)[number];
export const WAY_SETS_IDS = ['big', 'small', 'urgent', 'risk'] as const;
const WayRowSchema = z.object({ id: z.enum(WAY_IDS), name: z.string(), line: z.string() });
export const WaysSchema = z.object({
  title: z.string(),
  target: z.number(),
  months: z.number(),
  /** The default set for the chosen amount and term. */
  suggested: z.enum(WAY_SETS_IDS),
  big: z.array(WayRowSchema), // empty once every way in the set is done
  small: z.array(WayRowSchema), // empty once every way in the set is done
  urgent: z.array(WayRowSchema), // empty once every way in the set is done
  risk: z.array(WayRowSchema), // empty once every way in the set is done
});
export const GoalSetupSchema = z.object({
  goalId: z.enum(GOAL_IDS),
  title: z.string(),
  emoji: z.string(),
  presets: z.array(z.object({ name: z.string(), amount: z.number() })).min(1),
  amount: z.number(),
  months: z.number(),
  amountMin: z.number(),
  amountMax: z.number(),
  amountStep: z.number(),
  monthsMin: z.number(),
  monthsMax: z.number(),
  ctaLabel: z.string(),
});
export const QUICK_REPLY_IDS = ['loan', 'invest', 'invite', 'spend'] as const;
export type QuickReplyId = (typeof QUICK_REPLY_IDS)[number];
export const QuickRepliesSchema = z.array(z.object({ id: z.enum(QUICK_REPLY_IDS), text: z.string() })).min(1);
export const InviteSchema = z.object({ relative: z.string(), goalTitle: z.string(), text: z.string(), ctaLabel: z.string() });

export type FirstMoneyBanner = z.infer<typeof FirstMoneyBannerSchema>;
export type GoalOption = z.infer<typeof GoalOptionsSchema>[number];
export type PiggyCalc = z.infer<typeof PiggyCalcSchema>;
export type AccountCalc = z.infer<typeof AccountCalcSchema>;
export type LoanCalc = z.infer<typeof LoanCalcSchema>;
export type InvestCalc = z.infer<typeof InvestCalcSchema>;
export type DepositCalc = z.infer<typeof DepositCalcSchema>;
export type SpendAnalytics = z.infer<typeof SpendAnalyticsSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Ways = z.infer<typeof WaysSchema>;
export type GoalSetup = z.infer<typeof GoalSetupSchema>;
export type Invite = z.infer<typeof InviteSchema>;
export type QuickReply = z.infer<typeof QuickRepliesSchema>[number];
