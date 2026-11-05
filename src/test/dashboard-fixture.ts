import type { Dashboard } from '@/modules/dashboard/domain/dashboard.schema';

export const buildDashboard = (
  overrides: Partial<Dashboard> = {},
): Dashboard => ({
  period: {
    year: 2026,
    month: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    today: '2026-10-29',
    daysInMonth: 31,
    timing: 'CURRENT',
    remainingDays: 3,
  },
  perspective: 'PURCHASE_DATE',
  perspectiveLabel: 'Data da compra',
  balances: { actual: '0.00', projected: '0.00', available: '0.00' },
  accounts: [],
  income: { total: '0.00', completed: '0.00', pending: '0.00' },
  expenses: { total: '0.00', completed: '0.00', pending: '0.00' },
  expensesByCategory: [],
  upcoming: [],
  upcomingCount: 0,
  creditCards: {
    spending: '0.00',
    outstanding: '0.00',
    planned: '0.00',
    plannedDue: '0.00',
    invoices: [],
    plannedCharges: [],
    plannedChargesCount: 0,
  },
  budget: null,
  investments: {
    totalValue: '0.00',
    contributions: { total: '0.00', completed: '0.00', pending: '0.00' },
    withdrawals: { total: '0.00', completed: '0.00', pending: '0.00' },
    contributionBreakdown: {
      mandatoryPlanned: '0.00',
      mandatoryCompleted: '0.00',
      additionalPlanned: '0.00',
      additionalCompleted: '0.00',
      oneTimePlanned: '0.00',
      oneTimeCompleted: '0.00',
    },
    savingPlans: [],
    items: [],
  },
  spendingGuidance: {
    basis: 'BALANCE',
    remaining: '0.00',
    dailyAllowance: '0.00',
  },
  ...overrides,
});

export const dashboardRoute = {
  'GET /dashboard': {
    status: 200,
    data: { data: buildDashboard(), meta: {} },
  },
};
