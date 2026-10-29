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
  balances: { actual: '0.00', projected: '0.00' },
  accounts: [],
  ...overrides,
});

export const dashboardRoute = {
  'GET /dashboard': {
    status: 200,
    data: { data: buildDashboard(), meta: {} },
  },
};
