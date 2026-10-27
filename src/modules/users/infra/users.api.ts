import { z } from 'zod';
import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiData,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { ListFilters } from '@/shared/list/use-list-params';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import {
  type ChangeOwnPasswordForm,
  type CreateUserForm,
  type UpdateOwnProfileForm,
  type UpdateUserForm,
  userFiltersShape,
} from '../domain/user-form.schemas';
import {
  type UserDetail,
  userDetailSchema,
  type UserListItem,
  userListItemSchema,
} from '../domain/user.schema';

export type UserListParams = {
  page: number;
  limit: number;
} & ListFilters<typeof userFiltersShape>;

export interface UpdateUserPayload extends Omit<UpdateUserForm, 'roleUuids'> {
  roleUuids?: string[];
  uuid: string;
}

export interface UpdateUserStatusPayload {
  uuid: string;
  status: RecordStatus;
}

export const fetchUsers = async (
  params: UserListParams,
): Promise<PaginatedResponse<UserListItem>> => {
  const response = await httpClient.get<unknown>('/users', { params });

  return parsePaginatedResponse(userListItemSchema, response.data);
};

export const fetchUser = async (uuid: string): Promise<UserDetail> => {
  const response = await httpClient.get<unknown>(`/users/${uuid}`);

  return parseApiData(userDetailSchema, response.data);
};

export const createUser = async (
  payload: CreateUserForm,
): Promise<ApiResponse<UserDetail>> => {
  const response = await httpClient.post<unknown>('/users', payload);

  return parseApiResponse(userDetailSchema, response.data);
};

export const updateUser = async ({
  uuid,
  ...payload
}: UpdateUserPayload): Promise<ApiResponse<UserDetail>> => {
  const response = await httpClient.patch<unknown>(`/users/${uuid}`, payload);

  return parseApiResponse(userDetailSchema, response.data);
};

export const updateOwnProfile = async (
  payload: UpdateOwnProfileForm,
): Promise<UserDetail> => {
  const response = await httpClient.patch<unknown>('/users/me', payload);
  httpClient.clearCsrfToken();

  return parseApiData(userDetailSchema, response.data);
};

export const changeOwnPassword = async (
  payload: ChangeOwnPasswordForm,
): Promise<ApiResponse<null>> => {
  const response = await httpClient.patch<unknown>(
    '/users/me/password',
    payload,
  );
  httpClient.clearCsrfToken();

  return parseApiResponse(z.null(), response.data);
};

export const updateUserStatus = async ({
  uuid,
  status,
}: UpdateUserStatusPayload): Promise<ApiResponse<UserDetail>> => {
  const response = await httpClient.put<unknown>(`/users/${uuid}/status`, {
    status,
  });

  return parseApiResponse(userDetailSchema, response.data);
};

export const deleteUser = async (uuid: string): Promise<ApiResponse<null>> => {
  const response = await httpClient.delete<unknown>(`/users/${uuid}`);

  return parseApiResponse(z.null(), response.data);
};
