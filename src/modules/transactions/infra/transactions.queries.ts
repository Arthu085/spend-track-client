import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { accountsKey } from '@/modules/accounts/infra/accounts.queries';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  createTransaction,
  deleteTransaction,
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
        [transactionsKey, dashboardKey, accountsKey].map((queryKey) =>
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
