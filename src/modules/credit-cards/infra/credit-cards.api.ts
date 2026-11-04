import { z } from 'zod';
import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiData,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import {
  type ArchiveStatusVariables,
  type PendingOperations,
  pendingOperationsSchema,
} from '@/shared/domain/pending-operations.schema';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import type {
  CreateCreditCardPurchasePayload,
  CreditCardPayload,
  CreditCardPaymentPayload,
  CreditCardPurchaseFilters,
  CreditCardRefundPayload,
  UpdateCreditCardPurchasePayload,
} from '../domain/credit-card-form.schemas';
import {
  type CreditCard,
  type CreditCardInvoice,
  type CreditCardInvoiceDetail,
  type CreditCardPayment,
  type CreditCardPurchase,
  type CreditCardRefund,
  creditCardInvoiceDetailSchema,
  creditCardInvoiceSchema,
  creditCardPaymentSchema,
  creditCardPurchaseSchema,
  creditCardRefundSchema,
  creditCardSchema,
} from '../domain/credit-card.schema';

export interface CreditCardListParams {
  page?: number;
  limit?: number;
  status?: RecordStatus;
}

export interface CreditCardInvoiceListParams {
  page?: number;
  limit?: number;
}

export interface CreditCardPurchaseListParams extends CreditCardPurchaseFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface UpdateCreditCardVariables extends Partial<CreditCardPayload> {
  uuid: string;
}

export type UpdateCreditCardStatusVariables = ArchiveStatusVariables;

export interface UpdateCreditCardPurchaseVariables extends UpdateCreditCardPurchasePayload {
  uuid: string;
}

export interface CreateCreditCardRefundVariables extends CreditCardRefundPayload {
  purchaseUuid: string;
}

export interface DeleteCreditCardRefundVariables {
  purchaseUuid: string;
  refundUuid: string;
}

export interface PayCreditCardInvoiceVariables extends CreditCardPaymentPayload {
  invoiceUuid: string;
}

export interface CancelCreditCardPaymentVariables {
  invoiceUuid: string;
  paymentUuid: string;
}

export const fetchCreditCards = async (
  params: CreditCardListParams = {},
): Promise<PaginatedResponse<CreditCard>> => {
  const response = await httpClient.get<unknown>('/credit-cards', { params });

  return parsePaginatedResponse(creditCardSchema, response.data);
};

export const fetchCreditCardInvoices = async (
  cardUuid: string,
  params: CreditCardInvoiceListParams = {},
): Promise<PaginatedResponse<CreditCardInvoice>> => {
  const response = await httpClient.get<unknown>(
    `/credit-cards/${cardUuid}/invoices`,
    { params },
  );

  return parsePaginatedResponse(creditCardInvoiceSchema, response.data);
};

export const createCreditCard = async (
  payload: CreditCardPayload,
): Promise<ApiResponse<CreditCard>> => {
  const response = await httpClient.post<unknown>('/credit-cards', payload);

  return parseApiResponse(creditCardSchema, response.data);
};

export const updateCreditCard = async ({
  uuid,
  ...payload
}: UpdateCreditCardVariables): Promise<ApiResponse<CreditCard>> => {
  const response = await httpClient.patch<unknown>(
    `/credit-cards/${uuid}`,
    payload,
  );

  return parseApiResponse(creditCardSchema, response.data);
};

export const fetchCreditCardPendingOperations = async (
  uuid: string,
): Promise<PendingOperations> => {
  const response = await httpClient.get<unknown>(
    `/credit-cards/${uuid}/pending-operations`,
  );

  return parseApiData(pendingOperationsSchema, response.data);
};

export const updateCreditCardStatus = async ({
  uuid,
  ...payload
}: UpdateCreditCardStatusVariables): Promise<ApiResponse<CreditCard>> => {
  const response = await httpClient.put<unknown>(
    `/credit-cards/${uuid}/status`,
    payload,
  );

  return parseApiResponse(creditCardSchema, response.data);
};

export const deleteCreditCard = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(`/credit-cards/${uuid}`);

  return parseApiResponse(z.null(), response.data);
};

export const fetchCreditCardInvoice = async (
  uuid: string,
): Promise<CreditCardInvoiceDetail> => {
  const response = await httpClient.get<unknown>(
    `/credit-card-invoices/${uuid}`,
  );

  return parseApiData(creditCardInvoiceDetailSchema, response.data);
};

export const payCreditCardInvoice = async ({
  invoiceUuid,
  ...payload
}: PayCreditCardInvoiceVariables): Promise<ApiResponse<CreditCardPayment>> => {
  const response = await httpClient.post<unknown>(
    `/credit-card-invoices/${invoiceUuid}/payments`,
    payload,
  );

  return parseApiResponse(creditCardPaymentSchema, response.data);
};

export const cancelCreditCardPayment = async ({
  invoiceUuid,
  paymentUuid,
}: CancelCreditCardPaymentVariables): Promise<
  ApiResponse<CreditCardPayment>
> => {
  const response = await httpClient.put<unknown>(
    `/credit-card-invoices/${invoiceUuid}/payments/${paymentUuid}/cancellation`,
  );

  return parseApiResponse(creditCardPaymentSchema, response.data);
};

export const fetchCreditCardPurchases = async (
  params: CreditCardPurchaseListParams = {},
): Promise<PaginatedResponse<CreditCardPurchase>> => {
  const response = await httpClient.get<unknown>('/credit-card-purchases', {
    params,
  });

  return parsePaginatedResponse(creditCardPurchaseSchema, response.data);
};

export const createCreditCardPurchase = async (
  payload: CreateCreditCardPurchasePayload,
): Promise<ApiResponse<CreditCardPurchase>> => {
  const response = await httpClient.post<unknown>(
    '/credit-card-purchases',
    payload,
  );

  return parseApiResponse(creditCardPurchaseSchema, response.data);
};

export const updateCreditCardPurchase = async ({
  uuid,
  ...payload
}: UpdateCreditCardPurchaseVariables): Promise<
  ApiResponse<CreditCardPurchase>
> => {
  const response = await httpClient.patch<unknown>(
    `/credit-card-purchases/${uuid}`,
    payload,
  );

  return parseApiResponse(creditCardPurchaseSchema, response.data);
};

export const deleteCreditCardPurchase = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(
    `/credit-card-purchases/${uuid}`,
  );

  return parseApiResponse(z.null(), response.data);
};

export const createCreditCardRefund = async ({
  purchaseUuid,
  ...payload
}: CreateCreditCardRefundVariables): Promise<ApiResponse<CreditCardRefund>> => {
  const response = await httpClient.post<unknown>(
    `/credit-card-purchases/${purchaseUuid}/refunds`,
    payload,
  );

  return parseApiResponse(creditCardRefundSchema, response.data);
};

export const deleteCreditCardRefund = async ({
  purchaseUuid,
  refundUuid,
}: DeleteCreditCardRefundVariables): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(
    `/credit-card-purchases/${purchaseUuid}/refunds/${refundUuid}`,
  );

  return parseApiResponse(z.null(), response.data);
};
