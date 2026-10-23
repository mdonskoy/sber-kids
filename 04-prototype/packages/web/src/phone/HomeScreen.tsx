import type { ReactNode } from 'react';
import { LIZA } from '@proto/mocks';
import { rub } from '../ui';

const whole = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const TABS = ['Главный', 'Накопления', 'Для жизни', 'Платежи', 'Кредиты'];

/** A history line of the decorative home: round icon, name, muted meta, amount. */
function HistoryRow({ icon, name, meta, amount, positive }: { icon: ReactNode; name: string; meta: string; amount: string; positive?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-default">{icon}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body">{name}</span>
        <span className="text-secondary text-muted">{meta}</span>
      </div>
      <span className={`whitespace-nowrap text-body font-semibold tabular-nums ${positive ? 'text-success' : ''}`}>{amount}</span>
    </div>
  );
}

/**
 * The bank's home screen as Лиза sees it (Chrome board, view 1). Decorative and not interactive;
 * `slot` is where the model-composed home surface renders, in place of an ad.
 */
export function HomeScreen({ slot }: { slot: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(120%_45%_at_15%_0%,#0D4A3B_0%,#0F2B26_35%,#0F0F10_70%)]">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pt-3 pb-4">
        <div aria-hidden="true" className="flex items-center gap-2">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-white/8">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="8" r="3.5" /><path d="M4.5 18c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /></svg>
          </div>
          <div className="flex h-11 flex-1 items-center rounded-control bg-white/8 px-3.5 text-body text-muted">Поиск</div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-white/8">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 5.5h14v9H9l-4 3v-3H4z" /></svg>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-2">
          <span className="text-secondary text-foreground/75">В кошельке</span>
          <span className="whitespace-nowrap font-display text-amount tabular-nums">
            {whole.format(LIZA.salary)}<span className="text-muted">,00</span> ₽
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex h-29 flex-col justify-between rounded-card bg-white/8 p-3.5">
            <div aria-hidden="true" className="h-6 w-9 rounded-md bg-[#D9DCE1]" />
            <div className="flex flex-col">
              <span className="whitespace-nowrap text-body font-semibold tabular-nums">{rub(LIZA.salary)}</span>
              <span className="text-caption text-muted">Дебетовая •• 4665</span>
            </div>
          </div>
          <div className="flex h-29 flex-col justify-between rounded-card bg-white/8 p-3.5">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#21A038" strokeWidth="1.8"><rect x="4" y="6" width="20" height="17" rx="3" /><circle cx="14" cy="14.5" r="3.5" /></svg>
            <div className="flex flex-col">
              <span className="text-body font-semibold">Накопления</span>
              <span className="text-caption text-muted">Пока пусто</span>
            </div>
          </div>
        </div>

        {slot}

        <section className="flex flex-col gap-4 rounded-card bg-surface p-4">
          <div className="flex items-center">
            <h2 className="font-display text-title">История</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-8 items-center rounded-control bg-default px-3 text-secondary">Ещё</span>
          </div>
          <HistoryRow
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#21A038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l-8 8M6 8.5V14h5.5" /></svg>}
            name="Зарплата"
            meta="Сегодня · Поступления"
            amount={`+${rub(LIZA.salary)}`}
            positive
          />
          <HistoryRow
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#FFFFFF" strokeWidth="1.6"><rect x="3.5" y="5" width="13" height="10" rx="2" /><path d="M3.5 8.5h13" /></svg>}
            name="Обслуживание карты"
            meta="27 сентября · Комиссии"
            amount="150 ₽"
          />
        </section>
      </div>

      <div aria-hidden="true" className="grid h-16 shrink-0 grid-cols-5 bg-[#151618] shadow-[0_-1px_0_#26272B]">
        {TABS.map((t, i) => (
          <div key={t} className={`flex flex-col items-center justify-center gap-1 text-[12px] leading-4 ${i === 0 ? 'text-success' : 'text-muted'}`}>
            <span className="size-[22px] rounded-[7px] border-2 border-current" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
