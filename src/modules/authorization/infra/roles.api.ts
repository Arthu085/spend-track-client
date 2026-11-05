import { z } from 'zod';
import {
  type ApiResponse,
  parseApiData,
  parseApiResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { ListSortParams } from '@/shared/list/use-list-sorting';
import type { Ability } from '../domain/ability.schema';
import {
  type Role,
  type RoleDetail,
  roleDetailSchema,
  roleSchema,
  roleSortBySchema,
} from '../domain/role.schema';

export interface UpdateRoleAbilitiesPayload {
  uuid: string;
  abilities: Ability[];
}

export type RoleListParams = ListSortParams<z.infer<typeof roleSortBySchema>>;

export const fetchRoles = async (params?: RoleListParams): Promise<Role[]> => {
  const response = await httpClient.get<unknown>('/roles', { params });

  return parseApiData(z.array(roleSchema), response.data);
};

export const fetchRole = async (uuid: string): Promise<RoleDetail> => {
  const response = await httpClient.get<unknown>(`/roles/${uuid}`);

  return parseApiData(roleDetailSchema, response.data);
};

export const updateRoleAbilities = async ({
  uuid,
  abilities,
}: UpdateRoleAbilitiesPayload): Promise<ApiResponse<RoleDetail>> => {
  const response = await httpClient.patch<unknown>(`/roles/${uuid}/abilities`, {
    abilities: abilities.map(({ action, subject }) => ({ action, subject })),
  });

  return parseApiResponse(roleDetailSchema, response.data);
};
