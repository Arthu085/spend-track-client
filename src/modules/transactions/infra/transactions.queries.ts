import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { accountsKey } from '@/modules/accounts/infra/accounts.queries';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import { recurrencesKey } from '@/modules/recurrences/infra/recurrences.keys';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  confirmTransactionsInChunks,
  createTransaction,
  deleteTransaction,
  fetchPendingConfirmations,
  fetchTransactions,
  type TransactionListParams,
  updateTransaction,
  updateTransactionState,
} from './transactions.api';
import { transactionsKey } from './transactions.keys';

export const useTransactions = (params: TransactionListParams = {}) =>
  useQuery({
    queryKey: [...transactionsKey, 'list', params],
    queryFn: () => fetchTransactions(params),
    placeholderData: keepPreviousData,
  });

export const usePendingConfirmations = (until: string) =>
  useQuery({
    queryKey: [...transactionsKey, 'pending-confirmations', until],
    queryFn: () => fetchPendingConfirmations(until),
    gcTime: 0,
  });

const affectedQueryKeys = [
  transactionsKey,
  dashboardKey,
  accountsKey,
  recurrencesKey,
];

const useTransactionMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        affectedQueryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useCreateTransaction = () =>
  useTransactionMutation(createTransaction);

export const useUpdateTransaction = () =>
  useTransactionMutation(updateTransaction);

export const useUpdateTransactionState = () =>
  useTransactionMutation(updateTransactionState);

export const useDeleteTransaction = () =>
  useTransactionMutation(deleteTransaction);

export const useConfirmPendingTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmTransactionsInChunks,
    onSuccess: () => {
      for (const queryKey of affectedQueryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};
