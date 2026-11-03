import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import {
  creatableTransactionStateSchema,
  requiredUuidSchema,
} from '@/modules/transactions/domain/transaction-form.schemas';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import type { ListFilters } from '@/shared/list/use-list-params';
import {
  nonNegativeMoneyInputSchema,
  positiveMoneyInputSchema,
} from '@/shared/money/money';
import {
  type InvestmentType,
  investmentTypeSchema,
  type TransferMovementType,
} from './investment.schema';

export const INVESTMENT_NAME_MAX_LENGTH = 100;

const required = () => i18n.t('validation.required');

const requiredDate = z.custom<Dayjs>((value) => value != null, {
  error: required,
});

const formatDate = (date: Dayjs) => date.format(DATE_ONLY_FORMAT);

export const investmentFormSchema = z.object({
  name: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(INVESTMENT_NAME_MAX_LENGTH, {
      error: () =>
        i18n.t('validation.maxLength', { max: INVESTMENT_NAME_MAX_LENGTH }),
    }),
  type: z.enum(investmentTypeSchema.options, { error: required }),
  targetAmount: positiveMoneyInputSchema.nullish(),
});

export const investmentMovementFormSchema = z.object({
  accountUuid: requiredUuidSchema,
  amount: positiveMoneyInputSchema,
  date: requiredDate,
  state: z.enum(creatableTransactionStateSchema.options, { error: required }),
});

export const investmentValuationFormSchema = z.object({
  value: nonNegativeMoneyInputSchema,
  date: requiredDate,
});

export const investmentFiltersShape = {
  type: investmentTypeSchema,
  status: recordStatusSchema,
};

export const defaultInvestmentFilters: ListFilters<
  typeof investmentFiltersShape
> = { status: 'ACTIVE' };

export type InvestmentForm = z.infer<typeof investmentFormSchema>;
export type InvestmentMovementForm = z.infer<
  typeof investmentMovementFormSchema
>;
export type InvestmentValuationForm = z.infer<
  typeof investmentValuationFormSchema
>;

export interface InvestmentPayload {
  name: string;
  type: InvestmentType;
  targetAmount: string | null;
}

export interface InvestmentMovementPayload {
  type: TransferMovementType;
  accountUuid: string;
  amount: string;
  date: string;
  state: InvestmentMovementForm['state'];
}

export interface InvestmentValuationPayload {
  value: string;
  date: string;
}

export const toInvestmentPayload = (
  form: InvestmentForm,
): InvestmentPayload => ({
  name: form.name,
  type: form.type,
  targetAmount: form.targetAmount ?? null,
});

export const toInvestmentMovementPayload = (
  type: TransferMovementType,
  form: InvestmentMovementForm,
): InvestmentMovementPayload => ({
  type,
  accountUuid: form.accountUuid,
  amount: form.amount,
  date: formatDate(form.date),
  state: form.state,
});

export const toInvestmentValuationPayload = (
  form: InvestmentValuationForm,
): InvestmentValuationPayload => ({
  value: form.value,
  date: formatDate(form.date),
});
