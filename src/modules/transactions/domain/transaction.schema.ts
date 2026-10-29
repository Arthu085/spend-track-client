import { z } from 'zod';
import { transactionCategoryKindSchema } from '@/modules/transaction-categories/domain/transaction-category.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

export const transactionStateSchema = z.enum([
  'PLANNED',
  'COMPLETED',
  'CANCELED',
]);

export const transactionAccountSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  status: recordStatusSchema,
});

export const transactionCategoryRefSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  kind: transactionCategoryKindSchema,
  color: z.string().nullable(),
  status: recordStatusSchema,
});

export const transactionSchema = z.object({
  uuid: z.string(),
  type: transactionTypeSchema,
  typeLabel: z.string(),
  description: z.string(),
  amount: moneySchema,
  date: z.iso.date(),
  state: transactionStateSchema,
  stateLabel: z.string(),
  completedOn: z.iso.date().nullable(),
  canceledAt: z.string().nullable(),
  account: transactionAccountSchema,
  destinationAccount: transactionAccountSchema.nullable(),
  category: transactionCategoryRefSchema.nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type TransactionState = z.infer<typeof transactionStateSchema>;
export type TransactionAccount = z.infer<typeof transactionAccountSchema>;
export type Transaction = z.infer<typeof transactionSchema>;

export const isTransfer = ({ type }: Pick<Transaction, 'type'>) =>
  type === 'TRANSFER';

export const isOverdue = (
  { state, date }: Pick<Transaction, 'state' | 'date'>,
  today: string,
) => state === 'PLANNED' && date < today;
