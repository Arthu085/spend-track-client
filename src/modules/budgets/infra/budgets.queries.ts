import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import type { MonthRef } from '@/shared/date/month-ref';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import { deleteBudget, fetchBudget, saveBudget } from './budgets.api';
import { budgetsKey } from './budgets.keys';

export const budgetQueryOptions = (month: MonthRef) =>
  queryOptions({
    queryKey: [...budgetsKey, month.year, month.month],
    queryFn: () => fetchBudget(month),
  });

export const useBudget = (month: MonthRef) =>
  useQuery(budgetQueryOptions(month));

const useBudgetMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [budgetsKey, dashboardKey].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useSaveBudget = () => useBudgetMutation(saveBudget);

export const useDeleteBudget = () => useBudgetMutation(deleteBudget);
