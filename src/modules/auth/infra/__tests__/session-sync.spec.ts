import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/core/config/query-client.config';
import { httpClient } from '@/core/http/http-client';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  csrfResponse,
  requestKey,
  respond,
  stubHttpRoutes,
} from '@/test/http-stub';
import { login } from '../auth.api';
import {
  clearSession,
  sessionQuery,
  syncSessionAcrossTabs,
  useLogin,
  useSession,
} from '../auth.queries';
import { SESSION_CHANNEL_NAME } from '../session-channel';

const user: UserDetail = {
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Active',
  roles: [],
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const otherQueryKey = ['users', 'list'];

// A second channel object stands in for another tab; a channel never receives its own messages.
let otherTab: BroadcastChannel;

const nextMessageFromApp = () =>
  new Promise<unknown>((resolve) => {
    otherTab.addEventListener('message', ({ data }) => resolve(data), {
      once: true,
    });
  });

const wrapperFor =
  (queryClient: ReturnType<typeof createQueryClient>) =>
  ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

beforeEach(() => {
  httpClient.clearCsrfToken();
  otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);
});

afterEach(() => {
  otherTab.close();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('session sync across tabs', () => {
  it('tells the other tabs when the session ends', async () => {
    const message = nextMessageFromApp();

    clearSession(createQueryClient());

    expect(await message).toBe('signed-out');
  });

  it('tells the other tabs after signing in', async () => {
    stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/login': envelope(user),
    });
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapperFor(createQueryClient()),
    });
    const message = nextMessageFromApp();

    await act(() =>
      result.current.mutateAsync({ email: user.email, password: 'secret' }),
    );

    expect(await message).toBe('signed-in');
  });

  it('ends the local session and drops the CSRF token when another tab signs out', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /anything': { status: 200 },
    });
    const queryClient = createQueryClient();
    queryClient.setQueryData(sessionQuery.queryKey, user);
    queryClient.setQueryData(otherQueryKey, []);
    const stopSync = syncSessionAcrossTabs(queryClient);
    await httpClient.post('/anything');

    otherTab.postMessage('signed-out');

    await waitFor(() => {
      expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    });
    expect(queryClient.getQueryData(otherQueryKey)).toBeUndefined();
    await httpClient.post('/anything');
    expect(requests.map(requestKey)).toEqual([
      'GET /auth/csrf',
      'POST /anything',
      'GET /auth/csrf',
      'POST /anything',
    ]);
    stopSync();
  });

  it('loads the new session when another tab signs in', async () => {
    let signedIn = false;
    stubHttpRoutes(httpClient, {
      'GET /users/me': () => (signedIn ? envelope(user) : { status: 401 }),
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 401 },
    });
    const queryClient = createQueryClient();
    queryClient.setQueryData(otherQueryKey, []);
    const stopSync = syncSessionAcrossTabs(queryClient);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });

    signedIn = true;
    otherTab.postMessage('signed-in');

    await waitFor(() => {
      expect(result.current.data).toEqual(user);
    });
    expect(queryClient.getQueryData(otherQueryKey)).toBeUndefined();
    stopSync();
  });

  it('replaces an initial pending session request when another tab signs in', async () => {
    let finishInitialRequest: (() => void) | undefined;
    let sessionRequests = 0;
    httpClient.defaults.adapter = (config) => {
      sessionRequests += 1;

      if (sessionRequests === 1) {
        return new Promise((resolve, reject) => {
          finishInitialRequest = () => {
            respond(config, { status: 403 }).then(resolve).catch(reject);
          };
        });
      }

      return respond(config, envelope(user));
    };
    const queryClient = createQueryClient();
    const stopSync = syncSessionAcrossTabs(queryClient);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(queryClient),
    });

    try {
      await waitFor(() => expect(finishInitialRequest).toBeDefined());
      otherTab.postMessage('signed-in');

      await waitFor(() => expect(result.current.data).toEqual(user));
      await act(async () => {
        finishInitialRequest?.();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.data).toEqual(user);
      expect(sessionRequests).toBe(2);
    } finally {
      stopSync();
    }
  });

  it('ignores unknown messages', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(sessionQuery.queryKey, user);
    const stopSync = syncSessionAcrossTabs(queryClient);

    otherTab.postMessage({ type: 'signed-out' });
    otherTab.postMessage('signed-out-everywhere');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(user);
    stopSync();
  });
});

describe('login', () => {
  it('waits for the session Web Lock that refreshes hold', async () => {
    const request = vi.fn(
      (_name: string, task: () => Promise<unknown>): Promise<unknown> => task(),
    );
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });
    stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/login': envelope(user),
    });

    await expect(
      login({ email: user.email, password: 'secret' }),
    ).resolves.toEqual(user);
    expect(request).toHaveBeenCalledWith('auth-session', expect.any(Function));
  });
});
