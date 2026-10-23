import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { bound, children, defineComponent, oneOf, text } from '../src/define';
import { toModelJsonSchema } from '../src/modelSchema';

const Card = defineComponent('Card', 'A card.', {
  title: text('Title'),
  amount: bound(z.number(), 'Amount path'),
  tone: oneOf(['info', 'warning'] as const, 'Tone'),
});
const Col = defineComponent('Column', 'Stack.', { children: children() });
const Secret = defineComponent('Secret', 'Static only.', { amount: bound(z.number(), 'x') }, { staticOnly: true });

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === 'object') {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((n) => walk(n, visit));
  }
}

describe('toModelJsonSchema', () => {
  const schema = toModelJsonSchema({ components: [Col, Card, Secret] });

  it('is a flat anyOf of component branches discriminated by a const', () => {
    const branches = (schema as any).properties.components.items.anyOf;
    expect(branches.map((b: any) => b.properties.component.const)).toEqual(['Column', 'Card']);
  });

  it('allows only a {path} for bound props and string-or-path for text', () => {
    const card = (schema as any).properties.components.items.anyOf[1];
    expect(card.properties.amount).toMatchObject({ type: 'object', required: ['path'], additionalProperties: false });
    expect(card.properties.title.anyOf).toEqual([{ type: 'string' }, expect.objectContaining({ required: ['path'] })]);
    expect(card.properties.tone).toMatchObject({ type: 'string', enum: ['info', 'warning'] });
    expect(card.required).toEqual(['id', 'component', 'title', 'amount', 'tone']);
  });

  it('uses only keywords Claude structured outputs accept', () => {
    const banned = ['$ref', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern', 'oneOf'];
    walk(schema, (n) => {
      for (const key of banned) expect(n).not.toHaveProperty(key);
      if (n.type === 'object') expect(n.additionalProperties).toBe(false);
    });
  });

  it('keeps a Zod API usable by the A2UI binder', () => {
    expect(Card.api.name).toBe('Card');
    expect(Card.api.schema.safeParse({ title: 'Привет', amount: { path: '/a' }, tone: 'info' }).success).toBe(true);
  });
});
