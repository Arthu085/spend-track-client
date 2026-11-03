import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { positiveMoneyInputSchema } from '@/shared/money/money';
import type { Budget, BudgetPayload } from './budget.schema';

export const budgetCategoryLimitFormSchema = z.object({
  categoryUuid: requiredUuidSchema,
  limit: positiveMoneyInputSchema,
});

export const budgetFormSchema = z
  .object({
    totalLimit: positiveMoneyInputSchema.nullish(),
    categoryLimits: z.array(budgetCategoryLimitFormSchema).default([]),
  })
  .refine(
    ({ totalLimit, categoryLimits }) =>
      totalLimit != null || categoryLimits.length > 0,
    { error: () => i18n.t('budgets.validation.empty') },
  );

export type BudgetForm = z.input<typeof budgetFormSchema>;

export const toBudgetForm = (budget: Budget): BudgetForm => ({
  totalLimit: budget.totalLimit ?? undefined,
  categoryLimits: budget.categoryLimits.map(({ category, limit }) => ({
    categoryUuid: category.uuid,
    limit,
  })),
});

export const toBudgetPayload = (form: BudgetForm): BudgetPayload => {
  const { totalLimit, categoryLimits } = budgetFormSchema.parse(form);

  return { totalLimit: totalLimit ?? null, categoryLimits };
};
