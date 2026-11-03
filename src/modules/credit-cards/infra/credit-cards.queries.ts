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
  cancelCreditCardPayment,
  createCreditCard,
  createCreditCardPurchase,
  createCreditCardRefund,
  type CreditCardInvoiceListParams,
  type CreditCardListParams,
  type CreditCardPurchaseListParams,
  deleteCreditCard,
  deleteCreditCardPurchase,
  deleteCreditCardRefund,
  fetchCreditCardInvoice,
  fetchCreditCardInvoices,
  fetchCreditCardPurchases,
  fetchCreditCards,
  payCreditCardInvoice,
  updateCreditCard,
  updateCreditCardPurchase,
  updateCreditCardStatus,
} from './credit-cards.api';
import { creditCardsKey } from './credit-cards.keys';

export const useCreditCards = (params: CreditCardListParams = {}) =>
  useQuery({
    queryKey: [...creditCardsKey, 'list', params],
    queryFn: () => fetchCreditCards(params),
    placeholderData: keepPreviousData,
  });

export const useCreditCardInvoices = (
  cardUuid: string,
  params: CreditCardInvoiceListParams = {},
) =>
  useQuery({
    queryKey: [...creditCardsKey, 'invoices', cardUuid, params],
    queryFn: () => fetchCreditCardInvoices(cardUuid, params),
    placeholderData: keepPreviousData,
  });

export const useCreditCardInvoice = (uuid?: string) =>
  useQuery({
    queryKey: [...creditCardsKey, 'invoice', uuid],
    queryFn: () => fetchCreditCardInvoice(uuid ?? ''),
    enabled: uuid !== undefined,
  });

export const useCreditCardPurchases = (
  params: CreditCardPurchaseListParams = {},
) =>
  useQuery({
    queryKey: [...creditCardsKey, 'purchases', params],
    queryFn: () => fetchCreditCardPurchases(params),
    placeholderData: keepPreviousData,
  });

const useCreditCardMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await Promise.all(
        [creditCardsKey, dashboardKey, accountsKey, recurrencesKey].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
};

export const useCreateCreditCard = () =>
  useCreditCardMutation(createCreditCard);

export const useUpdateCreditCard = () =>
  useCreditCardMutation(updateCreditCard);

export const useUpdateCreditCardStatus = () =>
  useCreditCardMutation(updateCreditCardStatus);

export const useDeleteCreditCard = () =>
  useCreditCardMutation(deleteCreditCard);

export const usePayCreditCardInvoice = () =>
  useCreditCardMutation(payCreditCardInvoice);

export const useCancelCreditCardPayment = () =>
  useCreditCardMutation(cancelCreditCardPayment);

export const useCreateCreditCardPurchase = () =>
  useCreditCardMutation(createCreditCardPurchase);

export const useUpdateCreditCardPurchase = () =>
  useCreditCardMutation(updateCreditCardPurchase);

export const useDeleteCreditCardPurchase = () =>
  useCreditCardMutation(deleteCreditCardPurchase);

export const useCreateCreditCardRefund = () =>
  useCreditCardMutation(createCreditCardRefund);

export const useDeleteCreditCardRefund = () =>
  useCreditCardMutation(deleteCreditCardRefund);
