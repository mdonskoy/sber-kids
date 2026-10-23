import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor, type ActionPayload } from '@a2ui/web_core/v0_9';
import { CATALOGS, ROLES } from '@proto/catalog';
import { REFUSALS_NOT_AVAILABLE, buildDataModel, createStore } from '@proto/mocks';
import { IMPLEMENTED, reactCatalog } from '../src/catalog';

function mount(components: unknown[], data: unknown) {
  const actions: ActionPayload[] = [];
  const processor = new MessageProcessor([reactCatalog('young-adult')], (a) => {
    actions.push(a);
  });
  processor.processMessages([
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: CATALOGS['young-adult'].id } },
    { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/', value: data } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components } },
  ] as any);
  render(<A2uiSurface surface={processor.model.surfacesMap.get('s')! as any} />);
  return { actions, processor };
}
const root = (...children: string[]) => ({ id: 'root', component: 'Column', children });

afterEach(cleanup);

describe('React catalog', () => {
  it('implements every component of every catalog', () => {
    for (const role of ROLES) for (const c of CATALOGS[role].components) expect(IMPLEMENTED.has(c.name), c.name).toBe(true);
  });

  it('builds the catalog with exactly the young-adult components', () => {
    const catalog = reactCatalog('young-adult');
    expect(catalog.components.has('GoalPicker')).toBe(true);
    expect(catalog.components.has('Timetable')).toBe(false);
  });

  it('a title Text is a third-level heading: the page and the phone own the first two', () => {
    mount([root('t'), { id: 't', component: 'Text', text: 'Твой план', variant: 'title' }], {});
    expect(screen.getByRole('heading', { level: 3, name: 'Твой план' })).toBeTruthy();
  });

  it('a refusal renders the backend text and dispatches its next action', async () => {
    const dm = buildDataModel('young-adult', createStore(), { clock: '10:00' });
    const { actions } = mount([root('r'), { id: 'r', component: 'Refusal', refusal: { path: '/refusals/notAvailable' } }], dm);
    expect(await screen.findByText(REFUSALS_NOT_AVAILABLE.reason)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: REFUSALS_NOT_AVAILABLE.nextLabel }));
    await vi.waitFor(() => expect(actions).toHaveLength(1));
    expect(actions[0]).toMatchObject({ name: 'handoff.request' });
  });

  it('the static Done screen goes back home', async () => {
    const done = { title: 'Готово', text: 'Ок', backLabel: 'На главный' };
    const { actions } = mount([root('d'), { id: 'd', component: 'Done', done: { path: '/static/done' } }], { static: { done } });
    fireEvent.click(await screen.findByRole('button', { name: 'На главный' }));
    await vi.waitFor(() => expect(actions).toHaveLength(1));
    expect(actions[0]).toMatchObject({ name: 'nav.home' });
  });
});
