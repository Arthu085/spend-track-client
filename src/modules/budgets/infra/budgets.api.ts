import { z } from 'zod';
import {
  type ApiResponse,
  parseApiData,
  parseApiResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { MonthRef } from '@/shared/date/month-ref';
import {
  type Budget,
  type BudgetPayload,
  budgetSchema,
} from '../domain/budget.schema';

const budgetPath = ({ year, month }: MonthRef) => `/budgets/${year}/${month}`;

export const fetchBudget = async (month: MonthRef): Promise<Budget> => {
  const response = await httpClient.get<unknown>(budgetPath(month));

  return parseApiData(budgetSchema, response.data);
};

export const saveBudget = async ({
  month,
  payload,
}: {
  month: MonthRef;
  payload: BudgetPayload;
}): Promise<ApiResponse<Budget>> => {
  const response = await httpClient.put<unknown>(budgetPath(month), payload);

  return parseApiResponse(budgetSchema, response.data);
};

export const deleteBudget = async (
  month: MonthRef,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(budgetPath(month));

  return parseApiResponse(z.null(), response.data);
};
