import { AppRoutes } from '@/core/router/app-routes';
import type { DashboardPeriod } from '../../domain/dashboard.schema';

const withMonth = (path: string, { year, month }: DashboardPeriod) =>
  `${path}?${new URLSearchParams({
    year: String(year),
    month: String(month),
  }).toString()}`;

export const transactionsOfMonth = (period: DashboardPeriod) =>
  withMonth(AppRoutes.TRANSACTIONS, period);

export const budgetOfMonth = (period: DashboardPeriod) =>
  withMonth(AppRoutes.BUDGETS, period);
