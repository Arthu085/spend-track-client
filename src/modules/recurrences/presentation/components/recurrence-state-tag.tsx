import { Tag } from 'antd';
import type {
  Recurrence,
  RecurrenceState,
} from '../../domain/recurrence.schema';

const stateColors: Record<RecurrenceState, string | undefined> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ENDED: undefined,
};

type RecurrenceStateTagProps = Pick<Recurrence, 'state' | 'stateLabel'>;

export const RecurrenceStateTag = ({
  state,
  stateLabel,
}: RecurrenceStateTagProps) => (
  <Tag color={stateColors[state]}>{stateLabel}</Tag>
);
