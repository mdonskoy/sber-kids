import { createContext, Fragment, type ReactNode } from 'react';
import { ActionButton, StatusChip, WidgetCard } from '../ui';

export { rub } from '../ui';

/** Thin adapters over the building blocks, so the catalog implementations stay as they were. */
export const Card = (props: { title: string; icon?: ReactNode; subtitle?: string; children: ReactNode }) => (
  <WidgetCard icon={props.icon} title={props.title} subtitle={props.subtitle}>{props.children}</WidgetCard>
);

export const Btn = (props: { children: ReactNode; onClick: () => void; kind?: 'primary' | 'secondary' }) => (
  <ActionButton kind={props.kind === 'secondary' ? 'secondary' : 'primary'} onPress={props.onClick}>{props.children}</ActionButton>
);

const PILL = { ok: 'success', warning: 'warning', info: 'default' } as const;
export const Pill = (props: { tone: 'ok' | 'warning' | 'info'; children: ReactNode }) => <StatusChip tone={PILL[props.tone]}>{props.children}</StatusChip>;

/**
 * Set by the phone around the home slot once the chat exists: the banner then shows the chat
 * instead of sending chat.open again (the server only accepts actions from the latest turn).
 */
export const ShowChat = createContext<(() => void) | null>(null);

type ChildRef = string | { id: string; basePath?: string };
export function renderChildren(refs: unknown, buildChild: (id: string, basePath?: string) => ReactNode) {
  return ((refs ?? []) as ChildRef[]).map((ref) => {
    const id = typeof ref === 'string' ? ref : ref.id;
    return <Fragment key={id}>{buildChild(id, typeof ref === 'string' ? undefined : ref.basePath)}</Fragment>;
  });
}

/** Fires a fixed server action. Names and contexts live here, never in the model output. */
export function dispatch(context: { dispatchAction(action: Record<string, unknown>): Promise<void> }, name: string, ctx: Record<string, unknown> = {}) {
  void context.dispatchAction({ event: { name, context: ctx } });
}
