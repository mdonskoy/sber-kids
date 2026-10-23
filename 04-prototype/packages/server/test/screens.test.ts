import { describe, expect, it } from 'vitest';
import { CATALOGS } from '@proto/catalog';
import { HANDOFF, REFUSALS_NOT_AVAILABLE, buildDataModel, createStore, selectGoal } from '@proto/mocks';
import { ruleBasedScreen } from '../src/fallback';
import { dataMessage, screenMessages } from '../src/messages';
import { DONE, confirmOpenProductScreen, doneScreen, handoffScreen, refusalScreen } from '../src/staticScreens';
import { validateRecipe } from '../src/validate';

describe('ruleBasedScreen', () => {
  for (const scenarioId of ['first-money-home', 'first-money-chat']) {
    for (const goal of [null, 'apartment'] as const) {
      it(`is valid for ${scenarioId}${goal ? ' with a goal' : ''}`, () => {
        const store = createStore();
        if (goal) selectGoal(store, goal);
        const dm = buildDataModel('young-adult', store, { clock: '10:05' });
        for (const notice of [true, false]) {
          const r = validateRecipe(ruleBasedScreen('young-adult', dm, { notice, scenarioId }), CATALOGS['young-adult'], dm);
          expect(r.issues).toEqual([]);
        }
      });
    }
  }
});

describe('static screens', () => {
  const cases = [
    doneScreen(DONE.handoff),
    doneScreen(DONE.actionFailed),
    refusalScreen(REFUSALS_NOT_AVAILABLE),
    handoffScreen(HANDOFF),
  ];
  for (const screen of cases) {
    it(`${screen.recipe.components[1].component} is valid for the young adult`, () => {
      const dm = { ...buildDataModel('young-adult', createStore(), { clock: '10:05' }), ...screen.data };
      expect(validateRecipe(screen.recipe, CATALOGS['young-adult'], dm, { allowStatic: true }).issues).toEqual([]);
    });
  }

  it('takes the product from the record, as data', () => {
    const product = buildDataModel('young-adult', createStore(), { clock: '10:05' }).products as any;
    expect(confirmOpenProductScreen(product.savings).data).toEqual({ static: { product: product.savings } });
    expect(DONE.productOpened(product.savings).text).toBe('Накопительный счёт открыт. Цель будет пополняться отсюда.');
  });
});

describe('A2UI messages', () => {
  it('creates the surface with the role catalog, then data, then components', () => {
    const recipe = { components: [{ id: 'root', component: 'Column', children: [] }] };
    const msgs = screenMessages('young-adult-1', CATALOGS['young-adult'].id, recipe, { a: 1 }) as any[];
    expect(msgs).toEqual([
      { version: 'v0.9', createSurface: { surfaceId: 'young-adult-1', catalogId: CATALOGS['young-adult'].id } },
      { version: 'v0.9', updateDataModel: { surfaceId: 'young-adult-1', path: '/', value: { a: 1 } } },
      { version: 'v0.9', updateComponents: { surfaceId: 'young-adult-1', components: recipe.components } },
    ]);
    expect(dataMessage('young-adult-1', { b: 2 })).toEqual({ version: 'v0.9', updateDataModel: { surfaceId: 'young-adult-1', path: '/', value: { b: 2 } } });
  });
});
