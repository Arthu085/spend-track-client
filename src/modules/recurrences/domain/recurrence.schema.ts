import { z } from 'zod';
import { creditCardRefSchema } from '@/modules/credit-cards/domain/credit-card.schema';
import { investmentTypeSchema } from '@/modules/investments/domain/investment.schema';
import {
  transactionAccountSchema,
  transactionCategoryRefSchema,
  transactionStateSchema,
} from '@/modules/transactions/domain/transaction.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const recurrenceTypeSchema = z.enum([
  'INCOME',
  'EXPENSE',
  'INVESTMENT_CONTRIBUTION',
]);

export const recurrenceFrequencySchema = z.enum([
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

export const recurrenceStateSchema = z.enum(['ACTIVE', 'PAUSED', 'ENDED']);

export const additionalContributionStrategySchema = z.enum([
  'NONE',
  'REMAINING_SURPLUS',
]);

export const recurrenceInvestmentRefSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: investmentTypeSchema,
  typeLabel: z.string(),
  status: recordStatusSchema,
});

export const savingStrategySchema = z.object({
  minimumRetainedBalance: moneySchema,
  additionalContribution: additionalContributionStrategySchema,
  additionalContributionLabel: z.string(),
});

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
  investment: recurrenceInvestmentRefSchema.nullable(),
  category: transactionCategoryRefSchema.nullable(),
  savingStrategy: savingStrategySchema.nullable(),
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
  movementUuid: z.string().nullable(),
  invoiceMonth: z.iso.date().nullable(),
});

export type RecurrenceType = z.infer<typeof recurrenceTypeSchema>;
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;
export type AdditionalContributionStrategy = z.infer<
  typeof additionalContributionStrategySchema
>;
export type RecurrenceState = z.infer<typeof recurrenceStateSchema>;
export type Recurrence = z.infer<typeof recurrenceSchema>;
export type RecurrenceOccurrence = z.infer<typeof recurrenceOccurrenceSchema>;

export const isCardRecurrence = ({
  creditCard,
}: Pick<Recurrence, 'creditCard'>) => creditCard !== null;

export const isContributionRecurrence = ({ type }: Pick<Recurrence, 'type'>) =>
  type === 'INVESTMENT_CONTRIBUTION';

export const isRecurrenceEnded = ({ state }: Pick<Recurrence, 'state'>) =>
  state === 'ENDED';
