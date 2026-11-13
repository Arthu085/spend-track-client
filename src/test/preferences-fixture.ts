import type { Preferences } from '@/modules/preferences/domain/preferences.schema';

export const buildPreferences = (
  overrides: Partial<Preferences> = {},
): Preferences => ({
  spendingPerspective: 'PURCHASE_DATE',
  spendingPerspectiveLabel: 'Data da compra',
  defaultMonth: 'CURRENT',
  defaultMonthLabel: 'Mês atual',
  collapsedDashboardCards: [],
  updatedAt: null,
  ...overrides,
});
