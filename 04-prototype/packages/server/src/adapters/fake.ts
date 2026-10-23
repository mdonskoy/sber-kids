import { ZERO_USAGE, type ScreenModel, type ScreenRequest, type ScreenResponse } from './types';

export type FakeStep = unknown | Error | ((req: ScreenRequest) => unknown);

/** Scripted model for tests: each call consumes one step (a recipe, an Error to throw, or a function of the request). */
export class FakeScreenModel implements ScreenModel {
  readonly name = 'fake';
  readonly calls: ScreenRequest[] = [];

  constructor(private readonly steps: FakeStep[]) {}

  async generate(req: ScreenRequest): Promise<ScreenResponse> {
    this.calls.push(req);
    if (this.steps.length === 0) throw new Error('FakeScreenModel: no scripted step left');
    const step = this.steps.shift();
    if (step instanceof Error) throw step;
    // A step may return a promise, so tests can hold the "model" open while they change the store.
    const recipe = await (typeof step === 'function' ? (step as (r: ScreenRequest) => unknown)(req) : step);
    return { recipe, model: 'fake', latencyMs: 1, usage: { ...ZERO_USAGE }, stopReason: 'end_turn' };
  }
}
