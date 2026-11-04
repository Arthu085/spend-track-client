import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import type { ListFilters } from '@/shared/list/use-list-params';
import { positiveMoneyInputSchema } from '@/shared/money/money';
import {
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
  categoryUuid: requiredUuidSchema,
  notes: notesSchema,
});

export const editRecurrenceFormSchema = z.object({
  scope: z.enum(recurrenceUpdateScopeSchema.options, { error: required }),
  from: requiredDateSchema.nullish(),
  description: descriptionSchema,
  amount: positiveMoneyInputSchema,
  accountUuid: requiredUuidSchema.nullish(),
  categoryUuid: requiredUuidSchema,
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
  categoryUuid: string;
  notes?: string;
}

export interface UpdateRecurrencePayload {
  scope: RecurrenceUpdateScope;
  from?: string;
  description: string;
  amount: string;
  categoryUuid?: string;
  accountUuid?: string;
  notes: string | null;
}

export type EndRecurrencePayload =
  { from: string } | { fromInvoiceMonth: string } | Record<string, never>;

export interface OccurrencePayload {
  amount: string;
  date: string;
}

const formatDate = (date: Dayjs) => date.format(DATE_ONLY_FORMAT);

const filledNotes = (notes: string | null | undefined) =>
  notes?.trim() ? notes : undefined;

const changedUuid = (next: string | null | undefined, current?: string) =>
  next && next !== current ? next : undefined;

export const toCreateRecurrencePayload = (
  form: RecurrenceForm,
): CreateRecurrencePayload => {
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
    categoryUuid: form.categoryUuid,
    notes: filledNotes(form.notes),
  };
};

export const toUpdateRecurrencePayload = (
  form: EditRecurrenceForm,
  recurrence: Recurrence,
): UpdateRecurrencePayload => ({
  scope: form.scope,
  from:
    form.scope === 'FUTURE' && form.from ? formatDate(form.from) : undefined,
  description: form.description,
  amount: form.amount,
  categoryUuid: changedUuid(form.categoryUuid, recurrence.category.uuid),
  accountUuid: recurrence.account
    ? changedUuid(form.accountUuid, recurrence.account.uuid)
    : undefined,
  notes: filledNotes(form.notes) ?? null,
});

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
