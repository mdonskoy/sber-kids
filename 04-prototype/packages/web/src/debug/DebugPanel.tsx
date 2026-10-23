import { useEffect, useState } from 'react';
import { Button, Disclosure } from '@heroui/react';
import { FORCE_STATES, MODEL_CHOICES, ROLES, type ForceState, type ModelChoice, type TelemetrySummary } from '@proto/catalog';
import { api } from '../api';
import { emitReload } from '../phone/bus';
import { StatusChip } from '../ui';
import { useDebug } from './DebugContext';

const FORCE_LABELS: Record<ForceState, string> = {
  none: 'Обычный',
  loading: 'Долгая загрузка',
  model_error: 'Сбой модели → запасной экран',
  refusal: 'Отказ',
  handoff: 'Передать человеку',
  injection_text: 'Инъекция в запросе',
  injection_recipe: 'Подмена ответа модели',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
const OUTCOME_TONE = { model: 'success', cached: 'success', static: 'success', retry: 'warning', fallback: 'warning', blocked: 'warning' } as const;

export function DebugPanel({ showcase = false }: { showcase?: boolean }) {
  const debug = useDebug();
  const [open, setOpen] = useState(false);
  const role = 'young-adult' as const;
  const [totals, setTotals] = useState<TelemetrySummary | null>(null);

  useEffect(() => {
    if (open) api.telemetry().then((t) => setTotals(t.summary)).catch(() => setTotals(null));
  }, [open, debug.state.reports]);

  const retry = () => emitReload(role);

  return (
    <Disclosure className="mx-auto mb-8 max-w-5xl rounded-control bg-[#151618] px-4 text-secondary" isExpanded={open} onExpandedChange={setOpen}>
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex h-12 w-full items-center gap-2 font-semibold">
          Отладка (для команды)
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="flex flex-col gap-3 pb-4">
          <a className="font-semibold text-success underline" href={showcase ? '#/' : '#/catalog'}>{showcase ? 'К телефону' : 'Каталог виджетов'}</a>
          <div className="flex flex-wrap items-center gap-3 [&_select]:rounded-md [&_select]:bg-default [&_select]:px-2 [&_select]:py-1">
            <label>Следующий запрос{' '}
              <select aria-label="Следующий запрос" value={debug.state.force[role]} onChange={(e) => debug.setForce(role, e.target.value as ForceState)}>
                {FORCE_STATES.map((f) => <option key={f} value={f}>{FORCE_LABELS[f]}</option>)}
              </select>
            </label>
            <label>Модель{' '}
              <select aria-label="Модель" value={debug.state.model} onChange={(e) => debug.setModel(e.target.value as ModelChoice | 'default')}>
                <option value="default">по умолчанию (сервер)</option>
                {MODEL_CHOICES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <Button variant="secondary" className="rounded-control text-foreground" onPress={retry}>Повторить экран</Button>
          </div>

          {totals && (
            <p>
              Всего экранов с моделью: {totals.screens} · валидно с первого раза: {pct(totals.firstTryValidRate)} · запасной экран: {pct(totals.fallbackRate)} ·
              заблокировано: {totals.blocked} · p50 {totals.p50LatencyMs} мс · p95 {totals.p95LatencyMs} мс · ${totals.totalCostUsd.toFixed(4)}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {ROLES.map((r) => {
              const d = debug.state.reports[r];
              if (!d) return null;
              return (
                <section key={r}>
                  <h4 className="flex items-center gap-2 font-semibold">{r} · <StatusChip tone={OUTCOME_TONE[d.outcome]}>{d.outcome}</StatusChip></h4>
                  <p>
                    {d.model} · {d.latencyMs} мс · токены {d.usage.inputTokens}/{d.usage.outputTokens} · кэш {d.usage.cacheReadTokens}/{d.usage.cacheWriteTokens} · ${d.costUsd.toFixed(4)}
                  </p>
                  {d.attempts.map((a, i) => (
                    <p key={i}>
                      Попытка {i + 1}: {a.error ?? (a.valid ? 'валидна' : a.issues.map((x) => `${x.code}: ${x.message}`).join('; '))}
                      {a.policyViolation && ' — нарушение политики, заблокировано'}
                    </p>
                  ))}
                  <pre className="max-h-96 overflow-auto rounded-md bg-background p-2 text-caption">{JSON.stringify(d.recipe, null, 2)}</pre>
                </section>
              );
            })}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
