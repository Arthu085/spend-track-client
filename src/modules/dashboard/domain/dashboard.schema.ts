import { z } from 'zod';
import { accountTypeSchema } from '@/modules/accounts/domain/account.schema';
import { spendingPerspectiveSchema } from '@/modules/preferences/domain/preferences.schema';
import { moneySchema } from '@/shared/money/money';

export const periodTimingSchema = z.enum(['PAST', 'CURRENT', 'FUTURE']);

export const dashboardPeriodSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  today: z.iso.date(),
  daysInMonth: z.number().int(),
  timing: periodTimingSchema,
  remainingDays: z.number().int().nonnegative(),
});

export const dashboardAccountSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  typeLabel: z.string(),
  isDefault: z.boolean(),
  actualBalance: moneySchema,
  projectedBalance: moneySchema,
});

export const dashboardSchema = z.object({
  period: dashboardPeriodSchema,
  perspective: spendingPerspectiveSchema,
  perspectiveLabel: z.string(),
  balances: z.object({ actual: moneySchema, projected: moneySchema }),
  accounts: z.array(dashboardAccountSchema),
});

export type PeriodTiming = z.infer<typeof periodTimingSchema>;
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type DashboardAccount = z.infer<typeof dashboardAccountSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
