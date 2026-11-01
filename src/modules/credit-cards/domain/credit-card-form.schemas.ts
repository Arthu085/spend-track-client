import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { DATE_ONLY_FORMAT } from '@/shared/date/date-only';
import type { ListFilters } from '@/shared/list/use-list-params';
import {
  moneyInputSchema,
  positiveMoneyInputSchema,
} from '@/shared/money/money';
import type { CreditCardPurchase } from './credit-card.schema';

export const CREDIT_CARD_NAME_MAX_LENGTH = 100;
export const PURCHASE_DESCRIPTION_MAX_LENGTH = 150;
export const PURCHASE_NOTES_MAX_LENGTH = 1000;
export const MAX_INSTALLMENTS = 48;

const required = () => i18n.t('validation.required');

const maxLength = (max: number) => () =>
  i18n.t('validation.maxLength', { max });

const requiredDate = z.custom<Dayjs>((value) => value != null, {
  error: required,
});

const nonNegativeMoneyInputSchema = moneyInputSchema.refine(
  (amount) => !amount.startsWith('-'),
  { error: () => i18n.t('validation.nonNegativeMoney') },
);

const billingDaySchema = z
  .number({ error: required })
  .int()
  .min(1, { error: () => i18n.t('creditCards.validation.billingDay') })
  .max(31, { error: () => i18n.t('creditCards.validation.billingDay') });

const notesSchema = z
  .string()
  .max(PURCHASE_NOTES_MAX_LENGTH, {
    error: maxLength(PURCHASE_NOTES_MAX_LENGTH),
  })
  .nullish();

export const creditCardFormSchema = z.object({
  name: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(CREDIT_CARD_NAME_MAX_LENGTH, {
      error: maxLength(CREDIT_CARD_NAME_MAX_LENGTH),
    }),
  creditLimit: nonNegativeMoneyInputSchema,
  closingDay: billingDaySchema,
  dueDay: billingDaySchema,
  isDefault: z.boolean().optional(),
});

export const creditCardPurchaseFormSchema = z.object({
  cardUuid: requiredUuidSchema,
  categoryUuid: requiredUuidSchema,
  description: z
    .string({ error: required })
    .regex(/\S/, { error: required })
    .max(PURCHASE_DESCRIPTION_MAX_LENGTH, {
      error: maxLength(PURCHASE_DESCRIPTION_MAX_LENGTH),
    }),
  amount: positiveMoneyInputSchema,
  purchaseDate: requiredDate,
  installmentCount: z
    .number({ error: required })
    .int()
    .min(1, { error: () => i18n.t('creditCards.validation.installments') })
    .max(MAX_INSTALLMENTS, {
      error: () => i18n.t('creditCards.validation.installments'),
    }),
  notes: notesSchema,
});

export const creditCardRefundFormSchema = z.object({
  amount: positiveMoneyInputSchema,
  date: requiredDate,
  notes: notesSchema,
});

export const creditCardPaymentFormSchema = z.object({
  accountUuid: requiredUuidSchema,
  amount: positiveMoneyInputSchema,
  paidOn: requiredDate,
});

export const creditCardFiltersShape = {
  status: recordStatusSchema,
};

export const defaultCreditCardFilters: ListFilters<
  typeof creditCardFiltersShape
> = { status: 'ACTIVE' };

export const creditCardPurchaseFiltersShape = {
  cardUuid: z.uuid(),
  categoryUuid: z.uuid(),
  description: z.string().max(PURCHASE_DESCRIPTION_MAX_LENGTH),
};

export type CreditCardForm = z.infer<typeof creditCardFormSchema>;
export type CreditCardPurchaseForm = z.infer<
  typeof creditCardPurchaseFormSchema
>;
export type CreditCardRefundForm = z.infer<typeof creditCardRefundFormSchema>;
export type CreditCardPaymentForm = z.infer<typeof creditCardPaymentFormSchema>;
export type CreditCardPurchaseFilters = ListFilters<
  typeof creditCardPurchaseFiltersShape
>;

export interface CreditCardPayload {
  name: string;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  isDefault: boolean;
}

export interface CreateCreditCardPurchasePayload {
  cardUuid: string;
  categoryUuid: string;
  description: string;
  amount: string;
  purchaseDate: string;
  installmentCount: number;
  notes?: string;
}

export interface UpdateCreditCardPurchasePayload {
  description: string;
  categoryUuid?: string;
  notes: string | null;
}

export interface CreditCardRefundPayload {
  amount: string;
  date: string;
  notes?: string;
}

export interface CreditCardPaymentPayload {
  accountUuid: string;
  amount: string;
  paidOn: string;
}

const formatDate = (date: Dayjs) => date.format(DATE_ONLY_FORMAT);

const filledNotes = (notes: string | null | undefined) =>
  notes?.trim() ? notes : undefined;

export const toCreditCardPayload = (
  form: CreditCardForm,
): CreditCardPayload => ({
  name: form.name,
  creditLimit: form.creditLimit,
  closingDay: form.closingDay,
  dueDay: form.dueDay,
  isDefault: form.isDefault ?? false,
});

export const toCreateCreditCardPurchasePayload = (
  form: CreditCardPurchaseForm,
): CreateCreditCardPurchasePayload => ({
  cardUuid: form.cardUuid,
  categoryUuid: form.categoryUuid,
  description: form.description,
  amount: form.amount,
  purchaseDate: formatDate(form.purchaseDate),
  installmentCount: form.installmentCount,
  notes: filledNotes(form.notes),
});

export const toUpdateCreditCardPurchasePayload = (
  form: Pick<CreditCardPurchaseForm, 'description' | 'categoryUuid' | 'notes'>,
  purchase: CreditCardPurchase,
): UpdateCreditCardPurchasePayload => ({
  description: form.description,
  categoryUuid:
    form.categoryUuid !== purchase.category.uuid
      ? form.categoryUuid
      : undefined,
  notes: filledNotes(form.notes) ?? null,
});

export const toCreditCardRefundPayload = (
  form: CreditCardRefundForm,
): CreditCardRefundPayload => ({
  amount: form.amount,
  date: formatDate(form.date),
  notes: filledNotes(form.notes),
});

export const toCreditCardPaymentPayload = (
  form: CreditCardPaymentForm,
): CreditCardPaymentPayload => ({
  accountUuid: form.accountUuid,
  amount: form.amount,
  paidOn: formatDate(form.paidOn),
});
