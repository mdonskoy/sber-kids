import { createComponentImplementation } from '@a2ui/react/v0_9';
import { DoneDef, type Done } from '@proto/catalog';
import { CheckIcon } from '../ui';
import { Btn, Card, dispatch } from './ui';

export const DoneImpl = createComponentImplementation(DoneDef.api, ({ props, context }) => {
  const d = props.done as Done | undefined;
  if (!d) return null;
  return (
    <Card title={d.title} icon={<CheckIcon size={28} />}>
      <p>{d.text}</p>
      <Btn kind="secondary" onClick={() => dispatch(context, 'nav.home')}>{d.backLabel}</Btn>
    </Card>
  );
});
