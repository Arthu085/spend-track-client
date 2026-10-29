import { z } from 'zod';

export const spendingPerspectiveSchema = z.enum([
  'PURCHASE_DATE',
  'INVOICE_MONTH',
]);

export const defaultMonthSchema = z.enum(['CURRENT', 'NEXT']);

export const preferencesSchema = z.object({
  spendingPerspective: spendingPerspectiveSchema,
  spendingPerspectiveLabel: z.string(),
  defaultMonth: defaultMonthSchema,
  defaultMonthLabel: z.string(),
  updatedAt: z.string().nullable(),
});

export type SpendingPerspective = z.infer<typeof spendingPerspectiveSchema>;
export type DefaultMonth = z.infer<typeof defaultMonthSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesPayload = Partial<
  Pick<Preferences, 'spendingPerspective' | 'defaultMonth'>
>;
