import type { ReactNode } from 'react';
import { Card } from '@heroui/react';

// HeroUI merges classNames with tailwind-merge, which reads our `text-title`-style sizes as colours:
// never pass a size and a colour `text-*` together to a HeroUI part.
/** The widget card (tokens.md «Card»): surface, radius card, padding 20/16/16, gap 20; optional green line icon, title, muted subtitle. */
export function WidgetCard(props: { icon?: ReactNode; title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="gap-5 rounded-card px-4 pt-5 pb-4 shadow-none">
      <Card.Header className="flex-row items-start gap-3">
        {props.icon && <span className="text-success">{props.icon}</span>}
        <div className="flex min-w-0 flex-col gap-1">
          <Card.Title className="font-display text-title">{props.title}</Card.Title>
          {props.subtitle && <Card.Description className="text-secondary">{props.subtitle}</Card.Description>}
        </div>
      </Card.Header>
      <Card.Content className="gap-3 text-body">{props.children}</Card.Content>
      {props.actions && <Card.Footer className="flex-col items-stretch">{props.actions}</Card.Footer>}
    </Card>
  );
}
