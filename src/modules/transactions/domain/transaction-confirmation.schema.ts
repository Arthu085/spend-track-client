import { z } from 'zod';
import { transactionSchema } from './transaction.schema';

export const BULK_CONFIRMATION_MAX_ITEMS = 200;

export const confirmationBlockedReasonSchema = z.enum([
  'INACTIVE_ACCOUNT',
  'BEFORE_ACCOUNT_OPENING',
]);

export const pendingConfirmationSchema = transactionSchema.extend({
  overdue: z.boolean(),
  future: z.boolean(),
  confirmable: z.boolean(),
  blockedReason: confirmationBlockedReasonSchema.nullable(),
  earliestCompletedOn: z.iso.date(),
});

export const pendingConfirmationsSchema = z.object({
  items: z.array(pendingConfirmationSchema),
  total: z.number(),
});

export const bulkConfirmationResultSchema = z.object({
  uuid: z.string(),
  outcome: z.enum(['CONFIRMED', 'ALREADY_COMPLETED', 'FAILED']),
  message: z.string().nullable(),
  transaction: transactionSchema.nullable(),
});

export const bulkConfirmationSchema = z.object({
  results: z.array(bulkConfirmationResultSchema),
  confirmedCount: z.number(),
  alreadyCompletedCount: z.number(),
  failedCount: z.number(),
});

export type PendingConfirmation = z.infer<typeof pendingConfirmationSchema>;
export type PendingConfirmations = z.infer<typeof pendingConfirmationsSchema>;
export type BulkConfirmationResult = z.infer<
  typeof bulkConfirmationResultSchema
>;
export type BulkConfirmation = z.infer<typeof bulkConfirmationSchema>;

export interface BulkConfirmationItem {
  uuid: string;
  completedOn: string;
}

export const isSelectedByDefault = ({
  confirmable,
  future,
}: Pick<PendingConfirmation, 'confirmable' | 'future'>) =>
  confirmable && !future;
