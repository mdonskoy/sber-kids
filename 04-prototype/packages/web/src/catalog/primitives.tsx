import { createComponentImplementation } from '@a2ui/react/v0_9';
import { Alert } from '@heroui/react';
import {
  ColumnDef,
  EmptyStateDef,
  HandoffDef,
  NoticeDef,
  RefusalDef,
  SectionDef,
  TextDef,
  type Handoff,
  type Refusal,
} from '@proto/catalog';
import { InfoIcon } from '../ui';
import { Btn, Card, dispatch, renderChildren } from './ui';

export const ColumnImpl = createComponentImplementation(ColumnDef.api, ({ props, buildChild }) => (
  <div className="flex flex-col gap-4">{renderChildren(props.children, buildChild)}</div>
));

export const SectionImpl = createComponentImplementation(SectionDef.api, ({ props, buildChild }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-display text-title">{props.title as string}</h2>
    {renderChildren(props.children, buildChild)}
  </section>
));

/** Model prose: `body` is the left chat bubble (surface, radius card, padding 12/16, max-width 85 %). */
export const TextImpl = createComponentImplementation(TextDef.api, ({ props }) => {
  const variant = props.variant as 'title' | 'body' | 'caption';
  if (variant === 'title') return <h3 className="font-display text-title">{props.text as string}</h3>;
  if (variant === 'caption') return <p className="text-caption text-muted">{props.text as string}</p>;
  return <p className="max-w-[85%] self-start rounded-card bg-surface px-4 py-3 text-body">{props.text as string}</p>;
});

export const NoticeImpl = createComponentImplementation(NoticeDef.api, ({ props }) => (
  <Alert status={props.tone === 'warning' ? 'warning' : 'accent'} role="note">
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Description>{props.text as string}</Alert.Description>
    </Alert.Content>
  </Alert>
));

export const EmptyStateImpl = createComponentImplementation(EmptyStateDef.api, ({ props }) => (
  <div className="flex flex-col items-center gap-1 py-6 text-center">
    <h3 className="text-body font-semibold">{props.title as string}</h3>
    <p className="text-secondary text-muted">{props.hint as string}</p>
  </div>
));

export const RefusalImpl = createComponentImplementation(RefusalDef.api, ({ props, context }) => {
  const r = props.refusal as Refusal | undefined;
  if (!r) return null;
  return (
    <Card title="Сейчас это недоступно" icon={<InfoIcon />}>
      <p>{r.reason}</p>
      <p className="text-secondary text-muted">{r.nextStep}</p>
      <Btn onClick={() => dispatch(context, r.nextAction)}>{r.nextLabel}</Btn>
    </Card>
  );
});

export const HandoffImpl = createComponentImplementation(HandoffDef.api, ({ props, context }) => {
  const h = props.handoff as Handoff | undefined;
  if (!h) return null;
  return (
    <Card title={h.title}>
      <p>{h.text}</p>
      <Btn kind="secondary" onClick={() => dispatch(context, 'handoff.request')}>{h.ctaLabel}</Btn>
    </Card>
  );
});
