import { z } from 'zod';
import { accountTypeSchema } from '@/modules/accounts/domain/account.schema';
import { creditCardInvoiceSchema } from '@/modules/credit-cards/domain/credit-card.schema';
import {
  investmentProgressSchema,
  investmentTypeSchema,
} from '@/modules/investments/domain/investment.schema';
import { spendingPerspectiveSchema } from '@/modules/preferences/domain/preferences.schema';
import {
  transactionAccountSchema,
  transactionTypeSchema,
} from '@/modules/transactions/domain/transaction.schema';
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

export const dashboardAmountsSchema = z.object({
  total: moneySchema,
  completed: moneySchema,
  pending: moneySchema,
});

export const dashboardCategorySchema = z.object({
  uuid: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

export const dashboardCategoryExpensesSchema = dashboardAmountsSchema.extend({
  category: dashboardCategorySchema,
});

export const dashboardUpcomingSchema = z.object({
  uuid: z.string(),
  type: transactionTypeSchema,
  typeLabel: z.string(),
  description: z.string(),
  amount: moneySchema,
  date: z.iso.date(),
  overdue: z.boolean(),
  account: transactionAccountSchema,
  destinationAccount: transactionAccountSchema.nullable(),
  category: dashboardCategorySchema.nullable(),
});

export const dashboardCreditCardsSchema = z.object({
  spending: moneySchema,
  outstanding: moneySchema,
  planned: moneySchema,
  invoices: z.array(creditCardInvoiceSchema),
});

export const dashboardBudgetLimitSchema = dashboardAmountsSchema.extend({
  limit: moneySchema,
  remaining: moneySchema,
  overspent: moneySchema,
});

export const dashboardBudgetCategorySchema = dashboardBudgetLimitSchema.extend({
  category: dashboardCategorySchema,
});

export const dashboardBudgetSchema = z.object({
  overall: dashboardBudgetLimitSchema.nullable(),
  categories: z.array(dashboardBudgetCategorySchema),
});

export const dashboardInvestmentSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: investmentTypeSchema,
  typeLabel: z.string(),
  currentValue: moneySchema,
  targetAmount: moneySchema.nullable(),
  progress: investmentProgressSchema.nullable(),
});

export const dashboardInvestmentsSchema = z.object({
  totalValue: moneySchema,
  contributions: dashboardAmountsSchema,
  withdrawals: dashboardAmountsSchema,
  items: z.array(dashboardInvestmentSchema),
});

export const spendingGuidanceBasisSchema = z.enum(['BUDGET', 'BALANCE']);

export const dashboardSpendingGuidanceSchema = z.object({
  basis: spendingGuidanceBasisSchema,
  remaining: moneySchema,
  dailyAllowance: moneySchema.nullable(),
});

export const dashboardSchema = z.object({
  period: dashboardPeriodSchema,
  perspective: spendingPerspectiveSchema,
  perspectiveLabel: z.string(),
  balances: z.object({
    actual: moneySchema,
    projected: moneySchema,
    available: moneySchema,
  }),
  accounts: z.array(dashboardAccountSchema),
  income: dashboardAmountsSchema,
  expenses: dashboardAmountsSchema,
  expensesByCategory: z.array(dashboardCategoryExpensesSchema),
  upcoming: z.array(dashboardUpcomingSchema),
  upcomingCount: z.number().int().nonnegative(),
  creditCards: dashboardCreditCardsSchema,
  budget: dashboardBudgetSchema.nullable(),
  investments: dashboardInvestmentsSchema,
  spendingGuidance: dashboardSpendingGuidanceSchema,
});

export type PeriodTiming = z.infer<typeof periodTimingSchema>;
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type DashboardAccount = z.infer<typeof dashboardAccountSchema>;
export type DashboardAmounts = z.infer<typeof dashboardAmountsSchema>;
export type DashboardCategoryExpenses = z.infer<
  typeof dashboardCategoryExpensesSchema
>;
export type DashboardUpcoming = z.infer<typeof dashboardUpcomingSchema>;
export type DashboardCreditCards = z.infer<typeof dashboardCreditCardsSchema>;
export type DashboardBudgetLimit = z.infer<typeof dashboardBudgetLimitSchema>;
export type DashboardBudget = z.infer<typeof dashboardBudgetSchema>;
export type DashboardInvestments = z.infer<typeof dashboardInvestmentsSchema>;
export type DashboardSpendingGuidance = z.infer<
  typeof dashboardSpendingGuidanceSchema
>;
export type Dashboard = z.infer<typeof dashboardSchema>;
