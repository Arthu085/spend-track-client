import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiResponse } from '@/core/http/api-envelope';
import { clearSession, sessionQuery } from '@/modules/auth/infra/auth.queries';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  changeOwnPassword,
  createUser,
  deleteUser,
  fetchUser,
  fetchUsers,
  updateOwnProfile,
  updateUser,
  updateUserStatus,
  type UserListParams,
} from './users.api';

const usersKey = ['users'] as const;

export const userQuery = (uuid: string) =>
  queryOptions({
    queryKey: [...usersKey, 'detail', uuid],
    queryFn: () => fetchUser(uuid),
    staleTime: 0,
  });

export const useUsers = (params: UserListParams) =>
  useQuery({
    queryKey: [...usersKey, 'list', params],
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
  });

const useUserMutation = <TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
) => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn,
    onSuccess: async (response) => {
      showSuccessMessage(response);
      await queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
};

export const useCreateUser = () => useUserMutation(createUser);

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: async (response, { uuid }) => {
      showSuccessMessage(response);

      if (queryClient.getQueryData(sessionQuery.queryKey)?.uuid === uuid) {
        clearSession(queryClient);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
};

export const useUpdateUserStatus = () => useUserMutation(updateUserStatus);

export const useDeleteUser = () => useUserMutation(deleteUser);

export const useUpdateOwnProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: () => {
      clearSession(queryClient);
    },
  });
};

export const useChangeOwnPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeOwnPassword,
    onSuccess: () => {
      clearSession(queryClient);
    },
  });
};
