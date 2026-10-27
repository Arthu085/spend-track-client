import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { getHttpStatus } from '@/core/http/api-error';

const MAX_QUERY_RETRIES = 2;
const STALE_TIME_MS = 30_000;

interface QueryClientOptions {
  onUnauthorized?: (client: QueryClient) => void;
}

const isClientError = (status: number | undefined): boolean =>
  status !== undefined && status >= 400 && status < 500;

export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean =>
  !isClientError(getHttpStatus(error)) && failureCount < MAX_QUERY_RETRIES;

export const createQueryClient = ({
  onUnauthorized,
}: QueryClientOptions = {}): QueryClient => {
  const handleError = (error: unknown) => {
    if (getHttpStatus(error) === 401) {
      onUnauthorized?.(client);
    }
  };

  const client = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return client;
};
