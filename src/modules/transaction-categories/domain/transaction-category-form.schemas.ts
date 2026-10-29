import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import type { ListFilters } from '@/shared/list/use-list-params';
import { transactionCategoryKindSchema } from './transaction-category.schema';

export const TRANSACTION_CATEGORY_NAME_MAX_LENGTH = 100;

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const TRANSACTION_CATEGORY_COLOR_PRESETS = [
  '#1677FF',
  '#13C2C2',
  '#52C41A',
  '#FADB14',
  '#FA8C16',
  '#F5222D',
  '#EB2F96',
  '#722ED1',
  '#2F54EB',
  '#8C8C8C',
];

export const DEFAULT_TRANSACTION_CATEGORY_COLOR =
  TRANSACTION_CATEGORY_COLOR_PRESETS[0];

const required = () => i18n.t('validation.required');

export const transactionCategoryFormSchema = z.object({
  name: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(TRANSACTION_CATEGORY_NAME_MAX_LENGTH, {
      error: () =>
        i18n.t('validation.maxLength', {
          max: TRANSACTION_CATEGORY_NAME_MAX_LENGTH,
        }),
    }),
  kind: z.enum(transactionCategoryKindSchema.options, { error: required }),
  color: z.string().regex(HEX_COLOR_PATTERN),
});

export const transactionCategoryFiltersShape = {
  kind: transactionCategoryKindSchema,
  status: recordStatusSchema,
};

export const defaultTransactionCategoryFilters: ListFilters<
  typeof transactionCategoryFiltersShape
> = {
  kind: 'EXPENSE',
  status: 'ACTIVE',
};

export type TransactionCategoryForm = z.infer<
  typeof transactionCategoryFormSchema
>;
