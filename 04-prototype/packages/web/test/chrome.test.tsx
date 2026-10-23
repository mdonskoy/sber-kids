import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDataModel, createStore } from '@proto/mocks';
import { App, PERSONAS } from '../src/App';
import { DebugProvider } from '../src/debug/DebugContext';
import { ChatPhone } from '../src/phone/ChatPhone';
import { screenResult } from './helpers';

const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });
const json = (b: unknown) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
const dm = () => buildDataModel('young-adult', createStore(), { clock: '10:00' });
const banner = () => screenResult('young-adult', 'ya-1', [root('b'), { id: 'b', component: 'FirstMoneyBanner', banner: { path: '/banner' } }], dm());
const answer = (id: string) => screenResult('young-adult', id, [root('t'), { id: 't', component: 'Text', text: 'На что копишь?', variant: 'body' }], dm());

/** `failures` lists the urls whose first call answers 500. */
function stub(failures: string[] = []) {
  let n = 2;
  const failed = new Set<string>();
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    if (failures.includes(url) && !failed.has(url)) {
      failed.add(url);
      return new Response('x', { status: 500 });
    }
    if (url === '/api/screen/young-adult') return json(banner());
    if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: answer(`ya-${n++}`) });
    if (url === '/api/turn/young-adult') return json(answer(`ya-${n++}`));
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const bodies = (fetchMock: ReturnType<typeof stub>, url: string) =>
  fetchMock.mock.calls.filter(([u]) => u === url).map(([, init]) => JSON.parse(init!.body as string));
