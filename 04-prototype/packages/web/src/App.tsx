import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { api } from './api';
import { DebugProvider } from './debug/DebugContext';
import { DebugPanel } from './debug/DebugPanel';
import { ChatPhone, type Persona } from './phone/ChatPhone';
import { Showcase } from './showcase/Showcase';

export const PERSONAS: Record<'young-adult', Persona> = { 'young-adult': { name: 'Лиза, 19 лет', subtitle: 'СберБанк Онлайн' } };

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onHash = () => setHash(location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const catalog = hash === '#/catalog';
  const [resetFailed, setResetFailed] = useState(false);
  // Reload only once the server has reset: a failed reset leaves the page as it was and says so.
  const reset = () => {
    setResetFailed(false);
    api
      .reset()
      .then(() => location.reload())
      .catch((e) => {
        console.error('reset failed', e);
        setResetFailed(true);
      });
  };
  return (
    <DebugProvider>
      <header className="flex flex-wrap items-center gap-4 bg-[#151618] px-6 py-4 shadow-[0_1px_0_#34353A]">
        <img src="/sber-logo.svg" alt="Сбер" className="h-8" />
        <h1 className="font-display text-title">Прототип: «Первые деньги»</h1>
        {resetFailed && <span role="alert" className="ml-auto text-secondary text-danger">Не получилось сбросить, попробуй ещё раз</span>}
        <Button variant="secondary" className={`${resetFailed ? '' : 'ml-auto '}h-11 rounded-control text-secondary font-semibold [--button-fg:var(--foreground)]`} onPress={reset}>
          Сбросить демо
        </Button>
      </header>
      {catalog ? <Showcase /> : <div className="flex justify-center sm:px-4 sm:py-8"><ChatPhone persona={PERSONAS['young-adult']} /></div>}
      <DebugPanel showcase={catalog} />
    </DebugProvider>
  );
}
