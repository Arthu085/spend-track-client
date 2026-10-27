import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { clearSession, useSession } from '@/modules/auth/infra/auth.queries';
import { hasAdminRole } from '@/modules/authorization/domain/role.schema';
import { useApiSuccessMessage } from '@/shared/feedback/use-api-success-message';
import {
  approveChangeRequest,
  createChangeRequest,
  fetchOwnChangeRequests,
  rejectChangeRequest,
} from './user-change-requests.api';

export const ownChangeRequestsQuery = queryOptions({
  queryKey: ['users', 'me', 'change-requests'],
  queryFn: fetchOwnChangeRequests,
});

export const useOwnChangeRequests = () => {
  const { data: user } = useSession();

  return useQuery({
    ...ownChangeRequestsQuery,
    enabled: user ? hasAdminRole(user.roles) : false,
  });
};

export const useCreateChangeRequest = () =>
  useMutation({ mutationFn: createChangeRequest });

const useRefreshOwnChangeRequests = () => {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: ownChangeRequestsQuery.queryKey,
    });
};

export const useApproveChangeRequest = () => {
  const queryClient = useQueryClient();
  const refreshChangeRequests = useRefreshOwnChangeRequests();

  return useMutation({
    mutationFn: approveChangeRequest,
    onSuccess: () => {
      clearSession(queryClient);
    },
    onError: refreshChangeRequests,
  });
};

export const useRejectChangeRequest = () => {
  const showSuccessMessage = useApiSuccessMessage();
  const refreshChangeRequests = useRefreshOwnChangeRequests();

  return useMutation({
    mutationFn: rejectChangeRequest,
    onSuccess: showSuccessMessage,
    onSettled: refreshChangeRequests,
  });
};
