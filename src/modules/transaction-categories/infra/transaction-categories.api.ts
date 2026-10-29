import { z } from 'zod';
import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import type { TransactionCategoryForm } from '../domain/transaction-category-form.schemas';
import {
  type TransactionCategory,
  type TransactionCategoryKind,
  transactionCategorySchema,
} from '../domain/transaction-category.schema';

export interface TransactionCategoryListParams {
  page?: number;
  limit?: number;
  kind?: TransactionCategoryKind;
  status?: RecordStatus;
}

export interface UpdateTransactionCategoryPayload {
  uuid: string;
  name?: string;
  color?: string;
}

export interface UpdateTransactionCategoryStatusPayload {
  uuid: string;
  status: RecordStatus;
}

export const fetchTransactionCategories = async (
  params: TransactionCategoryListParams = {},
): Promise<PaginatedResponse<TransactionCategory>> => {
  const response = await httpClient.get<unknown>('/transaction-categories', {
    params,
  });

  return parsePaginatedResponse(transactionCategorySchema, response.data);
};

export const createTransactionCategory = async (
  payload: TransactionCategoryForm,
): Promise<ApiResponse<TransactionCategory>> => {
  const response = await httpClient.post<unknown>(
    '/transaction-categories',
    payload,
  );

  return parseApiResponse(transactionCategorySchema, response.data);
};

export const updateTransactionCategory = async ({
  uuid,
  ...payload
}: UpdateTransactionCategoryPayload): Promise<
  ApiResponse<TransactionCategory>
> => {
  const response = await httpClient.patch<unknown>(
    `/transaction-categories/${uuid}`,
    payload,
  );

  return parseApiResponse(transactionCategorySchema, response.data);
};

export const deleteTransactionCategory = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(
    `/transaction-categories/${uuid}`,
  );

  return parseApiResponse(z.null(), response.data);
};

export const updateTransactionCategoryStatus = async ({
  uuid,
  status,
}: UpdateTransactionCategoryStatusPayload): Promise<
  ApiResponse<TransactionCategory>
> => {
  const response = await httpClient.put<unknown>(
    `/transaction-categories/${uuid}/status`,
    {
      status,
    },
  );

  return parseApiResponse(transactionCategorySchema, response.data);
};
