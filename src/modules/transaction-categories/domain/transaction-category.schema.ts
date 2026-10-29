import { z } from 'zod';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';

export const transactionCategoryKindSchema = z.enum(['EXPENSE', 'INCOME']);

export const transactionCategoryScopeSchema = z.enum(['GLOBAL', 'PERSONAL']);

export const transactionCategorySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  kind: transactionCategoryKindSchema,
  kindLabel: z.string(),
  scope: transactionCategoryScopeSchema,
  scopeLabel: z.string(),
  color: z.string().nullable(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionCategoryKind = z.infer<
  typeof transactionCategoryKindSchema
>;
export type TransactionCategory = z.infer<typeof transactionCategorySchema>;

export const isPersonalTransactionCategory = ({
  scope,
}: Pick<TransactionCategory, 'scope'>) => scope === 'PERSONAL';
