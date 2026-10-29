import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import type { ListFilters } from '@/shared/list/use-list-params';
import { positiveMoneyInputSchema } from '@/shared/money/money';
import {
  isTransfer,
  type Transaction,
  type TransactionType,
  transactionStateSchema,
  transactionTypeSchema,
} from './transaction.schema';

export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 150;
export const TRANSACTION_NOTES_MAX_LENGTH = 1000;

export const creatableTransactionStateSchema = z.enum(['PLANNED', 'COMPLETED']);

const required = () => i18n.t('validation.required');

const maxLength = (max: number) => () =>
  i18n.t('validation.maxLength', { max });

const requiredDate = z.custom<Dayjs>((value) => value != null, {
  error: required,
});

export const requiredUuidSchema = z
  .string({ error: required })
  .min(1, { error: required });

export const transactionFormSchema = z.object({
  type: z.enum(transactionTypeSchema.options, { error: required }),
  description: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(TRANSACTION_DESCRIPTION_MAX_LENGTH, {
      error: maxLength(TRANSACTION_DESCRIPTION_MAX_LENGTH),
    }),
  amount: positiveMoneyInputSchema,
  date: requiredDate,
  state: z.enum(creatableTransactionStateSchema.options, { error: required }),
  completedOn: requiredDate.nullish(),
  accountUuid: requiredUuidSchema,
  destinationAccountUuid: requiredUuidSchema.nullish(),
  categoryUuid: requiredUuidSchema.nullish(),
  notes: z
    .string()
    .max(TRANSACTION_NOTES_MAX_LENGTH, {
      error: maxLength(TRANSACTION_NOTES_MAX_LENGTH),
    })
    .nullish(),
});

export const completeTransactionFormSchema = z.object({
  completedOn: requiredDate,
});

export const transactionFiltersShape = {
  type: transactionTypeSchema,
  state: transactionStateSchema,
  accountUuid: z.string(),
  categoryUuid: z.string(),
  description: z.string(),
};

export type TransactionForm = z.infer<typeof transactionFormSchema>;
export type CompleteTransactionForm = z.infer<
  typeof completeTransactionFormSchema
>;
export type TransactionFilters = ListFilters<typeof transactionFiltersShape>;

export interface CreateTransactionPayload {
  type: TransactionType;
  description: string;
  amount: string;
  date: string;
  state: TransactionForm['state'];
  completedOn?: string;
  accountUuid: string;
  destinationAccountUuid?: string;
  categoryUuid?: string;
  notes?: string;
}

export interface UpdateTransactionPayload {
  description?: string;
  amount?: string;
  date?: string;
  accountUuid?: string;
  destinationAccountUuid?: string;
  categoryUuid?: string;
  notes?: string | null;
}

const formatDate = (date: Dayjs) => date.format(DATE_ONLY_FORMAT);

const filledNotes = (notes: TransactionForm['notes']) =>
  notes?.trim() ? notes : undefined;

const referencesOf = (form: TransactionForm) =>
  isTransfer(form)
    ? { destinationAccountUuid: form.destinationAccountUuid ?? undefined }
    : { categoryUuid: form.categoryUuid ?? undefined };

export const toCreateTransactionPayload = (
  form: TransactionForm,
): CreateTransactionPayload => ({
  type: form.type,
  description: form.description,
  amount: form.amount,
  date: formatDate(form.date),
  state: form.state,
  completedOn:
    form.state === 'COMPLETED' && form.completedOn
      ? formatDate(form.completedOn)
      : undefined,
  accountUuid: form.accountUuid,
  ...referencesOf(form),
  notes: filledNotes(form.notes),
});

const changedUuid = (next: string | null | undefined, current?: string) =>
  next && next !== current ? next : undefined;

export const toUpdateTransactionPayload = (
  form: Omit<TransactionForm, 'state'>,
  transaction: Transaction,
): UpdateTransactionPayload => {
  const categoryUuid = isTransfer(form)
    ? undefined
    : changedUuid(form.categoryUuid, transaction.category?.uuid);
  const shared = {
    description: form.description,
    categoryUuid,
    notes: filledNotes(form.notes) ?? null,
  };

  if (transaction.state !== 'PLANNED') {
    return shared;
  }

  return {
    ...shared,
    amount: form.amount,
    date: formatDate(form.date),
    accountUuid: changedUuid(form.accountUuid, transaction.account.uuid),
    destinationAccountUuid: isTransfer(form)
      ? changedUuid(
          form.destinationAccountUuid,
          transaction.destinationAccount?.uuid,
        )
      : undefined,
  };
};
