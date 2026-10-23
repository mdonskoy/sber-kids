import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { Button, Input, TextField } from '@heroui/react';
import { ShowChat } from '../catalog/ui';
import { useDebug } from '../debug/DebugContext';
import { ActionButton, AlertIcon, BackIcon, PhoneFrame, SendIcon } from '../ui';
import { onReload } from './bus';
import { HomeScreen } from './HomeScreen';
import { Skeleton } from './Skeleton';
import { usePhone } from './usePhone';

export interface Persona { name: string; subtitle: string }

const ROLE = 'young-adult' as const;
const hhmm = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** The answer did not come (Chrome board, view 4); «Повторить» sends the same request again. */
function FailedAnswer({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mt-4 flex flex-col gap-5 rounded-card bg-surface px-4 pt-5 pb-4">
      <div className="flex items-start gap-3">
        <span className="text-danger"><AlertIcon /></span>
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-semibold">Не получилось ответить</span>
          <span className="text-secondary text-muted">Связь прервалась. Попробуй ещё раз — твои данные не изменились.</span>
        </div>
      </div>
      <ActionButton kind="secondary" onPress={onRetry}>Повторить</ActionButton>
    </div>
  );
}

/** One answer that throws while rendering takes only its own card down, not the phone. */
class AnswerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('answer render failed', error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="rounded-card bg-surface px-4 py-3 text-secondary text-muted">Не получилось показать ответ</div>;
  }
}

/** The answer is on its way (Chrome board, view 3): three dots and one card-shaped skeleton. */
function Waiting() {
  return (
    <div role="status" aria-label="Ответ готовится" className="mt-4 flex flex-col gap-2">
      <span className="sr-only">Ответ готовится…</span>
      <div aria-hidden="true" className="flex gap-1.5 self-start rounded-card bg-surface px-[18px] py-4">
        <span className="size-2 rounded-full bg-white" />
        <span className="size-2 rounded-full bg-muted" />
        <span className="size-2 rounded-full bg-[#45464C]" />
      </div>
      <Skeleton />
    </div>
  );
}

