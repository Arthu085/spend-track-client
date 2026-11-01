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
  type AccountListParams,
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
  updateAccountStatus,
} from './accounts.api';

export const accountsKey = ['accounts'] as const;

export const useAccounts = (params: AccountListParams = {}) =>
  useQuery({
    queryKey: [...accountsKey, 'list', params],
    queryFn: () => fetchAccounts(params),
    placeholderData: keepPreviousData,
  });

const useAccountMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [accountsKey, dashboardKey, transactionsKey].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useCreateAccount = () => useAccountMutation(createAccount);

export const useUpdateAccount = () => useAccountMutation(updateAccount);

export const useUpdateAccountStatus = () =>
  useAccountMutation(updateAccountStatus);

export const useDeleteAccount = () => useAccountMutation(deleteAccount);
