import { z } from 'zod';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const pendingOperationsSchema = z.object({
  count: z.number().int().nonnegative(),
  total: moneySchema,
});

export type PendingOperations = z.infer<typeof pendingOperationsSchema>;

export type PendingOperationsDecision = 'KEEP' | 'CANCEL';

export interface ArchiveStatusVariables {
  uuid: string;
  status: RecordStatus;
  pendingOperations?: PendingOperationsDecision;
}
