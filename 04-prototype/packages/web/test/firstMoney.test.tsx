import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor, type ActionPayload, type SurfaceModel } from '@a2ui/web_core/v0_9';
import { CATALOGS } from '@proto/catalog';
import { PRODUCTS, buildDataModel, createStore, selectGoal, setGoalTarget, setLoanCalc } from '@proto/mocks';
import { reactCatalog } from '../src/catalog';
import { ratePct } from '../src/ui';
import { DebugProvider } from '../src/debug/DebugContext';
import { emitRefresh, emitReload } from '../src/phone/bus';
import { ChatPhone } from '../src/phone/ChatPhone';
import { PERSONAS } from '../src/App';
import { screenResult } from './helpers';

const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });
function planData() {
  const store = createStore();
  selectGoal(store, 'apartment');
  return buildDataModel('young-adult', store, { clock: '10:05' });
}
function mount(components: unknown[], data: unknown, opts: { earlier?: boolean } = {}) {
  const actions: ActionPayload[] = [];
  let surface!: SurfaceModel<any>;
  const p = new MessageProcessor([reactCatalog('young-adult')], (a) => {
    actions.push(a);
  });
  p.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: CATALOGS['young-adult'].id } },
    { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: data } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
  ] as any);
  surface = p.model.surfacesMap.get('s')!;
  render(opts.earlier ? <fieldset disabled><A2uiSurface surface={surface} /></fieldset> : <A2uiSurface surface={surface} />);
  return Object.assign(actions, { surface });
}
afterEach(() => {
  cleanup(); // vitest globals are off, so Testing Library does not unmount on its own
  vi.unstubAllGlobals();
});

