import { describe, expect, it } from 'vitest';
import { CATALOGS } from '@proto/catalog';
import { createStore } from '@proto/mocks';
import { SCENARIOS_DIR, ScenarioRegistry, Surfaces, Telemetry, generateScreen, type ScreenEvent } from '@proto/server';
import { parseArgs } from '../src/args';
import { buildMatrix, estimateCostUsd } from '../src/matrix';
import { independentLeaks, leakedToClient, modelError, renderReport, validatorIssues, type CaseResult } from '../src/report';

const scenarios = new ScenarioRegistry(SCENARIOS_DIR);

describe('eval harness', () => {
  it('parses defaults and overrides', () => {
    expect(parseArgs([])).toMatchObject({ models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'], n: 3, roles: ['young-adult'], effort: 'medium', dryRun: false });
    expect(parseArgs(['--models', 'claude-haiku-5-5', '--n', '2', '--dry-run', '--label', 'x'])).toMatchObject({ models: ['claude-haiku-5-5'], n: 2, dryRun: true, label: 'x' });
    expect(() => parseArgs(['--models', 'gpt-5'])).toThrow();
  });

  it('builds every model × scenario × N, one injection case and one case per widget', () => {
    const cases = buildMatrix(parseArgs(['--models', 'claude-opus-5-5,claude-haiku-5-5', '--n', '2']), scenarios);
    // home, chat, one injection, and seven widget cases → 10 per model per rep
    expect(cases).toHaveLength(2 * 10 * 2);
    expect(cases.filter((c) => c.force === 'injection_text')).toHaveLength(2 * 1 * 2);
    expect(cases.filter((c) => c.expect).map((c) => c.expect)).toEqual(expect.arrayContaining(['GoalSetup', 'WaysToGoal', 'DepositCalculator', 'SavingsAccountCalculator', 'PiggyBankCalculator', 'LoanCompare', 'InvestSim']));
    expect(cases.find((c) => c.expect === 'GoalSetup')).toMatchObject({ setup: { goal: 'apartment' }, userText: 'Моя цель: Первый взнос на квартиру' });
    expect(cases.find((c) => c.expect === 'GoalSetup')!.setup).not.toHaveProperty('target');
    expect(cases.find((c) => c.expect === 'WaysToGoal')).toMatchObject({ setup: { goal: 'apartment', target: { amount: 1500000, months: 36 } }, userText: '1 500 000 ₽ за 36 мес.' });
    expect(cases.find((c) => c.expect === 'PiggyBankCalculator')).toMatchObject({ setup: { goal: 'vacation', target: { amount: 80000, months: 6 }, way: 'piggy' }, userText: 'Хочу посмотреть: Копилка' });
    expect(cases.find((c) => c.expect === 'LoanCompare')).toMatchObject({ setup: { goal: 'car', target: { amount: 600000, months: 12 }, way: 'loan' }, userText: 'Хочу посмотреть: Копить или взять кредит' });
    expect(cases.find((c) => c.expect === 'InvestSim')).toMatchObject({ setup: { goal: 'apartment', target: { amount: 1500000, months: 36 }, way: 'invest' }, userText: 'Хочу посмотреть: Инвестиции' });
    expect(estimateCostUsd(cases.filter((c) => c.model === 'claude-haiku-5-5'))).toBeLessThan(estimateCostUsd(cases.filter((c) => c.model === 'claude-opus-5-5')));
  });

  it('reports per widget: valid on the first try and shown', () => {
    const event = (firstTryValid: boolean) => ({ firstTryValid, outcome: 'model', policyViolations: 0, latencyMs: 1, costUsd: 0, usage: {} }) as unknown as ScreenEvent;
    const c = (expect: string, rep: number) => ({ model: 'claude-haiku-5-5', role: 'young-adult', scenarioId: 'first-money-chat', force: 'none', rep, expect }) as CaseResult['case'];
    const md = renderReport(parseArgs(['--models', 'claude-haiku-5-5', '--n', '2']), [
      { case: c('DepositCalculator', 0), event: event(true), leaked: false, shown: true },
      { case: c('DepositCalculator', 1), event: event(false), leaked: false, shown: false },
    ]);
    expect(md).toContain('## Виджеты');
    expect(md).toContain('| claude-haiku-5-5 | DepositCalculator | 2 | 50% | 50% |');
  });

  it('detects a screen that should never have reached the client', () => {
    const msg = (components: unknown[], value: unknown) => ({
      surfaceId: 's',
      messages: [
        { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: CATALOGS['young-adult'].id } },
        { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value } },
        { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
      ],
      debug: { outcome: 'model' },
    }) as any;
    const root = (c: string) => ({ id: 'root', component: 'Column', children: [c] });
    expect(leakedToClient(msg([root('t'), { id: 't', component: 'Text', text: 'Привет', variant: 'body' }], {}), 'young-adult')).toBe(false);
    expect(leakedToClient(msg([root('o'), { id: 'o', component: 'Timetable', day: { path: '/o' } }], { o: {} }), 'young-adult')).toBe(true);

    // The independent check flags the same screens without using the validator.
    expect(independentLeaks(msg([root('t'), { id: 't', component: 'Text', text: 'Привет', variant: 'body' }], {}), 'young-adult')).toEqual([]);
    expect(independentLeaks(msg([root('o'), { id: 'o', component: 'Timetable', day: { path: '/o' } }], {}), 'young-adult')).toEqual(['Timetable is not in the young-adult catalog']);
    expect(independentLeaks(msg([root('m'), { id: 'm', component: 'WaysToGoal', ways: [{ target: 100000 }], set: 'big' }], {}), 'young-adult')).toEqual(['WaysToGoal.ways is a literal, not a binding']);
    expect(independentLeaks(msg([root('t'), { id: 't', component: 'Text', text: 'Баланс 500', variant: 'body' }], {}), 'young-adult')).toEqual(['Text.text has digits']);
  });

  it('renders a report row per model', () => {
    const ev = (over: Partial<ScreenEvent>): ScreenEvent => ({
      ts: '', requestId: '', role: 'young-adult', scenarioId: 'first-money-home', model: 'claude-opus-5-5', outcome: 'model', modelCalled: true, firstTryValid: true,
      retried: false, policyViolations: 0, issueCodes: [], latencyMs: 4000, modelLatencyMs: 3900,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.02, ...over,
    });
    const results: CaseResult[] = [
      { case: { model: 'claude-opus-5-5', role: 'young-adult', scenarioId: 'first-money-home', force: 'none', rep: 0 }, event: ev({}), leaked: false },
      { case: { model: 'claude-opus-5-5', role: 'young-adult', scenarioId: 'first-money-home', force: 'injection_text', rep: 0 }, event: ev({ outcome: 'blocked', firstTryValid: false, policyViolations: 1 }), leaked: false, refused: true },
    ];
    const md = renderReport(parseArgs(['--models', 'claude-opus-5-5']), results);
    expect(md).toContain('| claude-opus-5-5 | 2 | 100% | 0% | 1 | 0 | 100% | 4000 | 4000 | $0.0200 | 0 |');

    const withError: CaseResult = { case: { ...results[1].case, rep: 1 }, event: null, leaked: false, error: 'timeout' };
    expect(renderReport(parseArgs(['--models', 'claude-opus-5-5']), [...results, withError])).toContain('| 1 | 0 | 50% |');
  });

  const throwingDeps = (): Parameters<typeof generateScreen>[1] => ({
    store: createStore(),
    models: { screen: 'claude-opus-5-5', chat: 'claude-opus-5-5', get: () => ({ generate: async () => { throw new Error('usage limit reached'); } }) as any },
    telemetry: new Telemetry(),
    scenarios,
    surfaces: new Surfaces(),
    sleep: async () => {},
  });

  it('counts a model call that threw as an error, not as a fallback', async () => {
    const r = await generateScreen({ role: 'young-adult', scenarioId: 'first-money-home', model: 'claude-opus-5-5' }, throwingDeps());
    expect(r.debug.outcome).toBe('fallback'); // what the pipeline reports
    expect(modelError(r)).toBe('usage limit reached');
    expect(modelError({ ...r, debug: { ...r.debug, attempts: [{ ...r.debug.attempts[0], stopReason: 'refusal' }] } })).toBeUndefined();

    const err: CaseResult = { case: { model: 'claude-opus-5-5', role: 'young-adult', scenarioId: 'first-money-home', force: 'none', rep: 0 }, event: null, leaked: false, error: modelError(r) };
    const md = renderReport(parseArgs(['--models', 'claude-opus-5-5']), [err, { ...err, case: { ...err.case, rep: 1 } }]);
    expect(md).toContain('| claude-opus-5-5 | 0 | — | — | 0 | 0 | — | — | — | — | 2 |');
    expect(md).toContain('- usage limit reached (×2)');
  });

  it('flags bare numbers and booleans, and passes a server-built screen', async () => {
    const msg = (components: unknown[]) => ({ messages: [{}, { updateDataModel: { value: {} } }, { updateComponents: { components } }], debug: { outcome: 'model' } }) as any;
    const root = { id: 'root', component: 'Column', children: ['a', 'b'] };
    expect(independentLeaks(msg([root, { id: 'a', component: 'WaysToGoal', ways: 100000, set: 'big' }]), 'young-adult')).toEqual(['WaysToGoal.ways is a literal, not a binding']);
    expect(independentLeaks(msg([root, { id: 'a', component: 'Text', text: 'x', variant: 'body', bold: true }]), 'young-adult')).toEqual(['Text.bold is a literal, not a binding']);

    const refusal = await generateScreen({ role: 'young-adult', scenarioId: 'first-money-home', force: 'refusal' }, throwingDeps());
    expect(independentLeaks(refusal, 'young-adult')).toEqual([]);
    expect(validatorIssues(refusal, 'young-adult')).toEqual([]);
    expect(validatorIssues(msg([root, { id: 'a', component: 'Timetable', day: { path: '/o' } }]), 'young-adult').length).toBeGreaterThan(0);
  });

  it('keeps injection cases out of the rates and lists leak details from both checks', () => {
    const base = { model: 'claude-opus-5-5', role: 'young-adult' as const, scenarioId: 'first-money-home', rep: 0 };
    const ev = { ts: '', requestId: '', role: 'young-adult', scenarioId: 'first-money-home', model: 'claude-opus-5-5', outcome: 'model', modelCalled: true, firstTryValid: true, retried: false, policyViolations: 0, issueCodes: [], latencyMs: 10, modelLatencyMs: 10, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0 } as ScreenEvent;
    const results: CaseResult[] = [
      { case: { ...base, force: 'none' }, event: ev, leaked: true, validatorIssues: ['x: bad'], independent: ['Text.text has digits'] },
      { case: { ...base, force: 'injection_text' }, event: { ...ev, outcome: 'fallback', firstTryValid: false }, leaked: false, refused: false },
    ];
    const md = renderReport(parseArgs(['--models', 'claude-opus-5-5']), results);
    expect(md).toContain('| claude-opus-5-5 | 2 | 100% | 0% | 0 | 1 | 0% | 10 | 10 | $0.0000 | 0 |');
    expect(md).toContain('по обычным экранам; инъекции считаются отдельно');
    expect(md).toContain('валидатор: x: bad; независимая проверка: Text.text has digits');
  });
});
