import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClaudeCodeScreenModel, type RunCli } from '../src/adapters/claude-code';
import { createModels } from '../src/models';

const req = { role: 'young-adult' as const, system: 'SYS', user: 'USER', schema: { type: 'object' } };
const ok = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    is_error: false,
    stop_reason: 'tool_use',
    structured_output: { components: [] },
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 },
    modelUsage: { 'claude-opus-5-5': {} },
    ...over,
  });

function cli(stdout: string) {
  const calls: { args: string[]; input: string; env: NodeJS.ProcessEnv }[] = [];
  const run: RunCli = async (args, input, { env }) => {
    calls.push({ args, input, env });
    return stdout;
  };
  return { calls, model: new ClaudeCodeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, run }) };
}

afterEach(() => vi.unstubAllEnvs());

describe('ClaudeCodeScreenModel', () => {
  it('sends prompt, schema, model and effort with no tools, and never the API key', async () => {
    for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDECODE']) vi.stubEnv(k, 'x');
    vi.stubEnv('HOME', '/home/test');
    const { calls, model } = cli(ok());
    await model.generate(req);
    const { args, input, env } = calls[0];
    const after = (flag: string) => args[args.indexOf(flag) + 1];
    expect(after('--model')).toBe('claude-opus-5-5');
    expect(after('--effort')).toBe('medium');
    expect(after('--system-prompt')).toBe('SYS');
    expect(JSON.parse(after('--json-schema'))).toEqual({ type: 'object' });
    expect(after('--tools')).toBe('');
    expect(args).toContain('--no-session-persistence');
    expect(input).toBe('USER');
    for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDECODE']) expect(env[k]).toBeUndefined();
    expect(env.HOME).toBe('/home/test');
  });

  it('drops every CLAUDE_CODE_* variable of a parent session but keeps CLAUDE_CONFIG_DIR', async () => {
    vi.stubEnv('CLAUDE_CODE_SESSION_ID', 'x');
    vi.stubEnv('CLAUDE_CODE_MESSAGING_TOKEN', 'x');
    vi.stubEnv('CLAUDE_CONFIG_DIR', '/home/test/.claude');
    const { calls, model } = cli(ok());
    await model.generate(req);
    const { env } = calls[0];
    expect(env.CLAUDE_CODE_SESSION_ID).toBeUndefined();
    expect(env.CLAUDE_CODE_MESSAGING_TOKEN).toBeUndefined();
    expect(env.CLAUDE_CONFIG_DIR).toBe('/home/test/.claude');
  });

  it('maps structured output, usage and the model that answered', async () => {
    const res = await cli(ok()).model.generate(req);
    expect(res).toMatchObject({ recipe: { components: [] }, model: 'claude-opus-5-5', stopReason: 'tool_use', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 3, cacheWriteTokens: 2 } });
  });

  it('sends the validation errors in the retry turn', async () => {
    const { calls, model } = cli(ok());
    await model.generate({ ...req, retry: { previousJson: '{"a":1}', errors: ['bad path'] } });
    expect(calls[0].input).toContain('- bad path');
  });

  it('maps a refusal and throws on a CLI error', async () => {
    const refused = await cli(ok({ stop_reason: 'refusal', structured_output: undefined })).model.generate(req);
    expect(refused).toMatchObject({ recipe: null, stopReason: 'refusal' });
    await expect(cli(JSON.stringify({ is_error: true, result: 'Not logged in' })).model.generate(req)).rejects.toThrow('Not logged in');
  });

  it('the registry uses it when CLAUDE_AUTH is subscription', () => {
    const models = createModels({ screenModel: 'claude-opus-5-5', chatModel: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, auth: 'subscription' });
    expect(models.get('claude-opus-5-5')).toBeInstanceOf(ClaudeCodeScreenModel);
  });
});
