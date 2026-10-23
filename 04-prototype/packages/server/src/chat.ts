import type { ForceState, ModelChoice, ScreenResult } from '@proto/catalog';
import { generateScreen, type Deps } from './pipeline';

export const CHAT_SCENARIO = 'first-money-chat';
// Each turn adds up to three lines (user, reply, cards shown).
const HISTORY_TURNS = 12;

/** One assistant turn = one generated surface. History lives in the store and goes into the user turn. */
export async function chatTurn(text: string, deps: Deps, opts: { force?: ForceState; model?: ModelChoice } = {}): Promise<ScreenResult> {
  const ya = deps.store.youngAdult;
  if (text) ya.history.push(`User: ${text}`);
  const result = await generateScreen(
    { role: 'young-adult', scenarioId: CHAT_SCENARIO, userText: text, history: ya.history.slice(-HISTORY_TURNS), ...opts },
    deps,
  );
  const components = (result.messages[2] as any).updateComponents.components as { component: string; text?: unknown }[];
  // The reply is the first literal Text; follow-ups need the assistant's own words, not just card names.
  const reply = components.find((c) => c.component === 'Text' && typeof c.text === 'string')?.text as string | undefined;
  if (reply) ya.history.push(`Assistant: ${reply}`);
  ya.history.push(`Assistant showed: ${components.map((c) => c.component).join(', ')}`);
  return result;
}
