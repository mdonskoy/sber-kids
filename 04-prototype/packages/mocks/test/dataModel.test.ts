import { describe, expect, it } from 'vitest';
import { HandoffSchema, RefusalSchema } from '@proto/catalog';
import { BANNER, HANDOFF, REFUSALS_NOT_AVAILABLE, buildDataModel, createStore, enablePiggy, openProduct, pickWay, selectGoal, sendInvite, setGoalTarget } from '../src';

describe('buildDataModel', () => {
  it('builds the young-adult model with the shared refusal and handoff records', () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' }) as any;
    expect(dm.me).toEqual({ name: 'Лиза', greeting: 'Привет, Лиза!' });
    expect(RefusalSchema.parse(dm.refusals.notAvailable)).toEqual(REFUSALS_NOT_AVAILABLE);
    expect(RefusalSchema.parse(dm.refusals.notAvailable).nextAction).toBe('handoff.request');
    expect(HandoffSchema.parse(dm.handoff)).toEqual(HANDOFF);
  });

  it('does not depend on the clock', () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    expect(buildDataModel('young-adult', store, { clock: '07:30' })).toEqual(buildDataModel('young-adult', store, { clock: '19:30' }));
  });

  it('the banner leads with a question', () => {
    expect(BANNER).toMatchObject({ title: 'Первая зарплата', lead: 'Хочешь сохранить и приумножить?', ctaLabel: 'Составить план' });
  });

  it('quick replies: none until the goal is set, then three for the way set, without the picked way', () => {
    const store = createStore();
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies).toBeNull();
    selectGoal(store, 'apartment');
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies).toBeNull();
    setGoalTarget(store, 1500000, 36);
    const big = (buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies;
    expect(big).toEqual([{ id: 'loan', text: 'Сравнить с кредитом' }, { id: 'invest', text: 'А если инвестировать?' }, { id: 'spend', text: 'Как сэкономить на тратах?' }]);
    pickWay(store, 'loan');
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies.map((r: any) => r.id)).toEqual(['invest', 'spend', 'invite']);
    selectGoal(store, 'vacation');
    setGoalTarget(store, 80000, 6);
    // On the list of ways, a reply that repeats a listed way is left out («Сэкономить на тратах» is in the small list).
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies.map((r: any) => r.id)).toEqual(['invite', 'invest']);
    pickWay(store, 'piggy');
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies.map((r: any) => r.id)).toEqual(['spend', 'invite', 'invest']);
    selectGoal(store, 'education');
    setGoalTarget(store, 200000, 24);
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).quickReplies.map((r: any) => r.id)).toEqual(['invest', 'spend', 'invite']);
  });

  it('a step already done drops out of the plan: its way and its quick reply', () => {
    const store = createStore();
    const dm = () => buildDataModel('young-adult', store, { clock: '10:00' }) as any;
    const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
    selectGoal(store, 'apartment');
    setGoalTarget(store, 1500000, 36);
    openProduct(store, 'deposit');
    openProduct(store, 'broker-account');
    expect(ids(dm().ways.big)).toEqual(['savings-account']);
    expect(ids(dm().ways.risk)).toEqual([]);
    expect(ids(dm().quickReplies)).toEqual(['loan', 'spend', 'invite']);
    sendInvite(store);
    expect(ids(dm().quickReplies)).toEqual(['loan', 'spend']);
    selectGoal(store, 'vacation');
    setGoalTarget(store, 80000, 6);
    enablePiggy(store);
    expect(ids(dm().ways.small)).toEqual(['spend']);
    expect(dm().quickReplies).toBeNull(); // spend is listed, the invite is sent, investing is open: nothing left to suggest
  });

  it('the invite says the money stays hers', () => {
    const store = createStore();
    selectGoal(store, 'apartment');
    expect((buildDataModel('young-adult', store, { clock: '10:00' }) as any).invite.text).toBe('Мама сможет пополнять твою цель через Совместный счёт. Деньги останутся твоими.');
  });
});
