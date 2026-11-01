import { z } from 'zod';
import {
  transactionAccountSchema,
  transactionCategoryRefSchema,
} from '@/modules/transactions/domain/transaction.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const creditCardInvoiceStatusSchema = z.enum([
  'OPEN',
  'CLOSED',
  'OVERDUE',
  'PAID',
]);

export const creditCardRefSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  status: recordStatusSchema,
});

export const creditCardSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  creditLimit: moneySchema,
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  isDefault: z.boolean(),
  outstanding: moneySchema,
  availableLimit: moneySchema,
  creditBalance: moneySchema,
  status: recordStatusSchema,
  statusLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const creditCardInvoiceRefSchema = z.object({
  uuid: z.string(),
  referenceMonth: z.iso.date(),
  closingDate: z.iso.date(),
  dueDate: z.iso.date(),
});

export const creditCardInvoiceSchema = creditCardInvoiceRefSchema.extend({
  card: creditCardRefSchema,
  charges: moneySchema,
  refunds: moneySchema,
  previousCredit: moneySchema,
  total: moneySchema,
  paid: moneySchema,
  outstanding: moneySchema,
  creditCarried: moneySchema,
  status: creditCardInvoiceStatusSchema,
  statusLabel: z.string(),
});

export const creditCardInvoiceChargeSchema = z.object({
  purchaseUuid: z.string(),
  description: z.string(),
  category: transactionCategoryRefSchema,
  purchaseDate: z.iso.date(),
  installmentNumber: z.number().int().positive(),
  installmentCount: z.number().int().positive(),
  amount: moneySchema,
  date: z.iso.date(),
});

export const creditCardRefundSchema = z.object({
  uuid: z.string(),
  purchase: z.object({ uuid: z.string(), description: z.string() }),
  invoice: creditCardInvoiceRefSchema,
  amount: moneySchema,
  date: z.iso.date(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const creditCardPaymentSchema = z.object({
  uuid: z.string(),
  invoice: creditCardInvoiceRefSchema,
  account: transactionAccountSchema,
  amount: moneySchema,
  paidOn: z.iso.date(),
  canceledAt: z.string().nullable(),
  createdAt: z.string(),
});

export const creditCardInvoiceDetailSchema = creditCardInvoiceSchema.extend({
  chargeEntries: z.array(creditCardInvoiceChargeSchema),
  refundEntries: z.array(creditCardRefundSchema),
  payments: z.array(creditCardPaymentSchema),
});

export const creditCardInstallmentSchema = z.object({
  number: z.number().int().positive(),
  amount: moneySchema,
  date: z.iso.date(),
  invoice: creditCardInvoiceRefSchema,
});

export const creditCardPurchaseRefundSchema = z.object({
  uuid: z.string(),
  amount: moneySchema,
  date: z.iso.date(),
  invoice: creditCardInvoiceRefSchema,
});

export const creditCardPurchaseSchema = z.object({
  uuid: z.string(),
  card: creditCardRefSchema,
  category: transactionCategoryRefSchema,
  description: z.string(),
  amount: moneySchema,
  purchaseDate: z.iso.date(),
  installmentCount: z.number().int().positive(),
  installments: z.array(creditCardInstallmentSchema),
  refunds: z.array(creditCardPurchaseRefundSchema),
  refundedAmount: moneySchema,
  refundableAmount: moneySchema,
  deletable: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreditCardInvoiceStatus = z.infer<
  typeof creditCardInvoiceStatusSchema
>;
export type CreditCard = z.infer<typeof creditCardSchema>;
export type CreditCardInvoiceRef = z.infer<typeof creditCardInvoiceRefSchema>;
export type CreditCardInvoice = z.infer<typeof creditCardInvoiceSchema>;
export type CreditCardInvoiceDetail = z.infer<
  typeof creditCardInvoiceDetailSchema
>;
export type CreditCardRefund = z.infer<typeof creditCardRefundSchema>;
export type CreditCardPayment = z.infer<typeof creditCardPaymentSchema>;
export type CreditCardPurchase = z.infer<typeof creditCardPurchaseSchema>;

export const isInvoiceOpen = ({ status }: Pick<CreditCardInvoice, 'status'>) =>
  status === 'OPEN';
