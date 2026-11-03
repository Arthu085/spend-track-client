import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { accountsKey } from '@/modules/accounts/infra/accounts.queries';
import { creditCardsKey } from '@/modules/credit-cards/infra/credit-cards.keys';
import { dashboardKey } from '@/modules/dashboard/infra/dashboard.queries';
import { transactionsKey } from '@/modules/transactions/infra/transactions.keys';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  cancelRecurrenceOccurrence,
  confirmRecurrenceOccurrence,
  createRecurrence,
  endRecurrence,
  fetchRecurrenceOccurrences,
  fetchRecurrences,
  type RecurrenceListParams,
  type RecurrenceOccurrenceListParams,
  updateRecurrence,
  updateRecurrenceOccurrence,
  updateRecurrenceState,
} from './recurrences.api';
import { recurrencesKey } from './recurrences.keys';

export const useRecurrences = (params: RecurrenceListParams = {}) =>
  useQuery({
    queryKey: [...recurrencesKey, 'list', params],
    queryFn: () => fetchRecurrences(params),
    placeholderData: keepPreviousData,
  });

export const useRecurrenceOccurrences = (
  uuid: string | undefined,
  params: RecurrenceOccurrenceListParams = {},
) =>
  useQuery({
    queryKey: [...recurrencesKey, 'occurrences', uuid, params],
    queryFn: () => fetchRecurrenceOccurrences(uuid ?? '', params),
    enabled: uuid !== undefined,
    placeholderData: keepPreviousData,
  });

const useRecurrenceMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [
          recurrencesKey,
          transactionsKey,
          creditCardsKey,
          dashboardKey,
          accountsKey,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};

export const useCreateRecurrence = () =>
  useRecurrenceMutation(createRecurrence);

export const useUpdateRecurrence = () =>
  useRecurrenceMutation(updateRecurrence);

export const useUpdateRecurrenceState = () =>
  useRecurrenceMutation(updateRecurrenceState);

export const useEndRecurrence = () => useRecurrenceMutation(endRecurrence);

export const useUpdateRecurrenceOccurrence = () =>
  useRecurrenceMutation(updateRecurrenceOccurrence);

export const useConfirmRecurrenceOccurrence = () =>
  useRecurrenceMutation(confirmRecurrenceOccurrence);

export const useCancelRecurrenceOccurrence = () =>
  useRecurrenceMutation(cancelRecurrenceOccurrence);
