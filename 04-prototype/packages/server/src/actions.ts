import { CATALOGS, type ActionResult, type Product, type Role } from '@proto/catalog';
import {
  ActionError,
  GOALS,
  QUICK_REPLIES,
  SPEND_TOTAL,
  WAYS,
  buildDataModel,
  depositProduct,
  goalWaySet,
  loanQuote,
  PRODUCTS,
  enablePiggy,
  openProduct,
  pickWay,
  rubText,
  selectGoal,
  sendInvite,
  setAccountCalc,
  setDepositCalc,
  setGoalTarget,
  setInvestCalc,
  setLoanCalc,
  setPiggyCalc,
  setSpendCut,
  spendCutQuote,
} from '@proto/mocks';
import { CHAT_SCENARIO, chatTurn } from './chat';
import { dataMessage } from './messages';
import { generateScreen, planScreen, refusalFor, rerenderHome, staticScreenFor, type Deps } from './pipeline';
import { DONE, confirmOpenProductScreen, doneScreen, refusalScreen, type StaticScreen } from './staticScreens';
import { dataFor, type SurfaceEntry } from './surfaces';

export interface ActionInput { role: Role; name: string; surfaceId: string; context: Record<string, unknown> }

const str = (ctx: Record<string, unknown>, key: string) => (typeof ctx[key] === 'string' ? (ctx[key] as string) : '');

/** A confirmation counts only from the server-built screen that showed this exact record. */
function shownOn(source: SurfaceEntry, key: string, id: string): string {
  const shown = (source.staticData?.static as Record<string, { id?: unknown }> | undefined)?.[key];
  if (!id || shown?.id !== id) throw new ActionError('bad_state', `${key} ${id} was not shown on ${source.surfaceId}`);
  return id;
}

