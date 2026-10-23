import { bound, defineComponent } from '../define';
import { DoneSchema } from '../records';

// Static-only: the server builds these screens in code; the model never sees them.
export const DoneDef = defineComponent(
  'Done',
  'Static result screen after an action.',
  { done: bound(DoneSchema, 'Path /static/done') },
  { staticOnly: true },
);
