import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStore, pickWay, selectGoal, setGoalTarget } from '@proto/mocks';
import { SCENARIOS_DIR, ScenarioRegistry, Surfaces, Telemetry, createDeps, generateScreen, loadConfig, loadDotEnv } from '@proto/server';
import { parseArgs } from './args';
import { buildMatrix, estimateCostUsd } from './matrix';
import { independentLeaks, leakedToClient, modelError, renderReport, shownComponents, showsRefusal, validatorIssues, type CaseResult } from './report';

loadDotEnv();
const args = parseArgs(process.argv.slice(2));
const cases = buildMatrix(args, new ScenarioRegistry(SCENARIOS_DIR));
console.log(`${cases.length} screens · models ${args.models.join(', ')} · estimated $${estimateCostUsd(cases).toFixed(2)}`);
if (args.dryRun) {
  const perModelRep = cases.length / (args.models.length * args.n); // every case of one model × one rep
  for (const c of cases.slice(0, perModelRep)) console.log(`  ${c.model} ${c.role}/${c.scenarioId} ${c.force}${c.expect ? ` → ${c.expect}` : ''} #${c.rep}`);
  process.exit(0);
}

const telemetry = new Telemetry();
const config = loadConfig();
const deps = createDeps({ ...config, effort: args.effort }, { telemetry });
const access =
  config.auth === 'subscription'
    ? 'подписка через Claude Code CLI — задержка включает запуск CLI, стоимость посчитана по ценам API'
    : 'Claude API';
const results: CaseResult[] = [];

const dir = fileURLToPath(new URL('../results/', import.meta.url));
mkdirSync(dir, { recursive: true });
const stem = `${new Date().toISOString().slice(0, 10)}-${args.label}`;

/** The JSON is rewritten after every case; the Markdown is written at the end, on abort and on Ctrl-C. */
function writeResults(markdown: boolean): string {
  writeFileSync(`${dir}${stem}.json`, JSON.stringify(results, null, 2));
  const md = renderReport(args, results, access);
  if (markdown) writeFileSync(`${dir}${stem}.md`, `${md}\n`);
  return md;
}

process.on('SIGINT', () => {
  writeResults(true);
  console.log(`\nInterrupted: partial results saved to evals/results/${stem}.md and .json`);
  process.exit(130);
});

const MAX_ERRORS_IN_ROW = 3;
let errorsInRow = 0;
let aborted = false;
for (const c of cases) {
  deps.store = createStore(); // every case sees the same starting data
  if (c.setup) {
    selectGoal(deps.store, c.setup.goal);
    if (c.setup.target) setGoalTarget(deps.store, c.setup.target.amount, c.setup.target.months); // GoalSetup has none: its goal is chosen, not set
    if (c.setup.way) pickWay(deps.store, c.setup.way);
  }
  deps.surfaces = new Surfaces();
  let error: string | undefined;
  try {
    const r = await generateScreen({ role: c.role, scenarioId: c.scenarioId, model: c.model, force: c.force === 'none' ? undefined : c.force, userText: c.userText, history: c.userText ? [`User: ${c.userText}`] : undefined }, deps);
    error = modelError(r);
    if (!error) {
      const independent = independentLeaks(r, c.role);
      const leaked = leakedToClient(r, c.role) || independent.length > 0;
      results.push({
        case: c,
        event: telemetry.all().at(-1) ?? null,
        leaked,
        validatorIssues: leaked ? validatorIssues(r, c.role) : undefined,
        independent,
        refused: showsRefusal(r),
        shown: c.expect ? shownComponents(r).includes(c.expect) : undefined,
      });
      process.stdout.write(r.debug.outcome === 'model' ? '.' : r.debug.outcome[0]);
    }
  } catch (err) {
    error = (err instanceof Error ? err.message : String(err)).slice(0, 200);
  }
  if (error) {
    // A failed model call is not a screen: it must not reach the rates (the pipeline would call it a fallback).
    results.push({ case: c, event: null, leaked: false, error });
    process.stdout.write('E');
    errorsInRow++;
    if (errorsInRow >= MAX_ERRORS_IN_ROW) {
      console.log(`\nstopping: ${MAX_ERRORS_IN_ROW} model errors in a row — ${error}`);
      aborted = true;
    }
  } else {
    errorsInRow = 0;
  }
  writeResults(false);
  if (aborted) break;
}

const md = writeResults(true);
console.log(`\n\n${md}\n\nSaved evals/results/${stem}.md and .json`);
if (aborted) process.exit(1);
