import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import {
  budgetFormSchema,
  toBudgetForm,
  toBudgetPayload,
} from '../budget-form.schemas';
import type { Budget } from '../budget.schema';

const category = {
  uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Mercado',
  kind: 'EXPENSE',
  color: null,
  status: 'INACTIVE',
} as const;

describe('budget form schemas', () => {
  it('turns a saved budget into form values and back into the same payload', () => {
    const budget: Budget = {
      year: 2026,
      month: 10,
      totalLimit: null,
      categoryLimits: [{ category, limit: '800.50' }],
      updatedAt: '2026-10-02T10:00:00.000Z',
    };

    expect(toBudgetPayload(toBudgetForm(budget))).toEqual({
      totalLimit: null,
      categoryLimits: [{ categoryUuid: category.uuid, limit: '800.50' }],
    });
  });

  it('sends a cleared overall limit as null', () => {
    expect(
      toBudgetPayload({ totalLimit: '3000.00', categoryLimits: undefined }),
    ).toEqual({ totalLimit: '3000.00', categoryLimits: [] });
    expect(
      toBudgetPayload({
        totalLimit: null,
        categoryLimits: [{ categoryUuid: category.uuid, limit: '1' }],
      }).totalLimit,
    ).toBeNull();
  });

  it('requires an overall limit or a category limit', () => {
    const result = budgetFormSchema.safeParse({
      totalLimit: null,
      categoryLimits: [],
    });

    expect(result.error?.issues[0]?.message).toBe(
      i18n.t('budgets.validation.empty'),
    );
  });

  it('rejects a limit of zero', () => {
    expect(
      budgetFormSchema.safeParse({ totalLimit: '0.00', categoryLimits: [] })
        .success,
    ).toBe(false);
  });
});
