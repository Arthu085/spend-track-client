import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import { moneyInputSchema } from '@/shared/money/money';
import { accountTypeSchema } from './account.schema';

export const ACCOUNT_NAME_MAX_LENGTH = 100;

const required = () => i18n.t('validation.required');

export const accountFormSchema = z.object({
  name: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(ACCOUNT_NAME_MAX_LENGTH, {
      error: () =>
        i18n.t('validation.maxLength', { max: ACCOUNT_NAME_MAX_LENGTH }),
    }),
  type: z.enum(accountTypeSchema.options, { error: required }),
  openingBalance: moneyInputSchema,
  openingBalanceDate: z.custom<Dayjs>((value) => value != null, {
    error: required,
  }),
  isDefault: z.boolean().optional(),
});

export type AccountForm = z.infer<typeof accountFormSchema>;

export interface AccountPayload {
  name: string;
  type: AccountForm['type'];
  openingBalance: string;
  openingBalanceDate: string;
  isDefault: boolean;
}

export const toAccountPayload = (form: AccountForm): AccountPayload => ({
  name: form.name,
  type: form.type,
  openingBalance: form.openingBalance,
  openingBalanceDate: form.openingBalanceDate.format(DATE_ONLY_FORMAT),
  isDefault: form.isDefault ?? false,
});
