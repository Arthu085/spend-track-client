import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import { transactionsKey } from '@/modules/transactions/infra/transactions.keys';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  type TransactionCategoryListParams,
  createTransactionCategory,
  deleteTransactionCategory,
  fetchTransactionCategories,
  updateTransactionCategory,
  updateTransactionCategoryStatus,
} from './transaction-categories.api';

const transactionCategoriesKey = ['transaction-categories'] as const;

export const useTransactionCategories = (
  params: TransactionCategoryListParams = {},
) =>
  useQuery({
    queryKey: [...transactionCategoriesKey, 'list', params],
    queryFn: () => fetchTransactionCategories(params),
    placeholderData: keepPreviousData,
  });

const useTransactionCategoryMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [transactionCategoriesKey, dashboardKey, transactionsKey].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useCreateTransactionCategory = () =>
  useTransactionCategoryMutation(createTransactionCategory);

export const useUpdateTransactionCategory = () =>
  useTransactionCategoryMutation(updateTransactionCategory);

export const useUpdateTransactionCategoryStatus = () =>
  useTransactionCategoryMutation(updateTransactionCategoryStatus);

export const useDeleteTransactionCategory = () =>
  useTransactionCategoryMutation(deleteTransactionCategory);
