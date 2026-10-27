import {
  hashKey,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { httpClient } from '@/core/http/http-client';
import {
  confirmEmail,
  fetchSessionUser,
  login,
  logout,
  requestPasswordReset,
  resendEmailConfirmation,
  resetPassword,
} from './auth.api';
import { broadcastSessionEvent, onSessionEvent } from './session-channel';

export const authRevalidationOptions = {
  staleTime: 60_000,
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

const sessionKey = ['auth', 'session'] as const;

export const sessionQuery = queryOptions({
  ...authRevalidationOptions,
  queryKey: sessionKey,
  queryFn: async ({ client, signal }) => {
    const user = await fetchSessionUser();

    if (!signal.aborted && user === null && client.getQueryData(sessionKey)) {
      clearSession(client);
    }

    return user;
  },
  refetchOnWindowFocus: (query) => Boolean(query.state.data),
  refetchOnReconnect: (query) => Boolean(query.state.data),
  throwOnError: (_error, query) => query.state.data === undefined,
});

const sessionQueryHash = hashKey(sessionQuery.queryKey);

const removeNonSessionQueries = (queryClient: QueryClient) => {
  queryClient.removeQueries({
    predicate: (query) => query.queryHash !== sessionQueryHash,
  });
};

const clearLocalSession = (queryClient: QueryClient) => {
  queryClient.cancelQueries({ queryKey: sessionKey }).catch(() => undefined);
  httpClient.clearCsrfToken();
  queryClient.setQueryData(sessionQuery.queryKey, null);
  removeNonSessionQueries(queryClient);
};

export const clearSession = (queryClient: QueryClient) => {
  clearLocalSession(queryClient);
  broadcastSessionEvent('signed-out');
};

export const syncSessionAcrossTabs = (queryClient: QueryClient) =>
  onSessionEvent((event) => {
    httpClient.clearCsrfToken();

    if (event === 'signed-out') {
      clearLocalSession(queryClient);
      return;
    }

    removeNonSessionQueries(queryClient);
    queryClient
      .cancelQueries({ queryKey: sessionKey })
      .then(() => queryClient.invalidateQueries({ queryKey: sessionKey }))
      .catch(() => undefined);
  });

export const useSession = () => useQuery(sessionQuery);

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async (user) => {
      await queryClient.cancelQueries({ queryKey: sessionKey });
      queryClient.setQueryData(sessionQuery.queryKey, user);
      broadcastSessionEvent('signed-in');
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearSession(queryClient);
    },
  });
};

export const useForgotPassword = () =>
  useMutation({ mutationFn: requestPasswordReset });

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      clearSession(queryClient);
    },
  });
};

export const useConfirmEmail = () => useMutation({ mutationFn: confirmEmail });

export const useResendConfirmation = () =>
  useMutation({ mutationFn: resendEmailConfirmation });
