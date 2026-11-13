import type { DashboardCard } from '@/modules/preferences/domain/preferences.schema';

export const dashboardCardTitles = {
  OVERVIEW: 'dashboard.overview.title',
  INCOME: 'dashboard.income.title',
  EXPENSES: 'dashboard.expenses.title',
  NET_RESULT: 'dashboard.net.title',
  BUDGET: 'dashboard.budget.limitsTitle',
  UPCOMING_TRANSACTIONS: 'dashboard.upcoming.title',
  EXPENSES_BY_CATEGORY: 'dashboard.expensesByCategory.title',
  CREDIT_CARD_INVOICES: 'dashboard.creditCards.title',
  INVESTMENTS: 'dashboard.investments.title',
  ACCOUNT_BALANCES: 'dashboard.accounts.title',
} as const satisfies Record<DashboardCard, string>;
