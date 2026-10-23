import { MessageProcessor, type ActionPayload, type SurfaceModel } from '@a2ui/web_core/v0_9';
import { CATALOGS } from '@proto/catalog';
import { reactCatalog } from '../catalog';

let seq = 0;
/** One young-adult surface from a recipe and a data model, rendered by the real A2UI renderer. */
export function mountSurface(components: unknown[], data: unknown, onAction: (a: ActionPayload) => void = () => {}): SurfaceModel<any> {
  const surfaceId = `showcase-${++seq}`;
  const p = new MessageProcessor([reactCatalog('young-adult')], async (a) => onAction(a));
  p.processMessages([
    { version: 'v0.9', createSurface: { surfaceId, catalogId: CATALOGS['young-adult'].id } },
    { version: 'v0.9', updateDataModel: { surfaceId, path: '/', value: data } },
    { version: 'v0.9', updateComponents: { surfaceId, components } },
  ] as any);
  return p.model.surfacesMap.get(surfaceId)!;
}
