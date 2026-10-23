import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { Recipe } from './validate';

export function screenMessages(surfaceId: string, catalogId: string, recipe: Recipe, dataModel: unknown): A2uiMessage[] {
  return [
    { version: 'v0.9', createSurface: { surfaceId, catalogId } },
    { version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: dataModel } },
    { version: 'v0.9', updateComponents: { surfaceId, components: recipe.components } },
  ] as A2uiMessage[];
}

export function dataMessage(surfaceId: string, dataModel: unknown): A2uiMessage {
  return { version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: dataModel } } as A2uiMessage;
}
