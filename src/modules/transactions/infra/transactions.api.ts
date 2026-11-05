import { z } from 'zod';
import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiData,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { getApiErrorMessage } from '@/core/http/api-error';
import { httpClient } from '@/core/http/http-client';
import type {
  CreateTransactionPayload,
  TransactionFilters,
  UpdateTransactionPayload,
} from '../domain/transaction-form.schemas';
import {
  BULK_CONFIRMATION_MAX_ITEMS,
  type BulkConfirmation,
  type BulkConfirmationItem,
  type BulkConfirmationResult,
  bulkConfirmationSchema,
  type PendingConfirmations,
  pendingConfirmationsSchema,
} from '../domain/transaction-confirmation.schema';
import {
  type Transaction,
  transactionSchema,
} from '../domain/transaction.schema';

export interface TransactionListParams extends TransactionFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  recurrenceUuid?: string;
}

export interface UpdateTransactionVariables extends UpdateTransactionPayload {
  uuid: string;
}

export type UpdateTransactionStateVariables =
  | { uuid: string; state: 'COMPLETED'; completedOn?: string }
  | { uuid: string; state: 'CANCELED' };

export const fetchTransactions = async (
  params: TransactionListParams = {},
): Promise<PaginatedResponse<Transaction>> => {
  const response = await httpClient.get<unknown>('/transactions', { params });

  return parsePaginatedResponse(transactionSchema, response.data);
};

export const fetchTransaction = async (uuid: string): Promise<Transaction> => {
  const response = await httpClient.get<unknown>(`/transactions/${uuid}`);

  return parseApiData(transactionSchema, response.data);
};

export const createTransaction = async (
  payload: CreateTransactionPayload,
): Promise<ApiResponse<Transaction>> => {
  const response = await httpClient.post<unknown>('/transactions', payload);

  return parseApiResponse(transactionSchema, response.data);
};

export const updateTransaction = async ({
  uuid,
  ...payload
}: UpdateTransactionVariables): Promise<ApiResponse<Transaction>> => {
  const response = await httpClient.patch<unknown>(
    `/transactions/${uuid}`,
    payload,
  );

  return parseApiResponse(transactionSchema, response.data);
};

export const updateTransactionState = async ({
  uuid,
  ...payload
}: UpdateTransactionStateVariables): Promise<ApiResponse<Transaction>> => {
  const response = await httpClient.put<unknown>(
    `/transactions/${uuid}/state`,
    payload,
  );

  return parseApiResponse(transactionSchema, response.data);
};

export const deleteTransaction = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(`/transactions/${uuid}`);

  return parseApiResponse(z.null(), response.data);
};

export const fetchPendingConfirmations = async (
  until: string,
): Promise<PendingConfirmations> => {
  const response = await httpClient.get<unknown>(
    '/transactions/pending-confirmations',
    { params: { until } },
  );

  return parseApiData(pendingConfirmationsSchema, response.data);
};

export const bulkConfirmTransactions = async (
  items: BulkConfirmationItem[],
): Promise<BulkConfirmation> => {
  const response = await httpClient.post<unknown>(
    '/transactions/bulk-confirmation',
    { items },
  );

  return parseApiData(bulkConfirmationSchema, response.data);
};

export const confirmTransactionsInChunks = async (
  items: BulkConfirmationItem[],
): Promise<BulkConfirmationResult[]> => {
  const results: BulkConfirmationResult[] = [];

  for (
    let start = 0;
    start < items.length;
    start += BULK_CONFIRMATION_MAX_ITEMS
  ) {
    try {
      const { results: chunkResults } = await bulkConfirmTransactions(
        items.slice(start, start + BULK_CONFIRMATION_MAX_ITEMS),
      );

      results.push(...chunkResults);
    } catch (error) {
      const message = getApiErrorMessage(error);

      return [
        ...results,
        ...items.slice(start).map(({ uuid }): BulkConfirmationResult => ({
          uuid,
          outcome: 'FAILED',
          message,
          transaction: null,
        })),
      ];
    }
  }

  return results;
};
