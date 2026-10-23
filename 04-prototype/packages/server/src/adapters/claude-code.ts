import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildRetryTurn } from '../prompt';
import type { Effort } from './claude';
import type { ScreenModel, ScreenRequest, ScreenResponse } from './types';

/** Runs `claude` with args, writes input to stdin, resolves with stdout. Injected in tests. */
export type RunCli = (args: string[], input: string, opts: { env: NodeJS.ProcessEnv; timeoutMs: number }) => Promise<string>;

interface CliResult {
  is_error: boolean;
  result?: string;
  stop_reason?: string;
  structured_output?: unknown;
  usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  modelUsage?: Record<string, unknown>;
}

const DROPPED_ENV: ReadonlySet<string> = new Set(['CLAUDECODE']);

/**
 * Local development only: calls Claude through the Claude Code CLI on the developer's claude.ai
 * subscription. Docker and Coolify use ClaudeScreenModel with an API key. Unlike the API adapter:
 * no server-side refusal fallback (betas need an API key), the schema goes through Claude Code's
 * StructuredOutput tool, and latency includes CLI start-up.
 */
export class ClaudeCodeScreenModel implements ScreenModel {
  readonly name: string;
  private readonly run: RunCli;

  constructor(private readonly opts: { model: string; effort: Effort; timeoutMs: number; run?: RunCli }) {
    this.name = opts.model;
    this.run = opts.run ?? runClaude;
  }

  async generate(req: ScreenRequest): Promise<ScreenResponse> {
    const started = performance.now();
    const args = [
      '-p', '--model', this.opts.model, '--effort', this.opts.effort,
      '--system-prompt', req.system, '--json-schema', JSON.stringify(req.schema), '--output-format', 'json',
      // No tools, settings, MCP servers, skills, environment sections or session file: the call sees our prompt only.
      '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--disable-slash-commands',
      '--exclude-dynamic-system-prompt-sections', '--no-session-persistence',
    ];
    // Without ANTHROPIC_* the CLI uses the claude.ai login; the other keys would override it, reroute billing or mark the call as nested; CLAUDE_CODE_* session/messaging vars of a parent Claude Code session must not reach the call.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !DROPPED_ENV.has(k) && !k.startsWith('ANTHROPIC_') && !k.startsWith('CLAUDE_CODE_')));
    const out = JSON.parse(await this.run(args, req.retry ? buildRetryTurn(req.user, req.retry) : req.user, { env, timeoutMs: this.opts.timeoutMs })) as CliResult;
    if (out.is_error) throw new Error(`claude CLI: ${String(out.result ?? 'error').slice(0, 200)}`);
    const base = {
      model: Object.keys(out.modelUsage ?? {})[0] ?? this.opts.model,
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: out.usage?.input_tokens ?? 0,
        outputTokens: out.usage?.output_tokens ?? 0,
        cacheReadTokens: out.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: out.usage?.cache_creation_input_tokens ?? 0,
      },
      stopReason: out.stop_reason ?? 'unknown',
    };
    if (out.stop_reason === 'refusal') return { ...base, recipe: null, refusalCategory: null };
    return { ...base, recipe: out.structured_output ?? { error: 'No structured output', raw: String(out.result ?? '').slice(0, 500) } };
  }
}

const runClaude: RunCli = (args, input, { env, timeoutMs }) =>
  new Promise((resolve, reject) => {
    // A neutral cwd, so no project CLAUDE.md is discovered.
    const child = spawn('claude', args, { cwd: tmpdir(), env, timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    // On a model error the CLI exits non-zero but still prints its JSON result.
    child.on('close', (code, signal) => (stdout.trim() ? resolve(stdout) : reject(new Error(`claude CLI exited ${code ?? signal}: ${stderr.slice(0, 200)}`))));
    child.stdin.end(input);
  });
