import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { MonthRef } from '../domain/month-ref';
import { fetchDashboard } from './dashboard.api';

export const dashboardKey = ['dashboard'] as const;

export const useDashboard = (month?: MonthRef) =>
  useQuery({
    queryKey: [...dashboardKey, month ?? 'default'],
    queryFn: () => fetchDashboard(month),
    placeholderData: keepPreviousData,
  });
