import { MODEL_CHOICES } from '@proto/catalog';
import { ClaudeScreenModel, type ClaudeAuth, type Effort } from './adapters/claude';
import { ClaudeCodeScreenModel } from './adapters/claude-code';
import { GigaChatScreenModel } from './adapters/gigachat';
import type { ScreenModel } from './adapters/types';

export interface Models {
  /** Default for «Экран дня» screens. */
  screen: string;
  /** Default for «Первые деньги» chat turns. */
  chat: string;
  get(name: string): ScreenModel;
}

export function createModels(cfg: { screenModel: string; chatModel: string; effort: Effort; timeoutMs: number; auth: ClaudeAuth; workspaceId?: string }): Models {
  const cache = new Map<string, ScreenModel>();
  return {
    screen: cfg.screenModel,
    chat: cfg.chatModel,
    get(name) {
      const hit = cache.get(name);
      if (hit) return hit;
      if (!(MODEL_CHOICES as readonly string[]).includes(name)) throw new Error(`Unknown model ${name}`);
      const claude = { model: name, effort: cfg.effort, timeoutMs: cfg.timeoutMs };
      const model =
        name === 'gigachat-stub'
          ? new GigaChatScreenModel()
          : cfg.auth === 'subscription'
            ? new ClaudeCodeScreenModel(claude)
            : new ClaudeScreenModel({ ...claude, workspaceId: cfg.workspaceId });
      cache.set(name, model);
      return model;
    },
  };
}
