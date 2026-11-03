import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { TransactionState } from '@/modules/transactions/domain/transaction.schema';
import type {
  CreateRecurrencePayload,
  EndRecurrencePayload,
  OccurrencePayload,
  RecurrenceFilters,
  UpdateRecurrencePayload,
} from '../domain/recurrence-form.schemas';
import {
  type Recurrence,
  type RecurrenceOccurrence,
  recurrenceOccurrenceSchema,
  recurrenceSchema,
} from '../domain/recurrence.schema';

export interface RecurrenceListParams extends RecurrenceFilters {
  page?: number;
  limit?: number;
}

export interface RecurrenceOccurrenceListParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  state?: TransactionState;
}

export interface UpdateRecurrenceVariables extends UpdateRecurrencePayload {
  uuid: string;
}

export interface UpdateRecurrenceStateVariables {
  uuid: string;
  state: 'ACTIVE' | 'PAUSED';
}

export interface EndRecurrenceVariables {
  uuid: string;
  payload: EndRecurrencePayload;
}

export interface OccurrenceVariables {
  recurrenceUuid: string;
  occurrenceUuid: string;
}

export type UpdateOccurrenceVariables = OccurrenceVariables &
  Partial<OccurrencePayload>;

const recurrencePath = (uuid: string) => `/recurrences/${uuid}`;

const occurrencePath = ({
  recurrenceUuid,
  occurrenceUuid,
}: OccurrenceVariables) =>
  `${recurrencePath(recurrenceUuid)}/occurrences/${occurrenceUuid}`;

export const fetchRecurrences = async (
  params: RecurrenceListParams = {},
): Promise<PaginatedResponse<Recurrence>> => {
  const response = await httpClient.get<unknown>('/recurrences', { params });

  return parsePaginatedResponse(recurrenceSchema, response.data);
};

export const fetchRecurrenceOccurrences = async (
  uuid: string,
  params: RecurrenceOccurrenceListParams = {},
): Promise<PaginatedResponse<RecurrenceOccurrence>> => {
  const response = await httpClient.get<unknown>(
    `${recurrencePath(uuid)}/occurrences`,
    { params },
  );

  return parsePaginatedResponse(recurrenceOccurrenceSchema, response.data);
};

export const createRecurrence = async (
  payload: CreateRecurrencePayload,
): Promise<ApiResponse<Recurrence>> => {
  const response = await httpClient.post<unknown>('/recurrences', payload);

  return parseApiResponse(recurrenceSchema, response.data);
};

export const updateRecurrence = async ({
  uuid,
  ...payload
}: UpdateRecurrenceVariables): Promise<ApiResponse<Recurrence>> => {
  const response = await httpClient.patch<unknown>(
    recurrencePath(uuid),
    payload,
  );

  return parseApiResponse(recurrenceSchema, response.data);
};

export const updateRecurrenceState = async ({
  uuid,
  state,
}: UpdateRecurrenceStateVariables): Promise<ApiResponse<Recurrence>> => {
  const response = await httpClient.put<unknown>(
    `${recurrencePath(uuid)}/state`,
    { state },
  );

  return parseApiResponse(recurrenceSchema, response.data);
};

export const endRecurrence = async ({
  uuid,
  payload,
}: EndRecurrenceVariables): Promise<ApiResponse<Recurrence>> => {
  const response = await httpClient.put<unknown>(
    `${recurrencePath(uuid)}/end`,
    payload,
  );

  return parseApiResponse(recurrenceSchema, response.data);
};

export const updateRecurrenceOccurrence = async ({
  recurrenceUuid,
  occurrenceUuid,
  ...payload
}: UpdateOccurrenceVariables): Promise<ApiResponse<RecurrenceOccurrence>> => {
  const response = await httpClient.patch<unknown>(
    occurrencePath({ recurrenceUuid, occurrenceUuid }),
    payload,
  );

  return parseApiResponse(recurrenceOccurrenceSchema, response.data);
};

export const confirmRecurrenceOccurrence = async ({
  recurrenceUuid,
  occurrenceUuid,
  ...payload
}: UpdateOccurrenceVariables): Promise<ApiResponse<RecurrenceOccurrence>> => {
  const response = await httpClient.put<unknown>(
    `${occurrencePath({ recurrenceUuid, occurrenceUuid })}/confirmation`,
    payload,
  );

  return parseApiResponse(recurrenceOccurrenceSchema, response.data);
};

export const cancelRecurrenceOccurrence = async (
  variables: OccurrenceVariables,
): Promise<ApiResponse<RecurrenceOccurrence>> => {
  const response = await httpClient.put<unknown>(
    `${occurrencePath(variables)}/cancellation`,
  );

  return parseApiResponse(recurrenceOccurrenceSchema, response.data);
};
