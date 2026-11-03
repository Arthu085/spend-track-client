import { Tag } from 'antd';
import type {
  Transaction,
  TransactionState,
} from '../../domain/transaction.schema';

const stateColors: Record<TransactionState, string | undefined> = {
  PLANNED: 'warning',
  COMPLETED: 'success',
  CANCELED: undefined,
};

type TransactionStateTagProps = Pick<Transaction, 'state' | 'stateLabel'>;

export const TransactionStateTag = ({
  state,
  stateLabel,
}: TransactionStateTagProps) => (
  <Tag color={stateColors[state]}>{stateLabel}</Tag>
);
