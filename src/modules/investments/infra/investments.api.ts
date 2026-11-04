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
  InvestmentMovementPayload,
  InvestmentPayload,
  InvestmentValuationPayload,
} from '../domain/investment-form.schemas';
import {
  type Investment,
  type InvestmentMovement,
  investmentMovementSchema,
  investmentSchema,
  type InvestmentType,
} from '../domain/investment.schema';

export interface InvestmentListParams {
  page?: number;
  limit?: number;
  type?: InvestmentType;
  status?: RecordStatus;
}

export interface InvestmentMovementListParams {
  page?: number;
  limit?: number;
}

export interface UpdateInvestmentPayload extends Partial<InvestmentPayload> {
  uuid: string;
}

export type UpdateInvestmentStatusPayload = ArchiveStatusVariables;

export interface CreateInvestmentMovementPayload extends InvestmentMovementPayload {
  investmentUuid: string;
}

export interface CreateInvestmentValuationPayload extends InvestmentValuationPayload {
  investmentUuid: string;
}

export interface UpdateInvestmentMovementStatePayload {
  investmentUuid: string;
  movementUuid: string;
  state: 'COMPLETED' | 'CANCELED';
}

const investmentPath = (uuid: string) =>
  `/investments/${encodeURIComponent(uuid)}`;

export const fetchInvestments = async (
  params: InvestmentListParams = {},
): Promise<PaginatedResponse<Investment>> => {
  const response = await httpClient.get<unknown>('/investments', { params });

  return parsePaginatedResponse(investmentSchema, response.data);
};

export const fetchInvestmentMovements = async (
  investmentUuid: string,
  params: InvestmentMovementListParams = {},
): Promise<PaginatedResponse<InvestmentMovement>> => {
  const response = await httpClient.get<unknown>(
    `${investmentPath(investmentUuid)}/movements`,
    { params },
  );

  return parsePaginatedResponse(investmentMovementSchema, response.data);
};

export const createInvestment = async (
  payload: InvestmentPayload,
): Promise<ApiResponse<Investment>> => {
  const response = await httpClient.post<unknown>('/investments', payload);

  return parseApiResponse(investmentSchema, response.data);
};

export const updateInvestment = async ({
  uuid,
  ...payload
}: UpdateInvestmentPayload): Promise<ApiResponse<Investment>> => {
  const response = await httpClient.patch<unknown>(
    investmentPath(uuid),
    payload,
  );

  return parseApiResponse(investmentSchema, response.data);
};

export const fetchInvestmentPendingOperations = async (
  uuid: string,
): Promise<PendingOperations> => {
  const response = await httpClient.get<unknown>(
    `${investmentPath(uuid)}/pending-operations`,
  );

  return parseApiData(pendingOperationsSchema, response.data);
};

export const updateInvestmentStatus = async ({
  uuid,
  ...payload
}: UpdateInvestmentStatusPayload): Promise<ApiResponse<Investment>> => {
  const response = await httpClient.put<unknown>(
    `${investmentPath(uuid)}/status`,
    payload,
  );

  return parseApiResponse(investmentSchema, response.data);
};

export const deleteInvestment = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(investmentPath(uuid));

  return parseApiResponse(z.null(), response.data);
};

export const createInvestmentMovement = async ({
  investmentUuid,
  ...payload
}: CreateInvestmentMovementPayload): Promise<
  ApiResponse<InvestmentMovement>
> => {
  const response = await httpClient.post<unknown>(
    `${investmentPath(investmentUuid)}/movements`,
    payload,
  );

  return parseApiResponse(investmentMovementSchema, response.data);
};

export const createInvestmentValuation = async ({
  investmentUuid,
  ...payload
}: CreateInvestmentValuationPayload): Promise<
  ApiResponse<InvestmentMovement>
> => {
  const response = await httpClient.post<unknown>(
    `${investmentPath(investmentUuid)}/valuations`,
    payload,
  );

  return parseApiResponse(investmentMovementSchema, response.data);
};

export const updateInvestmentMovementState = async ({
  investmentUuid,
  movementUuid,
  state,
}: UpdateInvestmentMovementStatePayload): Promise<
  ApiResponse<InvestmentMovement>
> => {
  const response = await httpClient.put<unknown>(
    `${investmentPath(investmentUuid)}/movements/${encodeURIComponent(movementUuid)}/state`,
    { state },
  );

  return parseApiResponse(investmentMovementSchema, response.data);
};
