import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import { abilitiesQuery } from './abilities.queries';
import { fetchRole, fetchRoles, updateRoleAbilities } from './roles.api';

const rolesKey = ['authorization', 'roles'] as const;

export const rolesQuery = queryOptions({
  queryKey: rolesKey,
  queryFn: fetchRoles,
});

export const roleQuery = (uuid: string) =>
  queryOptions({
    queryKey: [...rolesKey, 'detail', uuid],
    queryFn: () => fetchRole(uuid),
    staleTime: 0,
  });

export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ ...rolesQuery, enabled });

export const useRole = (uuid: string) => useQuery(roleQuery(uuid));

export const useUpdateRoleAbilities = () => {
  const queryClient = useQueryClient();
  const showSuccessMessage = useApiSuccessMessage();
  const { data: sessionUser } = useSession();

  return useMutation({
    mutationFn: updateRoleAbilities,
    onSuccess: async (response, { uuid }) => {
      showSuccessMessage(response);
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: rolesKey }),
      ];

      if (sessionUser?.roles.some((role) => role.uuid === uuid)) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: abilitiesQuery.queryKey }),
        );
      }

      await Promise.all(invalidations);
    },
  });
};