describe('«Первые деньги» components', () => {
  it('ways to the goal: the set the model chose, a tap picks the way', async () => {
    const actions = mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], planData());
    expect(screen.getByText('Как копить на первый взнос')).toBeTruthy();
    expect(screen.getByText(/Цель — 1\s500\s000\s₽/)).toBeTruthy();
    expect(screen.queryByText('Копилка')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Накопительный счёт/ }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'way.pick', context: { wayId: 'savings-account' } }));
  });

  it('ways to the goal: the small set, and nothing without a goal', () => {
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'small' }], planData());
    expect(screen.getByRole('button', { name: /Копилка/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Сэкономить на тратах/ })).toBeTruthy();
    cleanup();
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.queryByText(/Как копить/)).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    cleanup();
    const data = planData() as any;
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], { ...data, ways: { ...data.ways, big: [] } });
    expect(screen.queryByText(/Как копить/)).toBeNull(); // every way in the set is done: no empty card
  });

  it('goal setup: three presets with the default pressed; a preset moves the amount; Дальше sends amount and term', async () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    const actions = mount([root('g'), { id: 'g', component: 'GoalSetup', setup: { path: '/goalSetup' } }], buildDataModel('young-adult', store, { clock: '10:05' }));
    expect(screen.getByText('🏠 Первый взнос на квартиру')).toBeTruthy();
    expect(screen.getByText('Сколько нужно и к какому сроку')).toBeTruthy();
    const studio = screen.getByRole('button', { name: /Студия/ });
    expect(screen.getByRole('button', { name: /Однушка/ }).getAttribute('aria-pressed')).toBe('true');
    expect(studio.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(3);
    fireEvent.click(studio);
    expect(studio.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('slider', { name: 'Сумма' }).getAttribute('aria-valuetext')).toMatch(/^900\s000\s₽$/);
    expect(screen.getByRole('slider', { name: 'Срок' }).getAttribute('aria-valuetext')).toBe('36 мес.');
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'goal.setup', context: { amount: 900000, months: 36 } }));
  });

  it('goal setup: nothing without a goal', () => {
    mount([root('g'), { id: 'g', component: 'GoalSetup', setup: { path: '/goalSetup' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('ways to the goal: the urgent set compares a loan with saving; the risk set offers investing', () => {
    const store = createStore();
    selectGoal(store, 'car');
    const data = buildDataModel('young-adult', store, { clock: '10:05' });
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'urgent' }], data);
    expect(screen.getByRole('button', { name: /Копить или взять кредит/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Накопительный счёт/ })).toBeTruthy();
    expect(screen.getByText(/Цель — 600\s000\s₽ за 24 мес\. Выбери, с чего начать/)).toBeTruthy();
    cleanup();
    mount([root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'risk' }], data);
    expect(screen.getByRole('button', { name: /Инвестиции/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Вклад/ })).toBeTruthy();
  });

  it('shows the rate as is, with a decimal comma and no trailing zeros', () => {
    expect([0.14, 0.145, 0.1475].map(ratePct)).toEqual(['14% годовых', '14,5% годовых', '14,75% годовых']);
  });

  it('the product card renders the backend disclosure and opens the static confirmation', async () => {
    const actions = mount([root('c'), { id: 'c', component: 'ProductCard', product: { path: '/products/savings' } }], planData());
    expect(await screen.findByText(/Не является публичной офертой/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Открыть счёт' }));
    await vi.waitFor(() => expect(actions[0]).toMatchObject({ name: 'product.open', context: { productId: 'savings-account' } }));
  });

  it('recalculates the deposit live, and marks figures stale until the bank answers', () => {
    vi.useFakeTimers();
    const data = buildDataModel('young-adult', createStore(), { clock: '10:05' }) as any;
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], data);
    expect(screen.getByText('Вклад «Выгодный старт»')).toBeTruthy();
    expect(screen.getByText('11,5%')).toBeTruthy();
    expect(screen.getByText(/3\s450\s₽/)).toBeTruthy();
    expect(screen.getByText('Доход к 23 октября 2027')).toBeTruthy();
    const term = screen.getAllByRole('slider')[1];
    expect(term.getAttribute('aria-valuetext')).toBe('12 мес.');
    fireEvent.change(term, { target: { value: '24' } });
    expect(term.getAttribute('aria-valuetext')).toBe('24 мес.');
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByText(/3\s450\s₽/)).toBeTruthy(); // the figures stay the bank's until it answers
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'deposit.recalc', context: { amount: 30000, months: 24 } });
    act(() => {
      actions.surface.dataModel.set('/depositCalc', { ...data.depositCalc, months: 24, rate: 0.125, income: 7500, calculatedFor: { amount: 30000, months: 24 } });
    });
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(screen.getByText(/7\s500\s₽/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('the hint moves the term slider to the better rate', () => {
    vi.useFakeTimers();
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    fireEvent.click(screen.getByRole('button', { name: /На 13 мес\. ставка выше — 12,5%/ }));
    expect(screen.getAllByRole('slider')[1].getAttribute('aria-valuetext')).toBe('13 мес.');
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'deposit.recalc', context: { amount: 30000, months: 13 } });
    vi.useRealTimers();
  });

  it('a calculator in an earlier turn sends no recalculation', () => {
    vi.useFakeTimers();
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }), { earlier: true });
    fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '24' } });
    act(() => vi.advanceTimersByTime(10_000));
    expect(actions).toHaveLength(0);
    vi.useRealTimers();
  });

  it('the savings account recalculates live and opens the account', async () => {
    vi.useFakeTimers();
    const actions = mount([root('a'), { id: 'a', component: 'SavingsAccountCalculator', account: { path: '/accountCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText('Накопительный счёт')).toBeTruthy();
    expect(screen.getByText(/97\s532\s₽/)).toBeTruthy();
    expect(screen.getByText(/^\+?7\s532\s₽$/)).toBeTruthy();
    const topUp = screen.getByRole('slider', { name: 'Пополнять в месяц' });
    fireEvent.change(topUp, { target: { value: '10000' } });
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'account.recalc', context: { topUp: 10000, months: 12 } });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Открыть счёт' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'savings-account' } }));
  });

  it('the piggy bank recalculates live and switches on', async () => {
    vi.useFakeTimers();
    const actions = mount([root('p'), { id: 'p', component: 'PiggyBankCalculator', piggy: { path: '/piggyCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText('Копилка')).toBeTruthy();
    expect(screen.getByText(/4\s104\s₽/)).toBeTruthy();
    const share = screen.getByRole('slider', { name: 'С каждой покупки' });
    expect(share.getAttribute('aria-valuetext')).toBe('3%');
    fireEvent.change(share, { target: { value: '5' } });
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'piggy.recalc', context: { sharePct: 5, months: 6 } });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Включить копилку' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'piggy.enable' }));
  });

  it('opens the deposit for the amount on the sliders', async () => {
    const actions = mount([root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    fireEvent.click(screen.getByRole('button', { name: /^Открыть на 30\s000\s₽$/ }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'deposit', amount: 30000, months: 12 } }));
  });

  it('picks a category to cut', () => {
    vi.useFakeTimers();
    const actions = mount([root('s'), { id: 's', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText(/Октябрь · 22\s800\s₽/)).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Сократить «доставку еды» на' }).getAttribute('aria-valuetext')).toBe('20%');
    fireEvent.click(screen.getByRole('radio', { name: /Такси/ }));
    expect(screen.getByRole('slider', { name: 'Сократить «такси» на' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'spend.recalc', context: { categoryId: 'taxi', cutPct: 20 } });
    const groceries = screen.getByRole('radio', { name: /Продукты/ });
    expect(groceries.hasAttribute('disabled') || groceries.getAttribute('aria-disabled') === 'true').toBe(true);
    expect(screen.getByText('43% · обязательные')).toBeTruthy();
    // Each row's share against the largest category, from the bank's share; the caption already says it aloud.
    expect(screen.getAllByRole('meter', { hidden: true }).map((m) => m.getAttribute('aria-valuenow'))).toEqual(['43', '28', '14', '10', '5']);
    expect(screen.getByText('Выбери цель — покажем, насколько быстрее до неё дойдёшь.')).toBeTruthy();
    vi.useRealTimers();
  });

  it('with a goal, shows how much sooner it is reached', () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    const data = buildDataModel('young-adult', store, { clock: '10:05' }) as any;
    mount([root('s'), { id: 's', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }], data);
    expect(screen.getByText(data.spendAnalytics.goalTitle)).toBeTruthy();
    expect(screen.getByText(/^на .+ раньше$/)).toBeTruthy();
    expect(screen.queryByText(/Выбери цель/)).toBeNull();
  });

  it('compares a car loan with saving the same payment, and saves it', async () => {
    vi.useFakeTimers();
    const store = createStore();
    selectGoal(store, 'car');
    setLoanCalc(store, 900000, 60);
    const actions = mount([root('l'), { id: 'l', component: 'LoanCompare', loan: { path: '/loanCalc' } }], buildDataModel('young-adult', store, { clock: '10:05' }));
    expect(screen.getByText('Копить или взять кредит')).toBeTruthy();
    expect(screen.getByText(/^24\s857\s₽$/)).toBeTruthy();
    expect(screen.getByText('31 мес.')).toBeTruthy();
    expect(screen.getByText('Платёж больше трети зарплаты — банк может отказать')).toBeTruthy();
    expect(screen.getByText('22%')).toBeTruthy(); // ПСК
    expect(screen.queryByText(/Оформить/)).toBeNull();
    const term = screen.getByRole('slider', { name: 'Срок кредита' });
    expect(term.getAttribute('aria-valuetext')).toBe('60 мес.');
    fireEvent.change(term, { target: { value: '48' } });
    act(() => vi.advanceTimersByTime(300));
    expect(actions.at(-1)).toMatchObject({ name: 'loan.recalc', context: { amount: 900000, months: 48 } });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Копить тем же платежом' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'loan.save', context: { amount: 900000, months: 48 } })); // the live sliders, before a recalc landed
  });

  it('a subsidised student loan also leads to a bank specialist, never to an application', async () => {
    const store = createStore();
    selectGoal(store, 'education');
    const actions = mount([root('l'), { id: 'l', component: 'LoanCompare', loan: { path: '/loanCalc' } }], buildDataModel('young-adult', store, { clock: '10:05' }));
    expect(screen.queryByText(/Оформить/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Узнать про образовательный кредит' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'handoff.request' }));
  });

  it('simulates investing with two benchmarks and the warning, and ends in an open product or a comparison', async () => {
    const actions = mount([root('i'), { id: 'i', component: 'InvestSim', invest: { path: '/investCalc' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getByText('Симуляция инвестиций')).toBeTruthy();
    expect(screen.getByText('Через 60 мес. может быть')).toBeTruthy();
    expect(screen.getByText(/^387\s185\s₽$/)).toBeTruthy();
    expect(screen.getByText(/^481\s073\s₽$/)).toBeTruthy();
    expect(screen.getByText('Твои взносы')).toBeTruthy();
    expect(screen.getByText(/^300\s000\s₽$/)).toBeTruthy();
    expect(screen.getByText('Это не прогноз и не рекомендация. Можно получить меньше, чем вложишь')).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Вкладывать в месяц' }).getAttribute('aria-valuetext')).toMatch(/^5\s000\s₽$/);
    fireEvent.change(screen.getByRole('slider', { name: 'Срок' }), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Открыть брокерский счёт' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'broker-account' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Сравнить с накопительным счётом' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'invest.compare', context: { monthly: 5000, months: 24 } }));
  });

  it('confirms the broker account without a rate row', () => {
    const data = { ...buildDataModel('young-adult', createStore(), { clock: '10:05' }), static: { product: PRODUCTS['broker-account'] } };
    mount([root('c'), { id: 'c', component: 'ConfirmOpenProduct', product: { path: '/static/product' } }], data);
    expect(screen.getByText('Открыть брокерский счёт')).toBeTruthy();
    expect(screen.queryByText('Ставка')).toBeNull();
    expect(screen.getByText(PRODUCTS['broker-account'].disclosure)).toBeTruthy();
  });

  it('confirms opening with the full disclosure and fixed actions', async () => {
    const data = { ...buildDataModel('young-adult', createStore(), { clock: '10:05' }), static: { product: PRODUCTS.deposit } };
    const actions = mount([root('c'), { id: 'c', component: 'ConfirmOpenProduct', product: { path: '/static/product' } }], data);
    expect(screen.getByText('Открыть вклад')).toBeTruthy();
    expect(screen.getByText('Проверь условия — после открытия их не изменить')).toBeTruthy();
    expect(screen.getByText(PRODUCTS.deposit.disclosure)).toBeTruthy();
    // «Срок — от одного месяца до трёх лет» becomes value «От одного месяца до трёх лет» with the label «Срок».
    expect(screen.getByText('13,5% годовых')).toBeTruthy();
    expect(screen.getByText('Ставка')).toBeTruthy();
    expect(screen.getByText('От одного месяца до трёх лет')).toBeTruthy();
    expect(screen.getByText('Срок')).toBeTruthy();
    expect(screen.getByText('Снять раньше срока без потери процентов нельзя')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.confirm', context: { productId: 'deposit' } }));
    expect(screen.getByRole('status').textContent).toBe('Подтверждено');
    expect(screen.queryByRole('button', { name: 'Подтвердить' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Отмена' })).toBeNull();
  });

  it('cancels opening and shows the status in place of the buttons', async () => {
    const data = { ...buildDataModel('young-adult', createStore(), { clock: '10:05' }), static: { product: PRODUCTS['savings-account'] } };
    const actions = mount([root('c'), { id: 'c', component: 'ConfirmOpenProduct', product: { path: '/static/product' } }], data);
    expect(screen.getByText('Открыть накопительный счёт')).toBeTruthy();
    expect(screen.getByText('В любой момент')).toBeTruthy();
    expect(screen.getByText('Пополнять и снимать')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'product.cancel', context: { productId: 'savings-account' } }));
    expect(screen.getByRole('status').textContent).toBe('Отменено');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('conversation widgets', () => {
  const goalSet = () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    setGoalTarget(store, 1500000, 36);
    return buildDataModel('young-adult', store, { clock: '10:05' });
  };

  it('the banner: a one-line title with the amount, the question, then the action', () => {
    mount([root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    const title = screen.getByText(/Первая зарплата —/);
    const lead = screen.getByText('Хочешь сохранить и приумножить?');
    const cta = screen.getByText('Составить план');
    expect(title.className).toContain('truncate'); // one line; a long title ends in an ellipsis
    expect(title.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lead.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/Соберём план/)).toBeNull();
  });

  it('the goal picker is a row of chips that pick the goal', async () => {
    const actions = mount([root('g'), { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } }], buildDataModel('young-adult', createStore(), { clock: '10:05' }));
    expect(screen.getAllByRole('button')).toHaveLength(5);
    const chip = screen.getByRole('button', { name: 'Первый взнос на квартиру' });
    expect(chip.textContent).toContain('🏠');
    fireEvent.click(chip);
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'goal.select', context: { goalId: 'apartment' } }));
  });

  it('quick replies: three buttons, a tap sends the reply', async () => {
    const actions = mount([root('q'), { id: 'q', component: 'QuickReplies', replies: { path: '/quickReplies' } }], goalSet());
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Сравнить с кредитом', 'А если инвестировать?', 'Как сэкономить на тратах?']);
    fireEvent.click(screen.getByRole('button', { name: 'А если инвестировать?' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'reply.pick', context: { replyId: 'invest' } }));
  });

  it('quick replies: nothing before the goal is set', () => {
    mount([root('q'), { id: 'q', component: 'QuickReplies', replies: { path: '/quickReplies' } }], planData());
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('invites mum to save together', async () => {
    const actions = mount([root('i'), { id: 'i', component: 'InviteRelative', invite: { path: '/invite' } }], goalSet());
    expect(screen.getByText('Копить вместе с мамой')).toBeTruthy();
    expect(screen.getByText('Цель «Первый взнос на квартиру»')).toBeTruthy();
    expect(screen.getByText('Мама сможет пополнять твою цель через Совместный счёт. Деньги останутся твоими.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Пригласить маму' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'invite.send' }));
  });

  it('spending: the result is on top, and the freed amount can be saved', async () => {
    const actions = mount([root('s'), { id: 's', component: 'SpendAnalytics', spend: { path: '/spendAnalytics' } }], goalSet());
    const result = screen.getByText('Освободится в месяц');
    expect(result.compareDocumentPosition(screen.getByRole('radiogroup')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(result.compareDocumentPosition(screen.getByRole('slider')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Откладывать сэкономленное' }));
    await vi.waitFor(() => expect(actions.at(-1)).toMatchObject({ name: 'spend.save', context: { categoryId: 'delivery', cutPct: 20 } }));
  });
});

describe('ChatPhone', () => {
  it('accepts no message until the banner has loaded', async () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal('fetch', vi.fn(async () => {
      await gate;
      return new Response(JSON.stringify(screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm)), { headers: { 'content-type': 'application/json' } });
    }));
    render(<DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>);
    const send = () => screen.getByRole('button', { name: 'Отправить', hidden: true }) as HTMLButtonElement; // the chat view is hidden until it opens
    expect(send().disabled).toBe(true);
    release();
    await screen.findByRole('button', { name: /Составить план/ });
    expect(send().disabled).toBe(false);
  });

  it('survives a scrollIntoView that returns a Promise, as current Chromium does', async () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' });
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { return Promise.resolve(); } as unknown as typeof original;
    try {
      vi.stubGlobal('fetch', vi.fn(async () =>
        new Response(JSON.stringify(screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm)), { headers: { 'content-type': 'application/json' } })));
      const { unmount } = render(<DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>);
      expect(await screen.findByRole('button', { name: /Составить план/ })).toBeTruthy();
      unmount();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('opens the chat from the banner and appends turns with the user bubble', async () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' });
    const picker = [root('r', 'g'), { id: 'r', component: 'Text', text: 'На что копишь?', variant: 'body' }, { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } }];
    let turn = 3;
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
      if (url === '/api/screen/young-adult') return json(screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm));
      if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: screenResult('young-adult', 'ya-2', picker, dm) });
      if (url === '/api/turn/young-adult') return json(screenResult('young-adult', `ya-${turn++}`, picker, dm));
      return new Response('nf', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>);

    fireEvent.click(await screen.findByRole('button', { name: /Составить план/ }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    expect(screen.getByText(/Первая зарплата —/)).toBeTruthy(); // the banner stays on the home view

    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'Хочу квартиру' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Хочу квартиру')).toBeTruthy();
    await vi.waitFor(() => expect(screen.getAllByText('На что копишь?')).toHaveLength(2));
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/turn/young-adult')).toBe(true);
    // The banner lives on the home view; the chat holds the two answers, only the latest one live.
    const turns = screen.getAllByRole('article');
    expect(turns.map((t) => t.querySelector('fieldset')!.disabled)).toEqual([true, false]);

    // Debug «Повторить экран» regenerates the latest turn without a new bubble.
    act(() => emitReload('young-adult'));
    await vi.waitFor(() => expect(screen.getAllByText('На что копишь?')).toHaveLength(3));
    const lastTurn = fetchMock.mock.calls.filter(([url]) => url === '/api/turn/young-adult').at(-1)!;
    expect(JSON.parse((lastTurn[1] as RequestInit).body as string)).toMatchObject({ text: '' });
    expect(screen.getAllByText('Хочу квартиру')).toHaveLength(1);

    // One turn at a time: a second submit while the first is running sends nothing and adds no bubble.
    const turnCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/turn/young-adult').length;
    const before = turnCalls();
    const input = screen.getByPlaceholderText('Сообщение');
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: 'раз' } });
    fireEvent.submit(form);
    fireEvent.change(input, { target: { value: 'два' } });
    fireEvent.submit(form);
    await vi.waitFor(() => expect(turnCalls()).toBe(before + 1));
    expect(screen.queryByText('два')).toBeNull();
  });

  it('a tap that answers in the chat shows its echo as Лиза\'s bubble before the answer', async () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' });
    const picker = [root('r', 'g'), { id: 'r', component: 'Text', text: 'На что копишь?', variant: 'body' }, { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } }];
    const answer = [root('r'), { id: 'r', component: 'Text', text: 'Сколько нужно?', variant: 'body' }];
    const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/screen/young-adult') return json(screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm));
      if (url === '/api/action/young-adult') {
        const { name } = JSON.parse(init!.body as string);
        if (name === 'chat.open') return json({ kind: 'screen', refresh: [], screen: screenResult('young-adult', 'ya-2', picker, dm) });
        return json({ kind: 'screen', refresh: [], echo: '🏠 Первый взнос на квартиру', screen: screenResult('young-adult', 'ya-3', answer, dm) });
      }
      return new Response('nf', { status: 404 });
    }));
    render(<DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Составить план/ }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    expect(screen.queryByText('🏠 Первый взнос на квартиру')).toBeNull(); // chat.open carries no echo
    fireEvent.click(screen.getByRole('button', { name: 'Первый взнос на квартиру' }));
    const answerText = await screen.findByText('Сколько нужно?');
    const bubble = screen.getByText('🏠 Первый взнос на квартиру');
    expect(bubble.compareDocumentPosition(answerText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('На что копишь?').compareDocumentPosition(bubble) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  describe('one request at a time and refresh', () => {
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    const dm = () => buildDataModel('young-adult', createStore(), { clock: '10:00' });
    const banner = () => screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm());
    const picker = () => screenResult('young-adult', 'ya-2', [root('g'), { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } }], dm());
    const mountPhone = (strict = false) => {
      const ui = <DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>;
      return render(strict ? <StrictMode>{ui}</StrictMode> : ui);
    };
    const stub = (actionDelay?: Promise<void>) => {
      const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
        if (url === '/api/screen/young-adult') return json(banner());
        if (url === '/api/action/young-adult') {
          await actionDelay;
          return json({ kind: 'screen', refresh: [], screen: picker() });
        }
        if (url.startsWith('/api/data/young-adult')) return json({ messages: [] });
        return new Response('not found', { status: 404 });
      });
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };
    const calls = (fetchMock: ReturnType<typeof stub>, url: string) => fetchMock.mock.calls.filter(([u]) => u === url);

    it('keeps the screen dimmed while an action runs and sends one request for a double click', async () => {
      let release!: () => void;
      const fetchMock = stub(new Promise<void>((r) => { release = r; }));
      mountPhone();
      const button = await screen.findByRole('button', { name: /Составить план/ });
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(screen.getByRole('main').getAttribute('aria-busy')).toBe('true'));
      expect(screen.getByText(/Первая зарплата —/)).toBeTruthy();
      release();
      await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
      expect(calls(fetchMock, '/api/action/young-adult')).toHaveLength(1);
      expect(JSON.parse(calls(fetchMock, '/api/action/young-adult')[0][1]!.body as string)).toMatchObject({ name: 'chat.open', surfaceId: 'ya-1' });
    });

    it('loads the banner once under StrictMode', async () => {
      const fetchMock = stub();
      mountPhone(true);
      await screen.findByRole('button', { name: /Составить план/ });
      expect(calls(fetchMock, '/api/screen/young-adult')).toHaveLength(1);
    });

    it('refresh fetches data for the surface the phone shows', async () => {
      const fetchMock = stub();
      mountPhone();
      await screen.findByRole('button', { name: /Составить план/ });
      emitRefresh(['young-adult']);
      await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/data/young-adult?surfaceId=ya-1')).toBe(true));
    });

    it('logs a failed refresh and keeps the screen', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = stub();
      mountPhone();
      await screen.findByRole('button', { name: /Составить план/ });
      fetchMock.mockImplementation(async () => new Response('x', { status: 500 }));
      emitRefresh(['young-adult']);
      await waitFor(() => expect(warn).toHaveBeenCalledWith('refresh failed', 'young-adult', expect.any(Error)));
      expect(screen.getByRole('button', { name: /Составить план/ })).toBeTruthy();
      warn.mockRestore();
    });
  });
});
