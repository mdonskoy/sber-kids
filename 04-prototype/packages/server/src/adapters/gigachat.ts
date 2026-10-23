import { ModelUnavailableError, type ScreenModel, type ScreenRequest, type ScreenResponse } from './types';

/**
 * Same interface as Claude. Not wired in v1. A real adapter would send the same JSON schema
 * through response_format {type: "json_schema", strict: true}; GigaChat does not publish which
 * JSON Schema keywords it supports (01-research/q6-genui.md), so expect to flatten anyOf.
 */
export class GigaChatScreenModel implements ScreenModel {
  readonly name = 'gigachat-stub';

  async generate(_req: ScreenRequest): Promise<ScreenResponse> {
    throw new ModelUnavailableError('GigaChat adapter is a stub in this prototype');
  }
}
