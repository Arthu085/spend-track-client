import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import type { ListFilters } from '@/shared/list/use-list-params';
import {
  moneyToCents,
  nonNegativeMoneyInputSchema,
  positiveMoneyInputSchema,
} from '@/shared/money/money';
import {
  type AdditionalContributionStrategy,
  additionalContributionStrategySchema,
  isContributionRecurrence,
  type Recurrence,
  type RecurrenceFrequency,
  type RecurrenceOccurrence,
  type RecurrenceType,
  recurrenceFrequencySchema,
  recurrenceStateSchema,
  recurrenceTypeSchema,
} from './recurrence.schema';

export const RECURRENCE_DESCRIPTION_MAX_LENGTH = 150;
export const RECURRENCE_NOTES_MAX_LENGTH = 1000;

export const recurrenceTargetSchema = z.enum(['ACCOUNT', 'CREDIT_CARD']);
export const recurrenceUpdateScopeSchema = z.enum(['FUTURE', 'ALL']);
export const recurrenceEndModeSchema = z.enum([
  'FROM_DATE',
  'FROM_INVOICE_MONTH',
  'ENTIRE',
]);

const required = () => i18n.t('validation.required');

const maxLength = (max: number) => () =>
  i18n.t('validation.maxLength', { max });

export const requiredDateSchema = z.custom<Dayjs>((value) => value != null, {
  error: required,
});

const descriptionSchema = z
  .string({ error: required })
  .regex(/\S/, { error: required })
  .max(RECURRENCE_DESCRIPTION_MAX_LENGTH, {
    error: maxLength(RECURRENCE_DESCRIPTION_MAX_LENGTH),
  });

const notesSchema = z
  .string()
  .max(RECURRENCE_NOTES_MAX_LENGTH, {
    error: maxLength(RECURRENCE_NOTES_MAX_LENGTH),
  })
  .nullish();

export const savingStrategyFormShape = {
  useSavingStrategy: z.boolean().nullish(),
  minimumRetainedBalance: nonNegativeMoneyInputSchema.nullish(),
  additionalContribution: z
    .enum(additionalContributionStrategySchema.options, { error: required })
    .nullish(),
};

export const recurrenceFormSchema = z.object({
  type: z.enum(recurrenceTypeSchema.options, { error: required }),
  target: z.enum(recurrenceTargetSchema.options, { error: required }),
  description: descriptionSchema,
  amount: positiveMoneyInputSchema,
  frequency: z.enum(recurrenceFrequencySchema.options, { error: required }),
  startDate: requiredDateSchema,
  endDate: requiredDateSchema.nullish(),
  accountUuid: requiredUuidSchema.nullish(),
  creditCardUuid: requiredUuidSchema.nullish(),
  categoryUuid: requiredUuidSchema.nullish(),
  investmentUuid: requiredUuidSchema.nullish(),
  ...savingStrategyFormShape,
  notes: notesSchema,
});

export const editRecurrenceFormSchema = z.object({
  scope: z.enum(recurrenceUpdateScopeSchema.options, { error: required }),
  from: requiredDateSchema.nullish(),
  description: descriptionSchema,
  amount: positiveMoneyInputSchema,
  accountUuid: requiredUuidSchema.nullish(),
  categoryUuid: requiredUuidSchema.nullish(),
  ...savingStrategyFormShape,
  notes: notesSchema,
});

export const endRecurrenceFormSchema = z.object({
  mode: z.enum(recurrenceEndModeSchema.options, { error: required }),
  from: requiredDateSchema.nullish(),
  fromInvoiceMonth: requiredDateSchema.nullish(),
});

export const occurrenceFormSchema = z.object({
  amount: positiveMoneyInputSchema,
  date: requiredDateSchema,
});

export const additionalContributionFormSchema = z.object({
  amount: positiveMoneyInputSchema,
  date: requiredDateSchema,
  state: z.enum(['COMPLETED', 'PLANNED'], { error: required }),
  allowExceedingSuggestion: z.boolean().optional(),
});

export const recurrenceFiltersShape = {
  state: recurrenceStateSchema,
  type: recurrenceTypeSchema,
  description: z.string().max(RECURRENCE_DESCRIPTION_MAX_LENGTH),
};

export type RecurrenceTarget = z.infer<typeof recurrenceTargetSchema>;
export type RecurrenceUpdateScope = z.infer<typeof recurrenceUpdateScopeSchema>;
export type RecurrenceEndMode = z.infer<typeof recurrenceEndModeSchema>;
export type RecurrenceForm = z.infer<typeof recurrenceFormSchema>;
export type EditRecurrenceForm = z.infer<typeof editRecurrenceFormSchema>;
export type EndRecurrenceForm = z.infer<typeof endRecurrenceFormSchema>;
export type OccurrenceForm = z.infer<typeof occurrenceFormSchema>;
export type AdditionalContributionForm = z.infer<
  typeof additionalContributionFormSchema
>;
export type RecurrenceFilters = ListFilters<typeof recurrenceFiltersShape>;

export interface CreateRecurrencePayload {
  type: RecurrenceType;
  description: string;
  amount: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  accountUuid?: string;
  creditCardUuid?: string;
  categoryUuid?: string;
  investmentUuid?: string;
  savingStrategy?: SavingStrategyPayload;
  notes?: string;
}

export interface SavingStrategyPayload {
  minimumRetainedBalance: string;
  additionalContribution: AdditionalContributionStrategy;
}

