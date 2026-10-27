import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  isAxiosError,
} from 'axios';
import { z } from 'zod';

declare module 'axios' {
  interface AxiosRequestConfig {
    csrfRetried?: boolean;
    sessionRefreshed?: boolean;
  }
}

const CSRF_HEADER = 'x-csrf-token';
const CSRF_PATH = '/auth/csrf';
const REFRESH_PATH = '/auth/refresh';
const SESSION_REFRESH_EXEMPT_PATHS = new Set(['/auth/login', REFRESH_PATH]);
const SESSION_LOCK_NAME = 'auth-session';
const SIGNED_OUT_STATUSES = new Set([401, 403]);
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const REQUEST_TIMEOUT_MS = 10_000;

const csrfResponseSchema = z.object({
  data: z.object({
    csrfToken: z.string().min(1),
  }),
});

interface HttpClientOptions {
  baseURL: string;
  getLanguage: () => string;
}

export type HttpClient = AxiosInstance & {
  clearCsrfToken: () => void;
  withSessionLock: <T>(task: () => Promise<T>) => Promise<T>;
};

const isSafeMethod = (method = 'get'): boolean =>
  SAFE_METHODS.has(method.toLowerCase());

const readCsrfHeader = (
  headers: AxiosResponse['headers'],
): string | undefined => {
  const value: unknown =
    headers instanceof AxiosHeaders
      ? headers.get(CSRF_HEADER)
      : headers[CSRF_HEADER];

  return typeof value === 'string' && value ? value : undefined;
};

const isSignedOutResponse = (error: unknown): boolean =>
  isAxiosError(error) && SIGNED_OUT_STATUSES.has(error.response?.status ?? 0);

const withSessionLock = <T>(task: () => Promise<T>): Promise<T> =>
  'locks' in navigator
    ? navigator.locks.request(SESSION_LOCK_NAME, task)
    : task();

export const createHttpClient = ({
  baseURL,
  getLanguage,
}: HttpClientOptions): HttpClient => {
  const client = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    withCredentials: true,
  });

  let csrfToken: string | undefined;
  let pendingCsrfToken: Promise<string> | undefined;
  let pendingRefresh: Promise<boolean> | undefined;

  const storeCsrfToken = (headers: AxiosResponse['headers']) => {
    csrfToken = readCsrfHeader(headers) ?? csrfToken;
  };

  const fetchCsrfToken = async (): Promise<string> => {
    const response = await client.get<unknown>(CSRF_PATH);

    return csrfResponseSchema.parse(response.data).data.csrfToken;
  };

  const ensureCsrfToken = (): Promise<string> => {
    if (csrfToken) {
      return Promise.resolve(csrfToken);
    }

    pendingCsrfToken ??= fetchCsrfToken()
      .then((token) => {
        csrfToken = token;
        return token;
      })
      .finally(() => {
        pendingCsrfToken = undefined;
      });

    return pendingCsrfToken;
  };

  // The API also answers 403 for business rules and keeps a token still bound to the session, so
  // an unchanged token after a new bootstrap means the 403 was not a CSRF rejection.
  const isCsrfTokenRenewed = async (
    rejectedToken: unknown,
  ): Promise<boolean> => {
    csrfToken = undefined;

    return (await ensureCsrfToken()) !== rejectedToken;
  };

  // The API revokes every session when one refresh token is used twice, so refreshes are
  // serialized within the tab (shared promise) and across tabs (Web Lock, which login also takes).
  // No timeout: abandoning a refresh the API already rotated would keep the revoked cookie for the
  // next attempt.
  const refreshSession = (): Promise<boolean> => {
    pendingRefresh ??= withSessionLock(() =>
      client.post(REFRESH_PATH, undefined, { timeout: 0 }),
    )
      .then(
        () => true,
        (error: unknown) => {
          if (isSignedOutResponse(error)) {
            return false;
          }

          throw error;
        },
      )
      .finally(() => {
        pendingRefresh = undefined;
      });

    return pendingRefresh;
  };

  client.interceptors.request.use(async (config) => {
    config.headers.set('Accept-Language', getLanguage());

    if (!isSafeMethod(config.method)) {
      config.headers.set(CSRF_HEADER, await ensureCsrfToken());
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => {
      storeCsrfToken(response.headers);
      return response;
    },
    async (error: unknown) => {
      if (!isAxiosError(error) || !error.response || !error.config) {
        throw error;
      }

      storeCsrfToken(error.response.headers);

      const { config, response } = error;
      const canRefreshSession =
        response.status === 401 &&
        !SESSION_REFRESH_EXEMPT_PATHS.has(config.url ?? '') &&
        !config.sessionRefreshed;

      if (canRefreshSession) {
        if (!(await refreshSession())) {
          throw error;
        }

        return client.request({ ...config, sessionRefreshed: true });
      }

      const canRetryWithFreshToken =
        response.status === 403 &&
        !isSafeMethod(config.method) &&
        !config.csrfRetried;

      if (
        !canRetryWithFreshToken ||
        !(await isCsrfTokenRenewed(config.headers.get(CSRF_HEADER)))
      ) {
        throw error;
      }

      return client.request({ ...config, csrfRetried: true });
    },
  );

  return Object.assign(client, {
    clearCsrfToken: () => {
      csrfToken = undefined;
    },
    withSessionLock,
  });
};
