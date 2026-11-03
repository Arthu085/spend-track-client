import { z } from 'zod';
import { transactionCategoryRefSchema } from '@/modules/transactions/domain/transaction.schema';
import { moneySchema } from '@/shared/money/money';

export const budgetCategoryLimitSchema = z.object({
  category: transactionCategoryRefSchema,
  limit: moneySchema,
});

export const budgetSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  totalLimit: moneySchema.nullable(),
  categoryLimits: z.array(budgetCategoryLimitSchema),
  updatedAt: z.string().nullable(),
});

export interface BudgetPayload {
  totalLimit: string | null;
  categoryLimits: Array<{ categoryUuid: string; limit: string }>;
}

export type BudgetCategoryLimit = z.infer<typeof budgetCategoryLimitSchema>;
export type Budget = z.infer<typeof budgetSchema>;

export const hasBudget = ({ updatedAt }: Pick<Budget, 'updatedAt'>) =>
  updatedAt !== null;
