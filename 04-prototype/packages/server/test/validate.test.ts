import { describe, expect, it } from 'vitest';
import { CATALOGS } from '@proto/catalog';
import { buildDataModel, createStore, selectGoal } from '@proto/mocks';
import { resolvePointer, MISSING } from '../src/pointer';
import { validateRecipe } from '../src/validate';

const store = createStore();
selectGoal(store, 'apartment');
const yaData = buildDataModel('young-adult', store, { clock: '10:05' });
const YA = CATALOGS['young-adult'];
const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

const goodYa = {
  components: [
    root('t', 'g'),
    { id: 't', component: 'Text', text: { path: '/me/greeting' }, variant: 'title' },
    { id: 'g', component: 'GoalPicker', goals: { path: '/goals' } },
  ],
};

describe('resolvePointer', () => {
  it('resolves objects, arrays and escapes; reports missing paths', () => {
    const doc = { a: [{ 'b/c': 1 }] };
    expect(resolvePointer(doc, '/a/0/b~1c')).toBe(1);
    expect(resolvePointer(doc, '/a/1')).toBe(MISSING);
    expect(resolvePointer(doc, 'a')).toBe(MISSING);
    expect(resolvePointer(doc, '/')).toBe(doc);
  });
});

describe('validateRecipe', () => {
  it('accepts a valid young-adult screen', () => {
    expect(validateRecipe(goodYa, YA, yaData)).toEqual({ ok: true, issues: [], policyViolation: false });
  });

  it('rejects a non-recipe', () => {
    expect(codes(validateRecipe({ foo: 1 }, YA, yaData))).toEqual(['shape']);
    expect(codes(validateRecipe(null, YA, yaData))).toEqual(['shape']);
  });

  it('blocks a component outside the catalog as a policy violation (FR-031)', () => {
    const withoutInvite = { ...YA, components: YA.components.filter((c) => c.name !== 'InviteRelative') };
    const r = validateRecipe({ components: [root('i'), { id: 'i', component: 'InviteRelative', invite: { path: '/invite' } }] }, withoutInvite, yaData);
    expect(codes(r)).toContain('forbidden_component');
    expect(r.policyViolation).toBe(true);
  });

  it('blocks a literal amount where a binding is required (FR-003)', () => {
    const r = validateRecipe(
      { components: [root('w'), { id: 'w', component: 'WaysToGoal', ways: { title: 'Как копить', target: 10000000 }, set: 'big' }] },
      YA,
      yaData,
    );
    expect(codes(r)).toEqual(['literal_in_bound']);
    expect(r.policyViolation).toBe(true);
  });

  it('blocks static-only components unless the server builds the screen', () => {
    const confirm = { components: [root('p'), { id: 'p', component: 'ConfirmOpenProduct', product: { path: '/products/savings' } }] };
    const r = validateRecipe(confirm, YA, yaData);
    expect(codes(r)).toContain('static_only');
    expect(r.policyViolation).toBe(true);
    expect(validateRecipe(confirm, YA, yaData, { allowStatic: true }).ok).toBe(true);
  });

  it('allows static-only components when the server builds the screen', () => {
    const data = { ...yaData, static: { done: { title: 'Готово', text: 'Ок', backLabel: 'На главный' } } };
    expect(validateRecipe({ components: [root('d'), { id: 'd', component: 'Done', done: { path: '/static/done' } }] }, YA, data, { allowStatic: true }).ok).toBe(true);
  });

  it('flags retryable problems without a policy violation', () => {
    const r = validateRecipe(
      {
        components: [
          root('t', 'x', 'missing'),
          { id: 't', component: 'Text', text: 'У тебя 3 цели', variant: 'body' },
          { id: 'x', component: 'WaysToGoal', ways: { path: '/banner' }, set: 'big' },
          { id: 'orphan', component: 'GoalPicker', goals: { path: '/nope' } },
          { id: 'z', component: 'Credit' },
        ],
      },
      YA,
      yaData,
    );
    expect(codes(r)).toEqual(expect.arrayContaining(['digits_in_text', 'bad_bound_value', 'bad_path', 'missing_child', 'unreachable', 'unknown_component']));
    expect(r.policyViolation).toBe(false);
  });

  it('requires a Column root and catches cycles, duplicates and bad props', () => {
    expect(codes(validateRecipe({ components: [{ id: 'root', component: 'Text', text: 'Привет', variant: 'body' }] }, YA, yaData))).toContain('root');
    const cyclic = { components: [root('s'), { id: 's', component: 'Section', title: 'Раз', children: ['s'] }] };
    expect(codes(validateRecipe(cyclic, YA, yaData))).toContain('cycle');
    const dup = { components: [root(), root()] };
    expect(codes(validateRecipe(dup, YA, yaData))).toContain('duplicate_id');
    const badProp = { components: [root('t'), { id: 't', component: 'Text', text: 'Привет', variant: 'huge', extra: 1 }] };
    expect(codes(validateRecipe(badProp, YA, yaData))).toEqual(['shape', 'shape']);
  });

  it('rejects extra props named after Object.prototype members', () => {
    const r = validateRecipe(
      { components: [root('t'), { id: 't', component: 'Text', text: 'Привет', variant: 'body', toString: 'Баланс 100500', constructor: { amount: 1 }, valueOf: 5 }] },
      YA,
      yaData,
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(['shape', 'shape', 'shape']);
  });

  it('rejects amounts and returns written in words, and a component shown twice', () => {
    for (const text of ['Тебе пришло пятьсот рублей', 'Перевели сто ₽', 'Гарантируем высокую доходность']) {
      const r = validateRecipe({ components: [root('t'), { id: 't', component: 'Text', text, variant: 'body' }] }, YA, yaData);
      expect(codes(r)).toEqual(['money_words_in_text']);
      expect(r.policyViolation).toBe(false); // retried, like digits
    }
    const twice = { components: [root('s', 's'), { id: 's', component: 'Section', title: 'Раз', children: [] }] };
    expect(codes(validateRecipe(twice, YA, yaData))).toContain('shared_child');
  });

  const textCodes = (text: string) => codes(validateRecipe({ components: [root('t'), { id: 't', component: 'Text', text, variant: 'body' }] }, YA, yaData));

  it('rejects digits from any script', () => {
    for (const text of ['Осталось ٣ дня', 'Шаг ५', 'Цель ３']) expect(textCodes(text)).toEqual(['digits_in_text']);
  });

  it('rejects abbreviations, currency signs, promises and large numbers in words', () => {
    for (const text of [
      'Нужно ещё сорок тыс. на цель',
      'Ещё тыс на цель',
      'Это пара млн',
      'Почти млрд',
      'Цена в $',
      'Цена в €',
      'Мы обещаем результат',
      'Стоит рубль',
      'Нет и рубля',
      'Хватит руб. на всё',
      'Перевели сто',
      'Осталось двести',
      'Добавь пятьсот',
      'Ещё девяносто',
      'Почти сорок',
      'Уже двадцать',
      'Пара сотни',
      'Почти полторы тысячи',
    ]) {
      expect(textCodes(text), text).toEqual(['money_words_in_text']);
    }
  });

  it('lets everyday words and small counts through', () => {
    for (const text of ['Это просто', 'Смотри, как копить', 'Новая рубашка', 'Есть два способа', 'Три шага до цели', 'Сторона вопроса', 'Пять минут', 'Высотный дом']) {
      expect(textCodes(text), text).toEqual([]);
    }
  });

  it('rejects overlong text, links and addresses', () => {
    expect(textCodes('а'.repeat(201))).toEqual(['text_too_long']);
    expect(textCodes('а'.repeat(200))).toEqual([]);
    for (const text of ['Читай на https://example.ru', 'Заходи на www.example.ru', 'Пиши на help@example.ru']) {
      expect(textCodes(text), text).toEqual(['link_in_text']);
    }
  });
});
