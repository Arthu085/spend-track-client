import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  type CategoryListParams,
  createCategory,
  fetchCategories,
  updateCategory,
  updateCategoryStatus,
} from './categories.api';

const categoriesKey = ['categories'] as const;

export const useCategories = (params: CategoryListParams = {}) =>
  useQuery({
    queryKey: [...categoriesKey, 'list', params],
    queryFn: () => fetchCategories(params),
    placeholderData: keepPreviousData,
  });

const useCategoryMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await queryClient.invalidateQueries({ queryKey: categoriesKey });
    },
  });
};

export const useCreateCategory = () => useCategoryMutation(createCategory);

export const useUpdateCategory = () => useCategoryMutation(updateCategory);

export const useUpdateCategoryStatus = () =>
  useCategoryMutation(updateCategoryStatus);
