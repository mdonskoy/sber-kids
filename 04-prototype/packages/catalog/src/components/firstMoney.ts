import { bound, defineComponent, oneOf } from '../define';
import {
  AccountCalcSchema,
  DepositCalcSchema,
  FirstMoneyBannerSchema,
  GoalOptionsSchema,
  GoalSetupSchema,
  InvestCalcSchema,
  InviteSchema,
  LoanCalcSchema,
  PiggyCalcSchema,
  ProductSchema,
  QuickRepliesSchema,
  SpendAnalyticsSchema,
  WaysSchema,
} from '../records';

export const FirstMoneyBannerDef = defineComponent('FirstMoneyBanner', 'Congratulates on the first salary and opens the planning chat.', {
  banner: bound(FirstMoneyBannerSchema, 'Path /banner'),
});
export const GoalPickerDef = defineComponent('GoalPicker', 'Buttons to choose what to save for.', {
  goals: bound(GoalOptionsSchema, 'Path /goals'),
});
export const GoalSetupDef = defineComponent('GoalSetup', 'Asks how much the chosen goal needs and by when: three price points as buttons and sliders for the amount and the term. Shown right after a goal is tapped; its button sends the amount and term and the ways follow. Needs a goal.', {
  setup: bound(GoalSetupSchema, 'Path /goalSetup'),
});
export const WaysToGoalDef = defineComponent(
  'WaysToGoal',
  'Ways to reach the chosen goal as tappable rows; a tap opens that way\'s calculator in the chat. set "big": a deposit and a savings account, for a big goal with no rush; set "small": a piggy bank and saving on spending, for a small goal; set "urgent": comparing a loan with saving, for a soon goal; set "risk": investing and a deposit, only when the user is ready for risk. /ways/suggested is the default for the chosen amount and term. A way already done (its product opened, the piggy bank on) is left out of its set; a set with no rows left shows nothing.',
  { ways: bound(WaysSchema, 'Path /ways'), set: oneOf(['big', 'small', 'urgent', 'risk'] as const, 'Which ways to show') },
);
export const SpendAnalyticsDef = defineComponent('SpendAnalytics', 'Spending by category; the user picks a category and a cut, and the bank shows the roubles freed a month and, with a goal, how much sooner it is reached. Neutral tone, never shaming.', {
  spend: bound(SpendAnalyticsSchema, 'Path /spendAnalytics'),
});
export const DepositCalculatorDef = defineComponent('DepositCalculator', 'A term deposit calculator: the user sets the amount and the term; the bank picks the tariff and rate and shows the income and the payout date, plus a hint how to earn more. Opens the deposit.', {
  deposit: bound(DepositCalcSchema, 'Path /depositCalc'),
});
export const ProductCardDef = defineComponent('ProductCard', 'A bank savings product with terms and the disclosure from the backend.', {
  product: bound(ProductSchema, 'Path /products/savings or /products/deposit'),
});
export const InviteRelativeDef = defineComponent('InviteRelative', 'Invite a relative to contribute to the goal through a joint account.', {
  invite: bound(InviteSchema, 'Path /invite'),
});
export const QuickRepliesDef = defineComponent('QuickReplies', 'Two or three short follow-up questions under the latest answer; a tap sends one as the user\'s message.', {
  replies: bound(QuickRepliesSchema, 'Path /quickReplies'),
});
export const ConfirmOpenProductDef = defineComponent(
  'ConfirmOpenProduct',
  'Static confirmation of opening a product, with the full disclosure.',
  { product: bound(ProductSchema, 'Path /static/product') },
  { staticOnly: true },
);

export const SavingsAccountCalculatorDef = defineComponent('SavingsAccountCalculator', 'A savings account calculator: the user sets a monthly top-up and a term, and the bank shows the balance with interest. Money can be withdrawn at any time. Opens the account.', {
  account: bound(AccountCalcSchema, 'Path /accountCalc'),
});

export const PiggyBankCalculatorDef = defineComponent('PiggyBankCalculator', 'A piggy bank for a small or soon goal: the user sets the share of every card purchase to put aside and a term, and the bank shows how much builds up. Switches the piggy bank on.', {
  piggy: bound(PiggyCalcSchema, 'Path /piggyCalc'),
});

export const LoanCompareDef = defineComponent('LoanCompare', 'Saving versus borrowing for the chosen goal: the user sets the amount and the loan term, and the bank shows the monthly payment, the overpayment and the full cost, next to how long saving the same payment on a savings account takes. Never applies for a loan; its button moves to saving the same payment. Needs a goal.', {
  loan: bound(LoanCalcSchema, 'Path /loanCalc'),
});

export const InvestSimDef = defineComponent('InvestSim', 'An investment simulation, not a forecast: the user sets a monthly sum and a term, and the bank shows what it could grow to like a government bond fund and like the Moscow Exchange stock index, next to the sum paid in, with a warning that it can be less. Opens a broker account or compares with a savings account.', {
  invest: bound(InvestCalcSchema, 'Path /investCalc'),
});
