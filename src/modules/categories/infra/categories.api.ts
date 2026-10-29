import {
  type ApiResponse,
  type PaginatedResponse,
  parseApiResponse,
  parsePaginatedResponse,
} from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import type { CategoryForm } from '../domain/category-form.schemas';
import {
  type Category,
  type CategoryKind,
  categorySchema,
} from '../domain/category.schema';

export interface CategoryListParams {
  page?: number;
  limit?: number;
  kind?: CategoryKind;
  status?: RecordStatus;
}

export interface UpdateCategoryPayload {
  uuid: string;
  name?: string;
  color?: string;
}

export interface UpdateCategoryStatusPayload {
  uuid: string;
  status: RecordStatus;
}

export const fetchCategories = async (
  params: CategoryListParams = {},
): Promise<PaginatedResponse<Category>> => {
  const response = await httpClient.get<unknown>('/categories', { params });

  return parsePaginatedResponse(categorySchema, response.data);
};

export const createCategory = async (
  payload: CategoryForm,
): Promise<ApiResponse<Category>> => {
  const response = await httpClient.post<unknown>('/categories', payload);

  return parseApiResponse(categorySchema, response.data);
};

export const updateCategory = async ({
  uuid,
  ...payload
}: UpdateCategoryPayload): Promise<ApiResponse<Category>> => {
  const response = await httpClient.patch<unknown>(
    `/categories/${uuid}`,
    payload,
  );

  return parseApiResponse(categorySchema, response.data);
};

export const updateCategoryStatus = async ({
  uuid,
  status,
}: UpdateCategoryStatusPayload): Promise<ApiResponse<Category>> => {
  const response = await httpClient.put<unknown>(`/categories/${uuid}/status`, {
    status,
  });

  return parseApiResponse(categorySchema, response.data);
};
