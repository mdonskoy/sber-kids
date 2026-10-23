import { z } from 'zod';
import { MODEL_CHOICES, RoleSchema, type Role } from '@proto/catalog';

export interface EvalArgs { models: string[]; n: number; roles: Role[]; effort: 'low' | 'medium' | 'high'; label: string; dryRun: boolean; /** Only these widget cases (re-running a failed widget). */ widgets?: string[] }

const ClaudeModel = z.enum(MODEL_CHOICES).refine((m) => m !== 'gigachat-stub', 'gigachat-stub is a stub; nothing to evaluate');

export function parseArgs(argv: string[]): EvalArgs {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const list = (v: string | undefined, fallback: string) => (v ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);
  return {
    models: list(get('--models'), 'claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5').map((m) => ClaudeModel.parse(m)),
    n: z.coerce.number().int().min(1).parse(get('--n') ?? 3),
    roles: list(get('--roles'), 'young-adult').map((r) => RoleSchema.parse(r)),
    effort: z.enum(['low', 'medium', 'high']).parse(get('--effort') ?? 'medium'),
    label: get('--label') ?? 'run',
    dryRun: argv.includes('--dry-run'),
    widgets: get('--widgets') ? list(get('--widgets'), '') : undefined,
  };
}
