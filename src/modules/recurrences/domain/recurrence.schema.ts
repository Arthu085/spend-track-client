import { z } from 'zod';
import { creditCardRefSchema } from '@/modules/credit-cards/domain/credit-card.schema';
import {
  transactionAccountSchema,
  transactionCategoryRefSchema,
  transactionStateSchema,
} from '@/modules/transactions/domain/transaction.schema';
import { moneySchema } from '@/shared/money/money';

export const recurrenceTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const recurrenceFrequencySchema = z.enum([
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

export const recurrenceStateSchema = z.enum(['ACTIVE', 'PAUSED', 'ENDED']);

export const recurrenceSchema = z.object({
  uuid: z.string(),
  type: recurrenceTypeSchema,
  typeLabel: z.string(),
  description: z.string(),
  amount: moneySchema,
  frequency: recurrenceFrequencySchema,
  frequencyLabel: z.string(),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  state: recurrenceStateSchema,
  stateLabel: z.string(),
  account: transactionAccountSchema.nullable(),
  creditCard: creditCardRefSchema.nullable(),
  category: transactionCategoryRefSchema,
  notes: z.string().nullable(),
  nextOccurrenceDate: z.iso.date().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurrenceOccurrenceSchema = z.object({
  uuid: z.string(),
  occurrenceDate: z.iso.date(),
  date: z.iso.date(),
  amount: moneySchema,
  description: z.string(),
  state: transactionStateSchema,
  stateLabel: z.string(),
  completedOn: z.iso.date().nullable(),
  transactionUuid: z.string().nullable(),
  purchaseUuid: z.string().nullable(),
  invoiceMonth: z.iso.date().nullable(),
});

export type RecurrenceType = z.infer<typeof recurrenceTypeSchema>;
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;
export type RecurrenceState = z.infer<typeof recurrenceStateSchema>;
export type Recurrence = z.infer<typeof recurrenceSchema>;
export type RecurrenceOccurrence = z.infer<typeof recurrenceOccurrenceSchema>;

export const isCardRecurrence = ({
  creditCard,
}: Pick<Recurrence, 'creditCard'>) => creditCard !== null;

export const isRecurrenceEnded = ({ state }: Pick<Recurrence, 'state'>) =>
  state === 'ENDED';
