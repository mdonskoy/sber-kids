import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { MODEL_CHOICES } from '@proto/catalog';
import type { ClaudeAuth, Effort } from './adapters/claude';

export const PROTO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(8787),
  SCREEN_MODEL: z.enum(MODEL_CHOICES).default('claude-opus-5-5'),
  CHAT_MODEL: z.enum(MODEL_CHOICES).default('claude-opus-5-5'),
  MODEL_EFFORT: z.enum(['low', 'medium', 'high']).default('medium'),
  CLAUDE_AUTH: z.enum(['api', 'subscription']).default('api'),
  ANTHROPIC_WORKSPACE_ID: z.string().optional(),
  MODEL_TIMEOUT_MS: z.coerce.number().int().default(30000),
  LOG_DIR: z.string().default(join(PROTO_ROOT, 'logs')),
  WEB_DIST: z.string().default(join(PROTO_ROOT, 'packages/web/dist')),
});

export interface Config {
  port: number;
  screenModel: string;
  chatModel: string;
  effort: Effort;
  auth: ClaudeAuth;
  workspaceId?: string;
  timeoutMs: number;
  logDir: string;
  webDist: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const set = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const e = EnvSchema.parse(set);
  return {
    port: e.PORT,
    screenModel: e.SCREEN_MODEL,
    chatModel: e.CHAT_MODEL,
    effort: e.MODEL_EFFORT,
    auth: e.CLAUDE_AUTH,
    workspaceId: e.ANTHROPIC_WORKSPACE_ID,
    timeoutMs: e.MODEL_TIMEOUT_MS,
    logDir: e.LOG_DIR,
    webDist: existsSync(e.WEB_DIST) ? e.WEB_DIST : null,
  };
}

/** Without a key every model call fails and the pipeline falls back to rule-built screens: say so once. */
export function startupWarning(config: Config, env: NodeJS.ProcessEnv = process.env): string | null {
  if (config.auth !== 'api' || env.ANTHROPIC_API_KEY) return null;
  return 'CLAUDE_AUTH=api but ANTHROPIC_API_KEY is not set: only rule-built screens will be served.';
}

/** Loads 04-prototype/.env if present. An empty ANTHROPIC_API_KEY would count as set, so drop it. */
export function loadDotEnv(): void {
  const file = join(PROTO_ROOT, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
  if (process.env.ANTHROPIC_API_KEY === '') delete process.env.ANTHROPIC_API_KEY;
}
