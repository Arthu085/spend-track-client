import { z } from 'zod';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { moneySchema } from '@/shared/money/money';

export const accountTypeSchema = z.enum([
  'CHECKING',
  'SAVINGS',
  'CASH',
  'OTHER',
]);

export const accountSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  typeLabel: z.string(),
  openingBalance: moneySchema,
  openingBalanceDate: z.iso.date(),
  currentBalance: moneySchema,
  isDefault: z.boolean(),
  status: recordStatusSchema,
  statusLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