export async function handleAction(input: ActionInput, deps: Deps): Promise<ActionResult> {
  const { role, name, context } = input;
  const show = (screen: StaticScreen, refresh: Role[] = []): ActionResult => ({ kind: 'screen', screen: staticScreenFor(role, screen, deps), refresh });
  const refuse = () => show(refusalScreen(refusalFor(role, buildDataModel(role, deps.store, { clock: '19:30' }))));
  /** A chat turn from a tap: the chat shows `echo` as Лиза's message, the model hears `text`. */
  const say = async (text: string, echo = text): Promise<ActionResult> => ({ kind: 'screen', screen: await chatTurn(text, deps), refresh: [], echo });

  if (!CATALOGS[role].actions.includes(name)) return refuse();
  try {
    const source = deps.surfaces.get(input.surfaceId);
    if (!source || source.role !== role) throw new ActionError('not_found', `No surface ${input.surfaceId} for ${role}`);
    // The chat keeps earlier turns on screen; only the latest one may act.
    if (deps.surfaces.currentOf(role)?.surfaceId !== source.surfaceId) {
      throw new ActionError('bad_state', 'Only the latest chat turn is live');
    }
    switch (name) {
      case 'handoff.request':
        return show(doneScreen(DONE.handoff));
      case 'nav.home': {
        // In the chat «К плану» brings back the plan: the step just done is over, so no way stays picked
        // (re-showing the last generated screen would put the finished widget back, owner 2026-10-23).
        if (deps.surfaces.homeOf(role)?.scenarioId === CHAT_SCENARIO) {
          const ya = deps.store.youngAdult;
          ya.pickedWay = null;
          const reply = 'Вот твой план. Что посмотрим дальше?';
          ya.history.push('User: К плану', `Assistant: ${reply}`, 'Assistant showed: WaysToGoal, QuickReplies');
          return { kind: 'screen', screen: planScreen(role, CHAT_SCENARIO, reply, deps), refresh: [], echo: 'К плану' };
        }
        const home = rerenderHome(role, deps);
        if (home) return { kind: 'screen', screen: home, refresh: [] };
        const first = deps.scenarios.list(role)[0];
        return { kind: 'screen', screen: await generateScreen({ role, scenarioId: first.id }, deps), refresh: [] };
      }
      case 'chat.open':
        return { kind: 'screen', screen: await chatTurn('', deps), refresh: [] };
      case 'goal.select': {
        const goalId = str(context, 'goalId') as keyof typeof GOALS;
        selectGoal(deps.store, goalId); // throws for an unknown goal before GOALS[goalId] is read
        return say(`Моя цель: ${GOALS[goalId].title}`, `${GOALS[goalId].emoji} ${GOALS[goalId].title}`);
      }
      case 'goal.setup': {
        setGoalTarget(deps.store, Number(context.amount), Number(context.months));
        const { amount, months } = deps.store.youngAdult.goalTarget!; // the stored, clamped values
        return say(`${rubText(amount)} за ${months} мес.`);
      }
      case 'way.pick': {
        const wayId = str(context, 'wayId');
        pickWay(deps.store, wayId); // throws for an unknown way before WAYS[wayId] is read
        return say(`Хочу посмотреть: ${WAYS[wayId as keyof typeof WAYS].name}`);
      }
      case 'account.recalc':
        setAccountCalc(deps.store, Number(context.topUp), Number(context.months));
        return refreshData(input, deps, []);
      case 'loan.recalc':
        setLoanCalc(deps.store, Number(context.amount), Number(context.months));
        return refreshData(input, deps, []);
      case 'loan.save': {
        const goalId = deps.store.youngAdult.goalId;
        if (!goalId) throw new ActionError('bad_state', 'Saving the loan payment needs a goal');
        // As with spend.save: the sliders come with the tap, so the payment saved is the one Лиза sees.
        if (context.amount !== undefined || context.months !== undefined) setLoanCalc(deps.store, Number(context.amount), Number(context.months));
        const q = loanQuote(deps.store, goalId);
        setAccountCalc(deps.store, q.payment, q.saveMonths);
        pickWay(deps.store, 'savings-account');
        return say('Хочу копить тем же платежом');
      }
      case 'invest.recalc':
        setInvestCalc(deps.store, Number(context.monthly), Number(context.months));
        return refreshData(input, deps, []);
      case 'invest.compare': {
        if (context.monthly !== undefined || context.months !== undefined) setInvestCalc(deps.store, Number(context.monthly), Number(context.months));
        const { monthly, months } = deps.store.youngAdult.invest;
        setAccountCalc(deps.store, monthly, months);
        pickWay(deps.store, 'savings-account');
        return say('Сравнить с накопительным счётом');
      }
      case 'piggy.recalc':
        setPiggyCalc(deps.store, Number(context.sharePct), Number(context.months));
        return refreshData(input, deps, []);
      case 'piggy.enable':
        enablePiggy(deps.store);
        return show(doneScreen(DONE.piggyOn));
      case 'deposit.recalc':
        setDepositCalc(deps.store, Number(context.amount), Number(context.months));
        return refreshData(input, deps, []);
      case 'spend.recalc':
        setSpendCut(deps.store, str(context, 'categoryId'), Number(context.cutPct));
        return refreshData(input, deps, []);
      case 'spend.save': {
        // The widget sends its sliders with the tap: the amount saved is the cut Лиза sees, even before a recalculation landed.
        if (context.categoryId !== undefined || context.cutPct !== undefined) setSpendCut(deps.store, str(context, 'categoryId'), Number(context.cutPct));
        // A small goal (or none set yet) saves through the piggy bank; a bigger one tops up the savings account, as deposits take no top-ups.
        const { saved } = spendCutQuote(deps.store);
        const ya = deps.store.youngAdult;
        if ((goalWaySet(deps.store) ?? 'small') === 'small') {
          setPiggyCalc(deps.store, Math.round((saved / SPEND_TOTAL) * 100), ya.piggy.months);
          pickWay(deps.store, 'piggy');
        } else {
          setAccountCalc(deps.store, saved, ya.account.months);
          pickWay(deps.store, 'savings-account');
        }
        return say('Хочу откладывать сэкономленное');
      }
      case 'reply.pick': {
        const replyId = str(context, 'replyId');
        if (!Object.hasOwn(QUICK_REPLIES, replyId)) throw new ActionError('not_found', `No quick reply ${replyId}`);
        // A reply named after a way (loan, invest, spend) picks it, so its calculator answers and the reply drops out; the invite picks none.
        if (Object.hasOwn(WAYS, replyId)) pickWay(deps.store, replyId);
        return say(QUICK_REPLIES[replyId as keyof typeof QUICK_REPLIES]);
      }
      case 'product.open': {
        const productId = str(context, 'productId');
        if (!Object.hasOwn(PRODUCTS, productId)) throw new ActionError('not_found', 'No such product');
        if (productId !== 'deposit') return show(confirmOpenProductScreen(PRODUCTS[productId as keyof typeof PRODUCTS]));
        // The calculator sends its sliders with the tap: the confirmation is for what Лиза sees, even before a recalculation landed.
        if (context.amount !== undefined || context.months !== undefined) setDepositCalc(deps.store, Number(context.amount), Number(context.months));
        return show(confirmOpenProductScreen(depositProduct(deps.store)));
      }
      case 'product.confirm': {
        shownOn(source, 'product', str(context, 'productId'));
        const product = (source.staticData!.static as { product: Product }).product; // exactly the record this confirmation showed
        openProduct(deps.store, product.id);
        return show(doneScreen(DONE.productOpened(product)));
      }
      case 'product.cancel':
        shownOn(source, 'product', str(context, 'productId'));
        return show(doneScreen(DONE.productCancelled));
      case 'invite.send':
        sendInvite(deps.store);
        return show(doneScreen(DONE.inviteSent));
      default:
        return refuse(); // declared in the catalog but not handled yet
    }
  } catch (err) {
    if (err instanceof ActionError) return show(doneScreen(DONE.actionFailed));
    throw err;
  }
}

function refreshData(input: ActionInput, deps: Deps, refresh: Role[]): ActionResult {
  const entry = deps.surfaces.get(input.surfaceId);
  if (!entry || entry.role !== input.role) return { kind: 'data', messages: [], refresh };
  return { kind: 'data', messages: [dataMessage(entry.surfaceId, dataFor(entry, deps.store))], refresh };
}