export function ChatPhone({ persona }: { persona: Persona }) {
  const debug = useDebug();
  const phone = usePhone(ROLE, { onDebug: (d) => debug.report(ROLE, d), overrides: () => debug.take(ROLE), append: true });
  const [text, setText] = useState('');
  const [view, setView] = useState<'home' | 'chat'>('home');
  const chatMain = useRef<HTMLElement>(null);
  const chatHeading = useRef<HTMLHeadingElement>(null);
  const homeMain = useRef<HTMLElement>(null);
  const seen = useRef({ len: 0, busy: false, error: false, view: 'home' as 'home' | 'chat' });
  const started = useRef(false);

  useEffect(() => {
    // Append mode: StrictMode's double effect would otherwise put two banners in the feed.
    if (started.current) return;
    started.current = true;
    void phone.load('first-money-home');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Scrolls the chat's own container, never the page: a new answer starts at its top edge,
  // Лиза's bubble and the waiting/failed states go to the bottom.
  // Focus follows: a new answer takes it (unless the message field has it), and a view switch hands it to the view (the chat heading, the home slot).
  useLayoutEffect(() => {
    const prev = seen.current;
    const grew = phone.feed.length > prev.len;
    const entered = view === 'chat' && prev.view !== 'chat';
    const waiting = (phone.busy && !prev.busy) || (!!phone.error && !prev.error);
    seen.current = { len: phone.feed.length, busy: phone.busy, error: !!phone.error, view };
    if (view === 'home' && prev.view === 'chat') homeMain.current?.focus({ preventScroll: true });
    const main = chatMain.current;
    if (!main || view !== 'chat') return;
    const last = phone.feed[phone.feed.length - 1];
    const answer = grew && last?.kind === 'surface' && phone.feed.length > 1;
    if (entered && !answer) chatHeading.current?.focus({ preventScroll: true });
    if (!answer && !grew && !waiting && !entered) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    // The surface may fill in after the feed changes: measure on the next frame.
    requestAnimationFrame(() => {
      if (answer) {
        const article = main.querySelector<HTMLElement>(':scope > article:last-of-type');
        // Not while Лиза is typing: the message field keeps its focus.
        if (!document.activeElement?.matches('textarea, input:not([type=range])')) article?.focus({ preventScroll: true });
        if (article) return main.scrollTo({ top: Math.max(0, article.offsetTop - 8), behavior });
      }
      main.scrollTo({ top: main.scrollHeight, behavior });
    });
  }, [phone.feed.length, phone.busy, phone.error, view]); // eslint-disable-line react-hooks/exhaustive-deps
  // Every action or turn answers in the chat: the banner's chat.open opens it with the waiting state.
  useEffect(() => {
    if (phone.busy) setView('chat');
  }, [phone.busy]);

  // Debug «Повторить экран»: before the chat starts, reload the banner; after, regenerate the latest turn.
  const feedRef = useRef(phone.feed);
  feedRef.current = phone.feed;
  useEffect(
    () => onReload(ROLE, () => void (feedRef.current.length <= 1 ? phone.load('first-money-home') : phone.send('', { bubble: false }))),
    [phone.load, phone.send],
  );
  const lastSurface = phone.feed.reduce((last, item, i) => (item.kind === 'surface' ? i : last), -1);
  // The first surface is the home banner; everything after it is the chat.
  const home = phone.feed[0]?.kind === 'surface' ? phone.feed[0].surface : null;
  const chat = home ? phone.feed.slice(1) : phone.feed;
  const chatStarted = chat.length > 0;
  const blocked = phone.busy || phone.loading;
  const retry = () => void phone.retry();

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    // Another answer may still be on its way: then nothing was sent, and the text goes back into the field.
    void phone.send(t).then((accepted) => {
      if (!accepted) setText((now) => now || t);
    });
  };

  return (
    <PhoneFrame persona={persona}>
      <div hidden={view !== 'home'} className="flex min-h-0 flex-1 flex-col">
        <HomeScreen
          slot={
            <main ref={homeMain} tabIndex={-1} aria-busy={phone.loading} className="flex flex-col gap-3 outline-none">
              {home && (
                // Once the chat exists, the banner shows it again instead of a second chat.open.
                <ShowChat.Provider value={chatStarted ? () => setView('chat') : null}>
                  <AnswerBoundary key={home.id}>
                    <A2uiSurface surface={home} />
                  </AnswerBoundary>
                </ShowChat.Provider>
              )}
              {phone.loading && <Skeleton />}
              {phone.failed === 'load' && <FailedAnswer onRetry={retry} />}
            </main>
          }
        />
      </div>

      <div hidden={view !== 'chat'} className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 px-2">
          <Button isIconOnly variant="ghost" aria-label="Назад" className="size-11 rounded-control text-foreground" onPress={() => setView('home')}>
            <BackIcon />
          </Button>
          <h2 ref={chatHeading} tabIndex={-1} className="font-display text-title outline-none">Первые деньги</h2>
        </header>
        <main ref={chatMain} aria-busy={phone.busy} className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pt-2 pb-3">
          <span className="self-center pt-1 pb-2 text-caption text-muted">Сегодня</span>
          {chat.map((item) =>
            item.kind === 'user' ? (
              <div key={item.id} className="flex max-w-[80%] flex-col gap-0.5 self-end rounded-card bg-default px-4 pt-3 pb-2">
                <span className="text-body">{item.text}</span>
                <span className="self-end text-caption text-muted">{hhmm.format(item.sentAt)}</span>
              </div>
            ) : (
              // Earlier turns stay readable at full contrast but are read-only and lose their buttons;
              // the server also rejects their actions.
              <article key={item.surface.id} tabIndex={-1} className="mt-4 flex flex-col outline-none">
                <fieldset
                  disabled={phone.feed.indexOf(item) !== lastSurface}
                  className="m-0 flex min-w-0 flex-col border-0 p-0 [&[disabled]_.slider\_\_track]:pointer-events-none [&[disabled]_button:not([data-banner])]:hidden [&[disabled]_[data-slot=actions]]:hidden"
                >
                  <AnswerBoundary>
                    <A2uiSurface surface={item.surface} />
                  </AnswerBoundary>
                </fieldset>
              </article>
            ),
          )}
          {phone.busy && <Waiting />}
          {phone.error && phone.failed !== 'load' && <FailedAnswer onRetry={retry} />}
        </main>
        <form className="flex shrink-0 gap-2 px-2 pt-2 pb-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <TextField className="flex-1" aria-label="Сообщение" value={text} onChange={setText} isDisabled={blocked}>
            <Input placeholder="Сообщение" maxLength={500} className="h-13 w-full rounded-card border-0 bg-surface px-4 text-body shadow-none placeholder:text-muted" />
          </TextField>
          <Button type="submit" isIconOnly aria-label="Отправить" isDisabled={blocked} className="size-13 rounded-full">
            <SendIcon />
          </Button>
        </form>
      </div>
    </PhoneFrame>
  );
}
