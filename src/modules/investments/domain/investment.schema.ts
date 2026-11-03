import { z } from 'zod';
import {
  transactionAccountSchema,
  transactionStateSchema,
} from '@/modules/transactions/domain/transaction.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const investmentTypeSchema = z.enum(['INVESTMENT', 'RESERVE', 'GOAL']);

export const investmentMovementTypeSchema = z.enum([
  'CONTRIBUTION',
  'WITHDRAWAL',
  'VALUATION',
]);

export const investmentProgressSchema = z.object({
  remaining: moneySchema,
  percent: z.number().int().nonnegative(),
});

export const investmentSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: investmentTypeSchema,
  typeLabel: z.string(),
  targetAmount: moneySchema.nullable(),
  currentValue: moneySchema,
  contributed: moneySchema,
  withdrawn: moneySchema,
  adjusted: moneySchema,
  progress: investmentProgressSchema.nullable(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const investmentMovementSchema = z.object({
  uuid: z.string(),
  type: investmentMovementTypeSchema,
  typeLabel: z.string(),
  amount: moneySchema,
  date: z.iso.date(),
  state: transactionStateSchema,
  stateLabel: z.string(),
  completedOn: z.iso.date().nullable(),
  canceledAt: z.string().nullable(),
  account: transactionAccountSchema.nullable(),
  createdAt: z.string(),
});

export type InvestmentType = z.infer<typeof investmentTypeSchema>;
export type InvestmentMovementType = z.infer<
  typeof investmentMovementTypeSchema
>;
export type TransferMovementType = Exclude<InvestmentMovementType, 'VALUATION'>;
export type InvestmentProgress = z.infer<typeof investmentProgressSchema>;
export type Investment = z.infer<typeof investmentSchema>;
export type InvestmentMovement = z.infer<typeof investmentMovementSchema>;
