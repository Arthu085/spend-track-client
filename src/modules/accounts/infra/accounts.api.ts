import { z } from 'zod';
import {
  type ApiResponse,
  parseApiData,
  parseApiResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import type { AccountPayload } from '../domain/account-form.schemas';
import { type Account, accountSchema } from '../domain/account.schema';

export interface AccountListParams {
  status?: RecordStatus;
}

export interface UpdateAccountPayload extends Partial<AccountPayload> {
  uuid: string;
}

export interface UpdateAccountStatusPayload {
  uuid: string;
  status: RecordStatus;
}

export const fetchAccounts = async (
  params: AccountListParams = {},
): Promise<Account[]> => {
  const response = await httpClient.get<unknown>('/accounts', { params });

  return parseApiData(z.array(accountSchema), response.data);
};

export const createAccount = async (
  payload: AccountPayload,
): Promise<ApiResponse<Account>> => {
  const response = await httpClient.post<unknown>('/accounts', payload);

  return parseApiResponse(accountSchema, response.data);
};

export const updateAccount = async ({
  uuid,
  ...payload
}: UpdateAccountPayload): Promise<ApiResponse<Account>> => {
  const response = await httpClient.patch<unknown>(
    `/accounts/${uuid}`,
    payload,
  );

  return parseApiResponse(accountSchema, response.data);
};

export const updateAccountStatus = async ({
  uuid,
  status,
}: UpdateAccountStatusPayload): Promise<ApiResponse<Account>> => {
  const response = await httpClient.put<unknown>(`/accounts/${uuid}/status`, {
    status,
  });

  return parseApiResponse(accountSchema, response.data);
};

export const deleteAccount = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(`/accounts/${uuid}`);

  return parseApiResponse(z.null(), response.data);
};