export interface UpdateRecurrencePayload {
  scope: RecurrenceUpdateScope;
  from?: string;
  description: string;
  amount?: string;
  categoryUuid?: string;
  accountUuid?: string;
  savingStrategy?: SavingStrategyPayload | null;
  notes: string | null;
}

export type EndRecurrencePayload =
  { from: string } | { fromInvoiceMonth: string } | Record<string, never>;

export interface OccurrencePayload {
  amount: string;
  date: string;
}

export interface AdditionalContributionPayload {
  year: number;
  month: number;
  amount: string;
  date: string;
  state: AdditionalContributionForm['state'];
  allowExceedingSuggestion?: boolean;
}

const formatDate = (date: Dayjs) => date.format(DATE_ONLY_FORMAT);

const filledNotes = (notes: string | null | undefined) =>
  notes?.trim() ? notes : undefined;

const changedUuid = (next: string | null | undefined, current?: string) =>
  next && next !== current ? next : undefined;

type SavingStrategyForm = Pick<
  RecurrenceForm,
  'useSavingStrategy' | 'minimumRetainedBalance' | 'additionalContribution'
>;

const toSavingStrategyPayload = ({
  useSavingStrategy,
  minimumRetainedBalance,
  additionalContribution,
}: SavingStrategyForm): SavingStrategyPayload | null =>
  useSavingStrategy && minimumRetainedBalance && additionalContribution
    ? { minimumRetainedBalance, additionalContribution }
    : null;

export const toCreateRecurrencePayload = (
  form: RecurrenceForm,
): CreateRecurrencePayload => {
  if (form.type === 'INVESTMENT_CONTRIBUTION') {
    return {
      type: form.type,
      description: form.description,
      amount: form.amount,
      frequency: form.frequency,
      startDate: formatDate(form.startDate),
      endDate: form.endDate ? formatDate(form.endDate) : undefined,
      accountUuid: form.accountUuid ?? undefined,
      investmentUuid: form.investmentUuid ?? undefined,
      savingStrategy:
        form.frequency === 'MONTHLY'
          ? (toSavingStrategyPayload(form) ?? undefined)
          : undefined,
      notes: filledNotes(form.notes),
    };
  }

  const chargesCard = form.type === 'EXPENSE' && form.target === 'CREDIT_CARD';

  return {
    type: form.type,
    description: form.description,
    amount: form.amount,
    frequency: form.frequency,
    startDate: formatDate(form.startDate),
    endDate: form.endDate ? formatDate(form.endDate) : undefined,
    accountUuid: chargesCard ? undefined : (form.accountUuid ?? undefined),
    creditCardUuid: chargesCard
      ? (form.creditCardUuid ?? undefined)
      : undefined,
    categoryUuid: form.categoryUuid ?? undefined,
    notes: filledNotes(form.notes),
  };
};

const isSameAmount = (first: string, second: string) =>
  moneyToCents(first) === moneyToCents(second);

const updatedSavingStrategy = (
  form: EditRecurrenceForm,
  { frequency, savingStrategy }: Recurrence,
) => {
  if (frequency !== 'MONTHLY') {
    return undefined;
  }

  const next = toSavingStrategyPayload(form);

  return next === null && savingStrategy === null ? undefined : next;
};

export const toUpdateRecurrencePayload = (
  form: EditRecurrenceForm,
  recurrence: Recurrence,
): UpdateRecurrencePayload => {
  const contributes = isContributionRecurrence(recurrence);

  return {
    scope: form.scope,
    from:
      form.scope === 'FUTURE' && form.from ? formatDate(form.from) : undefined,
    description: form.description,
    amount:
      contributes && isSameAmount(form.amount, recurrence.amount)
        ? undefined
        : form.amount,
    categoryUuid: contributes
      ? undefined
      : changedUuid(form.categoryUuid, recurrence.category?.uuid),
    accountUuid: recurrence.account
      ? changedUuid(form.accountUuid, recurrence.account.uuid)
      : undefined,
    savingStrategy: contributes
      ? updatedSavingStrategy(form, recurrence)
      : undefined,
    notes: filledNotes(form.notes) ?? null,
  };
};

const firstDayOfMonth = (month: Dayjs) => month.startOf('month');

export const toEndRecurrencePayload = (
  form: EndRecurrenceForm,
): EndRecurrencePayload => {
  if (form.mode === 'FROM_DATE' && form.from) {
    return { from: formatDate(form.from) };
  }

  if (form.mode === 'FROM_INVOICE_MONTH' && form.fromInvoiceMonth) {
    return {
      fromInvoiceMonth: formatDate(firstDayOfMonth(form.fromInvoiceMonth)),
    };
  }

  return {};
};

export const isMovedPastRecurrenceEnd = (
  date: Dayjs,
  occurrence: Pick<RecurrenceOccurrence, 'date'>,
  { endDate }: Pick<Recurrence, 'endDate'>,
) => {
  const next = formatDate(date);

  return endDate !== null && next !== occurrence.date && next > endDate;
};

export const toOccurrencePayload = (
  form: OccurrenceForm,
): OccurrencePayload => ({
  amount: form.amount,
  date: formatDate(form.date),
});

export const toAdditionalContributionPayload = (
  form: AdditionalContributionForm,
  month: string,
): AdditionalContributionPayload => ({
  year: Number(month.slice(0, 4)),
  month: Number(month.slice(5, 7)),
  amount: form.amount,
  date: formatDate(form.date),
  state: form.state,
  ...(form.allowExceedingSuggestion ? { allowExceedingSuggestion: true } : {}),
});
