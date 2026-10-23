import { bound, children, defineComponent, oneOf, text } from '../define';
import { HandoffSchema, RefusalSchema } from '../records';

export const ColumnDef = defineComponent('Column', 'Vertical stack. The screen root is a Column with id "root".', {
  children: children(),
});
export const SectionDef = defineComponent('Section', 'A titled group of related cards.', {
  title: text('Section title in Russian, two to four words, no digits'),
  children: children(),
});
export const TextDef = defineComponent('Text', 'A heading or a short paragraph of copy.', {
  text: text('Russian copy without digits, or a path to a string in the data model such as /me/greeting'),
  variant: oneOf(['title', 'body', 'caption'] as const, 'title for the screen heading, body for copy, caption for small print'),
});
export const NoticeDef = defineComponent('Notice', 'A small highlighted note.', {
  text: text('Russian copy without digits'),
  tone: oneOf(['info', 'warning'] as const, 'info or warning'),
});
export const EmptyStateDef = defineComponent('EmptyState', 'Shown instead of cards when the data model has nothing relevant.', {
  title: text('Short Russian title without digits'),
  hint: text('One Russian sentence without digits'),
});
export const RefusalDef = defineComponent(
  'Refusal',
  'Explains that a request cannot be served and what to do next. Reason and next step come from the backend.',
  { refusal: bound(RefusalSchema, 'Path to one entry under /refusals, e.g. /refusals/notAvailable') },
);
export const HandoffDef = defineComponent('Handoff', 'Offers to continue with a bank specialist.', {
  handoff: bound(HandoffSchema, 'Path /handoff'),
});
