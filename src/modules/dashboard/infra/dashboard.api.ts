import { parseApiData } from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import { type Dashboard, dashboardSchema } from '../domain/dashboard.schema';
import type { MonthRef } from '../domain/month-ref';

export const fetchDashboard = async (month?: MonthRef): Promise<Dashboard> => {
  const response = await httpClient.get<unknown>('/dashboard', {
    params: month,
  });

  return parseApiData(dashboardSchema, response.data);
};
