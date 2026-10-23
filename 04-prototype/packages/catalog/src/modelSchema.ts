import type { ComponentDef, PropDef } from './define';

const PATH = {
  type: 'object',
  properties: { path: { type: 'string', description: 'JSON Pointer into the data model, e.g. /ways' } },
  required: ['path'],
  additionalProperties: false,
} as const;

function propSchema(prop: PropDef): Record<string, unknown> {
  switch (prop.kind) {
    case 'text':
      return { description: prop.description, anyOf: [{ type: 'string' }, PATH] };
    case 'bound':
      return { ...PATH, description: prop.description };
    case 'children':
      return { type: 'array', items: { type: 'string' }, description: prop.description };
    case 'enum':
      return { type: 'string', enum: [...prop.values], description: prop.description };
  }
}

export function componentJsonSchema(def: ComponentDef): Record<string, unknown> {
  const props = Object.fromEntries(Object.entries(def.props).map(([key, prop]) => [key, propSchema(prop)]));
  return {
    type: 'object',
    description: def.description,
    properties: { id: { type: 'string' }, component: { type: 'string', const: def.name }, ...props },
    required: ['id', 'component', ...Object.keys(def.props)],
    additionalProperties: false,
  };
}

/** The structured-output schema for one catalog: a flat list, one anyOf branch per component. */
export function toModelJsonSchema(catalog: { components: readonly ComponentDef[] }): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      components: { type: 'array', items: { anyOf: catalog.components.filter((c) => !c.staticOnly).map(componentJsonSchema) } },
    },
    required: ['components'],
    additionalProperties: false,
  };
}