const mountPhone = () => render(<DebugProvider><ChatPhone persona={PERSONAS['young-adult']} /></DebugProvider>);
const bannerButton = () => screen.findByRole('button', { name: /Составить план/ });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('phone chrome', () => {
  it('starts on the home view with the banner in the slot', async () => {
    stub();
    mountPhone();
    expect(await bannerButton()).toBeTruthy();
    expect(screen.getByText('В кошельке')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Назад' })).toBeNull();
  });

  it('the banner sends chat.open and shows the chat; «Назад» shows home with the chat kept', async () => {
    const fetchMock = stub();
    mountPhone();
    fireEvent.click(await bannerButton());
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    expect(bodies(fetchMock, '/api/action/young-adult')).toEqual([expect.objectContaining({ name: 'chat.open', surfaceId: 'ya-1' })]);
    expect(screen.getByRole('heading', { name: 'Первые деньги' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Составить план/ })).toBeNull(); // home is hidden

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(await bannerButton()).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Назад' })).toBeNull();

    // The chat already exists: the banner shows it again without a second chat.open.
    fireEvent.click(await bannerButton());
    expect(await screen.findByRole('button', { name: 'Назад' })).toBeTruthy();
    expect(screen.getByText('На что копишь?')).toBeTruthy();
    expect(bodies(fetchMock, '/api/action/young-adult')).toHaveLength(1);
  });

  it('a recalculation in flight keeps the chat open for typing, and its failure replaces nothing', async () => {
    let fail!: () => void;
    const recalc = new Promise<Response>((r) => { fail = () => r(new Response('x', { status: 500 })); });
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') {
        const { name } = JSON.parse(init!.body as string);
        return name === 'deposit.recalc' ? recalc : json({ kind: 'screen', refresh: [], screen: deposit });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    mountPhone();
    fireEvent.click(await bannerButton());
    const term = await screen.findByRole('slider', { name: 'Срок' });
    fireEvent.change(term, { target: { value: '24' } });
    await waitFor(() => expect(bodies(fetchMock, '/api/action/young-adult').map((b) => b.name)).toContain('deposit.recalc'));
    expect(screen.queryByRole('status', { name: 'Ответ готовится' })).toBeNull();
    expect(screen.getByText('Пересчитываем…')).toBeTruthy(); // only the figures say so
    expect((screen.getByPlaceholderText('Сообщение') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Отправить' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getAllByRole('main').some((m) => m.getAttribute('aria-busy') === 'true')).toBe(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fail();
    await waitFor(() => expect(warn).toHaveBeenCalledWith('recalc failed', 'young-adult', expect.any(Error)));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('slider', { name: 'Срок' })).toBeTruthy();
    warn.mockRestore();
  });

  it('what Лиза types while a recalculation is in flight is sent at once, and the late recalc is dropped', async () => {
    let finish!: () => void;
    const recalc = new Promise<Response>((r) => { finish = () => r(json({ kind: 'data', refresh: [], messages: [{ version: 'v0.9', updateDataModel: { surfaceId: 'ya-2', path: '/depositCalc/tariffName', value: 'Поздний' } }] })); });
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') return JSON.parse(init!.body as string).name === 'deposit.recalc' ? recalc : json({ kind: 'screen', refresh: [], screen: deposit });
      if (url === '/api/turn/young-adult') return json(answer('ya-3'));
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    mountPhone();
    fireEvent.click(await bannerButton());
    fireEvent.change(await screen.findByRole('slider', { name: 'Срок' }), { target: { value: '24' } });
    await waitFor(() => expect(bodies(fetchMock, '/api/action/young-adult').map((b) => b.name)).toContain('deposit.recalc'));
    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'А вклад выгоднее?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    expect(bodies(fetchMock, '/api/turn/young-adult').map((b) => b.text)).toEqual(['А вклад выгоднее?']);
    finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(/Поздний/)).toBeNull();
  });

  it('a tap during an unresolved recalculation sends its action', async () => {
    let finish!: () => void;
    const recalc = new Promise<Response>((r) => { finish = () => r(new Response('x', { status: 500 })); });
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url !== '/api/action/young-adult') return new Response('not found', { status: 404 });
      const { name } = JSON.parse(init!.body as string);
      return name === 'deposit.recalc' ? recalc : json({ kind: 'screen', refresh: [], screen: name === 'chat.open' ? deposit : answer('ya-3') });
    });
    vi.stubGlobal('fetch', fetchMock);
    mountPhone();
    fireEvent.click(await bannerButton());
    fireEvent.change(await screen.findByRole('slider', { name: 'Срок' }), { target: { value: '24' } });
    await waitFor(() => expect(bodies(fetchMock, '/api/action/young-adult').map((b) => b.name)).toContain('deposit.recalc'));
    fireEvent.click(screen.getByRole('button', { name: /^Открыть на/ }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    expect(bodies(fetchMock, '/api/action/young-adult').at(-1)).toMatchObject({ name: 'product.open', context: { productId: 'deposit', months: 24 } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    finish();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
    warn.mockRestore();
  });

  it('a recalculation that answers with a screen shows nothing', async () => {
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url !== '/api/action/young-adult') return new Response('not found', { status: 404 });
      return json({ kind: 'screen', refresh: [], screen: JSON.parse(init!.body as string).name === 'deposit.recalc' ? answer('ya-3') : deposit });
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountPhone();
    fireEvent.click(await bannerButton());
    fireEvent.change(await screen.findByRole('slider', { name: 'Срок' }), { target: { value: '24' } });
    await waitFor(() => expect(warn).toHaveBeenCalledWith('recalc failed', 'young-adult', expect.any(Error)));
    expect(screen.queryByText('На что копишь?')).toBeNull();
    warn.mockRestore();
  });

  it('a failed action shows the failed-answer card and «Повторить» sends the same action again', async () => {
    const fetchMock = stub(['/api/action/young-adult']);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPhone();
    fireEvent.click(await bannerButton());
    expect(await screen.findByText('Не получилось ответить')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    const sent = bodies(fetchMock, '/api/action/young-adult');
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    expect(screen.queryByText('Не получилось ответить')).toBeNull();
    err.mockRestore();
  });

  it('a failed message is sent again with the same text and no second bubble', async () => {
    const fetchMock = stub(['/api/turn/young-adult']);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPhone();
    fireEvent.click(await bannerButton());
    await screen.findByText('На что копишь?');
    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'Хочу квартиру' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Не получилось ответить')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await vi.waitFor(() => expect(screen.getAllByText('На что копишь?')).toHaveLength(2));
    expect(bodies(fetchMock, '/api/turn/young-adult').map((b) => b.text)).toEqual(['Хочу квартиру', 'Хочу квартиру']);
    expect(screen.getAllByText('Хочу квартиру')).toHaveLength(1);
    // Лиза's bubble carries the time it was sent.
    expect(screen.getByText('Хочу квартиру').parentElement!.textContent).toMatch(/\d{2}:\d{2}$/);
    err.mockRestore();
  });

  it('scrolls the chat container to the top of a new answer, never the page', async () => {
    stub();
    const scrolls: { el: HTMLElement; opts: ScrollToOptions }[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value(this: HTMLElement, opts: ScrollToOptions) { scrolls.push({ el: this, opts }); } });
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get() { return this.tagName === 'ARTICLE' ? 500 : 0; } });
    const origScrollTo = HTMLElement.prototype.scrollTo;
    const origIntoView = Element.prototype.scrollIntoView;
    const windowScroll = vi.fn();
    vi.stubGlobal('scrollTo', windowScroll);
    const intoView = vi.fn();
    Element.prototype.scrollIntoView = intoView;
    try {
      mountPhone();
      fireEvent.click(await bannerButton());
      await screen.findByText('На что копишь?');
      await waitFor(() => expect(scrolls.some((s) => s.opts.top === 492)).toBe(true));
      const hit = scrolls.find((s) => s.opts.top === 492)!;
      expect(hit.el.className).toContain('overflow-y-auto');
      expect(hit.opts.behavior).toBe('smooth');
      expect(windowScroll).not.toHaveBeenCalled();
      expect(intoView).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollTo = origScrollTo;
      delete (HTMLElement.prototype as { offsetTop?: unknown }).offsetTop;
      Element.prototype.scrollIntoView = origIntoView;
    }
  });

  it('an earlier turn is read-only but stays readable, and its action row is hidden whole, so no gap is left', async () => {
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: deposit });
      if (url === '/api/turn/young-adult') return json(answer('ya-3'));
      return new Response('not found', { status: 404 });
    }));
    mountPhone();
    fireEvent.click(await bannerButton());
    await screen.findByRole('slider', { name: 'Срок' });
    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'А что с тратами?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await screen.findByText('На что копишь?');
    const [earlier, latest] = Array.from(document.querySelectorAll('main > article'));
    const [fsEarlier, fsLatest] = [earlier, latest].map((a) => a.querySelector(':scope > fieldset') as HTMLFieldSetElement);
    expect(fsEarlier.disabled).toBe(true);
    expect(fsLatest.disabled).toBe(false);
    expect(earlier.hasAttribute('inert')).toBe(false);
    // Still in the accessibility tree: the earlier answer is found by role.
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('slider', { name: 'Срок' })).toBeTruthy(); // the earlier calculator, read-only
    expect(earlier.querySelector('[data-slot="actions"]')).toBeTruthy();
    expect(fsEarlier.className).toContain('[&[disabled]_[data-slot=actions]]:hidden');
    // The new answer takes the focus, without scrolling the page.
    await waitFor(() => expect(document.activeElement).toBe(latest));
  });

  it('a new answer leaves the focus in the message field while Лиза is typing', async () => {
    const deposit = screenResult('young-adult', 'ya-2', [root('d'), { id: 'd', component: 'DepositCalculator', deposit: { path: '/depositCalc' } }], dm());
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: deposit });
      if (url === '/api/turn/young-adult') return json(answer('ya-3'));
      return new Response('not found', { status: 404 });
    }));
    mountPhone();
    fireEvent.click(await bannerButton());
    await screen.findByRole('slider', { name: 'Срок' });
    const field = screen.getByPlaceholderText('Сообщение');
    field.focus();
    fireEvent.change(field, { target: { value: 'А что с тратами?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' })); // jsdom keeps the focus where it was
    await screen.findByText('На что копишь?');
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.activeElement).toBe(field);
  });

  it('the view switch moves focus to the view: the chat heading, then the home slot', async () => {
    stub();
    mountPhone();
    fireEvent.click(await bannerButton());
    await screen.findByText('На что копишь?');
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    await bannerButton();
    await waitFor(() => expect(document.activeElement?.tagName).toBe('MAIN'));
    expect(document.activeElement!.contains(screen.getByRole('button', { name: /Составить план/ }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Составить план/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Первые деньги' })));
  });

  it('says aloud that an answer is on its way', async () => {
    let answerNow!: () => void;
    const pending = new Promise<Response>((r) => { answerNow = () => r(json({ kind: 'screen', refresh: [], screen: answer('ya-2') })); });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/screen/young-adult' ? json(banner()) : pending)));
    mountPhone();
    fireEvent.click(await bannerButton());
    expect((await screen.findByRole('status', { name: 'Ответ готовится' })).textContent).toContain('Ответ готовится…');
    answerNow();
    await screen.findByText('На что копишь?');
  });

  it('an answer that cannot be drawn shows a one-line card, and the chat goes on', async () => {
    // WaysToGoal with a set the data lacks throws while rendering.
    const broken = screenResult('young-adult', 'ya-2', [root('w'), { id: 'w', component: 'WaysToGoal', ways: { path: '/ways' }, set: 'big' }], { ...dm(), ways: { title: 'Пути', suggested: 'big' } });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: broken });
      if (url === '/api/turn/young-adult') return json(answer('ya-3'));
      return new Response('not found', { status: 404 });
    }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPhone();
    fireEvent.click(await bannerButton());
    expect(await screen.findByText('Не получилось показать ответ')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'Ещё раз' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('На что копишь?')).toBeTruthy();
    err.mockRestore();
  });

  it('an answer under an id the phone already holds (a server restart) replaces it instead of failing', async () => {
    const again = screenResult('young-adult', 'ya-2', [root('t'), { id: 't', component: 'Text', text: 'Снова здесь', variant: 'body' }], dm());
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/screen/young-adult') return json(banner());
      if (url === '/api/action/young-adult') return json({ kind: 'screen', refresh: [], screen: answer('ya-2') });
      if (url === '/api/turn/young-adult') return json(again);
      return new Response('not found', { status: 404 });
    }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPhone();
    fireEvent.click(await bannerButton());
    await screen.findByText('На что копишь?');
    fireEvent.change(screen.getByPlaceholderText('Сообщение'), { target: { value: 'Привет' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(await screen.findByText('Снова здесь')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('a failed reset is logged and said on the page, and nothing reloads', async () => {
    stub(['/api/reset']);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    await bannerButton();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить демо' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Не получилось сбросить, попробуй ещё раз');
    expect(err).toHaveBeenCalledWith('reset failed', expect.any(Error));
    err.mockRestore();
  });
});
