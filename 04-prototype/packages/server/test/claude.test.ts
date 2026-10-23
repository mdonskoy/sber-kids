import { describe, expect, it, vi } from 'vitest';
import { ClaudeScreenModel } from '../src/adapters/claude';
import { GigaChatScreenModel } from '../src/adapters/gigachat';
import { FakeScreenModel } from '../src/adapters/fake';
import { ModelUnavailableError } from '../src/adapters/types';
import { createModels } from '../src/models';

const okResponse = {
  model: 'claude-opus-5-5',
  stop_reason: 'end_turn',
  stop_details: null,
  content: [
    { type: 'thinking', thinking: '', signature: 's' },
    { type: 'text', text: '{"components":[]}' },
  ],
  usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 },
};

function fake(response: object) {
  const create = vi.fn(async (_params: any) => response);
  return { client: { beta: { messages: { create } } } as any, create };
}
const req = { role: 'young-adult' as const, system: 'SYS', user: 'USER', schema: { type: 'object' } };

describe('ClaudeScreenModel', () => {
  it('sends explicit effort, a cached system prompt and server fallback on Opus; no strict schema', async () => {
    const { client, create } = fake(okResponse);
    const res = await new ClaudeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, client }).generate(req);
    const p = create.mock.calls[0][0];
    expect(p).toMatchObject({
      model: 'claude-opus-5-5',
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: 'SYS', cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: 'USER' }],
    });
    for (const banned of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice']) expect(p).not.toHaveProperty(banned);
    // The catalog's schema compiles to a grammar over the API's limit: the validator checks the shape instead.
    expect(p.output_config).not.toHaveProperty('format');
    expect(res).toMatchObject({
      recipe: { components: [] },
      model: 'claude-opus-5-5',
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 2000, cacheWriteTokens: 0 },
    });
  });

  it('reads the JSON out of a fenced or prefixed answer', async () => {
    const { client } = fake({ ...okResponse, content: [{ type: 'text', text: 'Вот экран:\n```json\n{"components": []}\n```' }] });
    const res = await new ClaudeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, client }).generate(req);
    expect(res.recipe).toEqual({ components: [] });
  });

  it('never sends server fallback for Haiku 5.5', async () => {
    const { client, create } = fake({ ...okResponse, model: 'claude-haiku-5-5' });
    await new ClaudeScreenModel({ model: 'claude-haiku-5-5', effort: 'low', timeoutMs: 1000, client }).generate(req);
    expect(create.mock.calls[0][0]).not.toHaveProperty('fallbacks');
    expect(create.mock.calls[0][0]).not.toHaveProperty('betas');
  });

  it('returns a refusal without a recipe', async () => {
    const { client } = fake({ ...okResponse, stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: '' }, content: [] });
    const res = await new ClaudeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, client }).generate(req);
    expect(res).toMatchObject({ recipe: null, stopReason: 'refusal', refusalCategory: 'cyber' });
  });

  it('turns non-JSON output into an invalid recipe instead of throwing', async () => {
    const { client } = fake({ ...okResponse, content: [{ type: 'text', text: 'not json' }] });
    const res = await new ClaudeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, client }).generate(req);
    expect(res.recipe).toMatchObject({ error: 'Model output is not valid JSON' });
  });

  it('sends the validation errors in the retry turn', async () => {
    const { client, create } = fake(okResponse);
    await new ClaudeScreenModel({ model: 'claude-opus-5-5', effort: 'medium', timeoutMs: 1000, client }).generate({
      ...req,
      retry: { previousJson: '{"a":1}', errors: ['bad path'] },
    });
    expect(create.mock.calls[0][0].messages[0].content).toContain('- bad path');
  });
});

describe('other adapters', () => {
  it('GigaChat is a stub behind the same interface (FR-006)', async () => {
    await expect(new GigaChatScreenModel().generate(req)).rejects.toThrow(ModelUnavailableError);
  });

  it('the fake replays scripted steps and records calls', async () => {
    const m = new FakeScreenModel([{ components: [] }, new Error('boom')]);
    expect((await m.generate(req)).recipe).toEqual({ components: [] });
    await expect(m.generate(req)).rejects.toThrow('boom');
    expect(m.calls).toHaveLength(2);
  });

  it('the registry knows the stub and rejects unknown names', () => {
    const models = createModels({ screenModel: 'claude-opus-5-5', chatModel: 'claude-sonnet-5-5', effort: 'medium', timeoutMs: 1000, auth: 'api' });
    expect(models.screen).toBe('claude-opus-5-5');
    expect(models.chat).toBe('claude-sonnet-5-5');
    expect(models.get('gigachat-stub')).toBeInstanceOf(GigaChatScreenModel);
    expect(() => models.get('gpt-5')).toThrow('Unknown model');
  });
});
