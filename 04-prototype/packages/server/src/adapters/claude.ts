import Anthropic from '@anthropic-ai/sdk';
import { buildRetryTurn } from '../prompt';
import type { ScreenModel, ScreenRequest, ScreenResponse } from './types';

/** Models that accept server-side refusal fallbacks. Claude Haiku 5.5 has none. */
export const SERVER_FALLBACK_MODELS: ReadonlySet<string> = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);
export type Effort = 'low' | 'medium' | 'high';
export type ClaudeAuth = 'api' | 'subscription';
type MessagesClient = { beta: { messages: { create: Anthropic['beta']['messages']['create'] } } };

export class ClaudeScreenModel implements ScreenModel {
  readonly name: string;
  private readonly client: MessagesClient;

  constructor(private readonly opts: { model: string; effort: Effort; timeoutMs: number; workspaceId?: string; client?: MessagesClient }) {
    this.name = opts.model;
    // Credentials: ANTHROPIC_API_KEY. A key not scoped to a workspace must name one on every request.
    const headers = opts.workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': opts.workspaceId } } : {};
    this.client = opts.client ?? new Anthropic({ maxRetries: 1, timeout: opts.timeoutMs, ...headers });
  }

  async generate(req: ScreenRequest): Promise<ScreenResponse> {
    const started = performance.now();
    const serverFallback = SERVER_FALLBACK_MODELS.has(this.opts.model);
    const res = await this.client.beta.messages.create({
      model: this.opts.model,
      max_tokens: 16000,
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: req.retry ? buildRetryTurn(req.user, req.retry) : req.user }],
      // No json_schema format: the catalog's schema compiles to a grammar over the API's limit. The prompt
      // states the shape and the validator checks it, with one retry.
      output_config: { effort: this.opts.effort },
      ...(serverFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    const base = {
      model: res.model,
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
      },
      stopReason: res.stop_reason ?? 'unknown',
    };
    if (res.stop_reason === 'refusal') return { ...base, recipe: null, refusalCategory: res.stop_details?.category ?? null };
    const text = res.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    try {
      // The object from its first brace to its last: a fence or a sentence around it is dropped.
      return { ...base, recipe: JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) };
    } catch {
      return { ...base, recipe: { error: 'Model output is not valid JSON', raw: text.slice(0, 500) } };
    }
  }
}
