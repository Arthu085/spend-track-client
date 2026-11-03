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
  createInvestment,
  createInvestmentMovement,
  createInvestmentValuation,
  deleteInvestment,
  fetchInvestmentMovements,
  fetchInvestments,
  type InvestmentListParams,
  type InvestmentMovementListParams,
  updateInvestment,
  updateInvestmentMovementState,
  updateInvestmentStatus,
} from './investments.api';
import { investmentsKey } from './investments.keys';

export const useInvestments = (params: InvestmentListParams = {}) =>
  useQuery({
    queryKey: [...investmentsKey, 'list', params],
    queryFn: () => fetchInvestments(params),
    placeholderData: keepPreviousData,
  });

export const useInvestmentMovements = (
  investmentUuid: string,
  params: InvestmentMovementListParams = {},
) =>
  useQuery({
    queryKey: [...investmentsKey, 'movements', investmentUuid, params],
    queryFn: () => fetchInvestmentMovements(investmentUuid, params),
    placeholderData: keepPreviousData,
  });

const useInvestmentMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [investmentsKey, dashboardKey, accountsKey].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useCreateInvestment = () =>
  useInvestmentMutation(createInvestment);

export const useUpdateInvestment = () =>
  useInvestmentMutation(updateInvestment);

export const useUpdateInvestmentStatus = () =>
  useInvestmentMutation(updateInvestmentStatus);

export const useDeleteInvestment = () =>
  useInvestmentMutation(deleteInvestment);

export const useCreateInvestmentMovement = () =>
  useInvestmentMutation(createInvestmentMovement);

export const useCreateInvestmentValuation = () =>
  useInvestmentMutation(createInvestmentValuation);

export const useUpdateInvestmentMovementState = () =>
  useInvestmentMutation(updateInvestmentMovementState);
