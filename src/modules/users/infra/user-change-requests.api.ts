import { z } from 'zod';
import {
  type ApiResponse,
  parseApiData,
  parseApiResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import {
  type UserChangeRequest,
  userChangeRequestSchema,
} from '../domain/user-change-request.schema';
import { type UserDetail, userDetailSchema } from '../domain/user.schema';
import type { UpdateUserPayload } from './users.api';

export const fetchOwnChangeRequests = async (): Promise<
  UserChangeRequest[]
> => {
  const response = await httpClient.get<unknown>('/users/me/change-requests');

  return parseApiData(z.array(userChangeRequestSchema), response.data);
};

export const createChangeRequest = async ({
  uuid,
  ...payload
}: UpdateUserPayload): Promise<UserChangeRequest> => {
  const response = await httpClient.post<unknown>(
    `/users/${uuid}/change-requests`,
    payload,
  );

  return parseApiData(userChangeRequestSchema, response.data);
};

export const approveChangeRequest = async (
  uuid: string,
): Promise<UserDetail> => {
  const response = await httpClient.post<unknown>(
    `/users/me/change-requests/${uuid}/approve`,
  );
  httpClient.clearCsrfToken();

  return parseApiData(userDetailSchema, response.data);
};

export const rejectChangeRequest = async (
  uuid: string,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.post<unknown>(
    `/users/me/change-requests/${uuid}/reject`,
  );

  return parseApiResponse(z.null(), response.data);
};
