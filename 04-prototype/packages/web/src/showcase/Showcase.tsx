import { useMemo } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { PhoneFrame } from '../ui';
import { HomeScreen } from '../phone/HomeScreen';
import { showcaseCases, type ShowcaseCase } from './fixtures';
import { mountSurface } from './mount';

const VARIANT_LABEL: Record<ShowcaseCase['variant'], string> = {
  normal: 'обычный',
  'long-text': 'длинный текст',
  'no-data': 'нет данных — виджет скрыт',
};

const log = (a: unknown) => console.info('showcase action', a);

/** One case in the phone's content column (374 px on the chat background). */
function Case({ c }: { c: ShowcaseCase }) {
  const surface = useMemo(() => mountSurface(c.components, c.data, log), [c]);
  return (
    <figure className="flex max-w-full flex-col gap-2">
      <figcaption className="text-caption text-muted">{[VARIANT_LABEL[c.variant], c.note].filter(Boolean).join(' · ')}</figcaption>
      <div className="min-h-12 w-[374px] max-w-full bg-background p-2">
        <A2uiSurface surface={surface} />
      </div>
    </figure>
  );
}

/** The home view with the banner in its slot: chrome, not a catalog widget, so it is outside showcaseCases(). */
function HomeScreenGroup() {
  const banner = useMemo(
    () => {
      const first = showcaseCases().find((c) => c.component === 'FirstMoneyBanner' && c.variant === 'normal')!;
      return mountSurface(first.components, first.data, log);
    },
    [],
  );
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-title">HomeScreen</h3>
      <PhoneFrame persona={{ name: 'Главный экран с баннером' }}>
        <HomeScreen slot={<A2uiSurface surface={banner} />} />
      </PhoneFrame>
    </section>
  );
}

/** Team-only: every young-adult widget in every state, without the model. */
export function Showcase() {
  const cases = useMemo(() => showcaseCases(), []);
  const groups = useMemo(() => {
    const map = new Map<string, ShowcaseCase[]>();
    for (const c of cases) map.set(c.component, [...(map.get(c.component) ?? []), c]);
    return [...map];
  }, [cases]);
  return (
    <main className="flex min-h-screen flex-col gap-10 bg-page px-6 py-8">
      <h2 className="font-display text-title">Каталог виджетов</h2>
      {groups.map(([name, list]) => (
        <section key={name} aria-label={name} className="flex flex-col gap-3">
          <h3 className="font-display text-title">{name}</h3>
          <div className="flex flex-wrap items-start gap-6">
            {list.map((c, i) => <Case key={`${c.variant}-${i}`} c={c} />)}
          </div>
        </section>
      ))}
      <HomeScreenGroup />
    </main>
  );
}
