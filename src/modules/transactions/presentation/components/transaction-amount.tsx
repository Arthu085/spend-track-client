import { MoneyText } from '@/shared/money/money-text';
import type { Transaction } from '../../domain/transaction.schema';

interface TransactionAmountProps {
  transaction: Pick<Transaction, 'type' | 'amount'>;
}

export const TransactionAmount = ({
  transaction: { type, amount },
}: TransactionAmountProps) => (
  <MoneyText amount={type === 'EXPENSE' ? `-${amount}` : amount} />
);
