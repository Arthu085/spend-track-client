import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/core/config/query-client.config';
import { httpClient } from '@/core/http/http-client';
import {
  abilitiesQuery,
  useAbilities,
} from '@/modules/authorization/infra/abilities.queries';
import type { Ability } from '@/modules/authorization/domain/ability.schema';
import { AbilityGuard } from '@/modules/authorization/presentation/guards/ability.guard';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  csrfResponse,
  requestKey,
  respond,
  stubHttpRoutes,
} from '@/test/http-stub';
import {
  authRevalidationOptions,
  clearSession,
  sessionQuery,
  useLogin,
  useSession,
} from '../auth.queries';
import { AuthGuard } from '../../presentation/guards/auth.guard';

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

const initialAbilities: Ability[] = [{ action: 'READ', subject: 'USER' }];
const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });
const protectedKey = ['users', 'list'];

const wrapperFor =
  (queryClient: ReturnType<typeof createQueryClient>) =>
  ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

const renderProtectedPage = (client: ReturnType<typeof createQueryClient>) => {
  const router = createMemoryRouter([
    {
      element: <AuthGuard />,
      errorElement: <h1>Request failed</h1>,
      children: [
        {
          element: (
            <AbilityGuard ability={{ action: 'READ', subject: 'USER' }} />
          ),
          children: [{ path: '/', element: <h1>Protected content</h1> }],
        },
      ],
    },
  ]);

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

let now: number;

beforeEach(() => {
  now = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  focusManager.setFocused(false);
  httpClient.clearCsrfToken();
});

afterEach(() => {
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
});

const activateApp = async () => {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await Promise.resolve();
  });
};

describe('authentication revalidation', () => {
  it('preserves the signed-in page during transient background session and abilities failures', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': { status: 500 },
      'GET /users/me/abilities': { status: 500 },
    });
    const client = createQueryClient({ onUnauthorized: clearSession });
    client.setQueryDefaults(sessionQuery.queryKey, { retry: false });
    client.setQueryDefaults(abilitiesQuery.queryKey, { retry: false });
    client.setQueryData(sessionQuery.queryKey, user);
    client.setQueryData(abilitiesQuery.queryKey, initialAbilities);
    renderProtectedPage(client);
    expect(
      screen.getByRole('heading', { name: 'Protected content' }),
    ).toBeInTheDocument();

    now += authRevalidationOptions.staleTime + 1;
    await activateApp();

    await waitFor(() => {
      expect(client.getQueryState(sessionQuery.queryKey)?.status).toBe('error');
      expect(client.getQueryState(abilitiesQuery.queryKey)?.status).toBe(
        'error',
      );
    });
    expect(
      screen.getByRole('heading', { name: 'Protected content' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Request failed' }),
    ).not.toBeInTheDocument();
    expect(client.getQueryData(sessionQuery.queryKey)).toEqual(user);
    expect(client.getQueryData(abilitiesQuery.queryKey)).toEqual(
      initialAbilities,
    );
  });

  it.each(['session', 'abilities'])(
    'shows the route error when the initial %s request fails',
    async (query) => {
      stubHttpRoutes(httpClient, {
        'GET /users/me': { status: 500 },
        'GET /users/me/abilities': { status: 500 },
      });
      const client = createQueryClient();
      client.setQueryDefaults(sessionQuery.queryKey, { retry: false });
      client.setQueryDefaults(abilitiesQuery.queryKey, { retry: false });
      if (query === 'abilities') {
        client.setQueryData(sessionQuery.queryKey, user);
      }
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      renderProtectedPage(client);

      expect(
        await screen.findByRole('heading', { name: 'Request failed' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Protected content' }),
      ).not.toBeInTheDocument();
    },
  );

  it('revalidates changed session data and permissions only after the freshness window', async () => {
    let currentUser = user;
    let currentAbilities = initialAbilities;
    const requests = stubHttpRoutes(httpClient, {
      'GET /users/me': () => envelope(currentUser),
      'GET /users/me/abilities': () => envelope(currentAbilities),
    });
    const client = createQueryClient({ onUnauthorized: clearSession });
    const wrapper = wrapperFor(client);
    const { result, rerender, unmount } = renderHook(
      () => ({ session: useSession(), abilities: useAbilities() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.session.data).toEqual(user);
      expect(result.current.abilities.data).toEqual(initialAbilities);
    });

    await activateApp();
    rerender();
    expect(requests.map(requestKey)).toEqual([
      'GET /users/me',
      'GET /users/me/abilities',
    ]);

    now += authRevalidationOptions.staleTime + 1;
    unmount();
    const remounted = renderHook(
      () => ({ session: useSession(), abilities: useAbilities() }),
      { wrapper },
    );
    expect(requests).toHaveLength(2);

    currentUser = { ...user, name: 'Updated externally' };
    currentAbilities = [];
    await activateApp();

    await waitFor(() => {
      expect(remounted.result.current.session.data?.name).toBe(
        'Updated externally',
      );
      expect(remounted.result.current.abilities.data).toEqual([]);
    });
    expect(requests.map(requestKey)).toEqual([
      'GET /users/me',
      'GET /users/me/abilities',
      'GET /users/me',
      'GET /users/me/abilities',
    ]);
    await activateApp();
    expect(requests).toHaveLength(4);
  });

  it('does not restore a locally cleared session on focus or reconnect', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(user),
    });
    const client = createQueryClient();
    client.setQueryData(sessionQuery.queryKey, user);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });

    act(() => clearSession(client));
    await waitFor(() => expect(result.current.data).toBeNull());
    now += authRevalidationOptions.staleTime + 1;
    await activateApp();
    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
      await Promise.resolve();
    });

    expect(result.current.data).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it('clears a revoked session and protected cache after a failed refresh', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /users/me': { status: 401 },
      'GET /auth/csrf': csrfResponse('csrf-token'),
      'POST /auth/refresh': { status: 401 },
    });
    const client = createQueryClient({ onUnauthorized: clearSession });
    client.setQueryData(sessionQuery.queryKey, user);
    client.setQueryData(abilitiesQuery.queryKey, initialAbilities);
    client.setQueryData(protectedKey, ['private data']);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });
    now += authRevalidationOptions.staleTime + 1;

    await activateApp();

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
    expect(client.getQueryData(abilitiesQuery.queryKey)).toBeUndefined();
    expect(client.getQueryData(protectedKey)).toBeUndefined();
    expect(requests.map(requestKey)).toEqual([
      'GET /users/me',
      'GET /auth/csrf',
      'POST /auth/refresh',
    ]);
  });

  it('keeps the session when revalidation refreshes an expired access token', async () => {
    let refreshed = false;
    const requests = stubHttpRoutes(httpClient, {
      'GET /users/me': () => (refreshed ? envelope(user) : { status: 401 }),
      'GET /auth/csrf': csrfResponse('csrf-token'),
      'POST /auth/refresh': () => {
        refreshed = true;
        return envelope(null);
      },
    });
    const client = createQueryClient({ onUnauthorized: clearSession });
    client.setQueryData(sessionQuery.queryKey, user);
    client.setQueryData(protectedKey, ['private data']);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });
    now += authRevalidationOptions.staleTime + 1;

    await activateApp();

    await waitFor(() => {
      expect(
        requests.filter((request) => requestKey(request) === 'GET /users/me'),
      ).toHaveLength(2);
      expect(result.current.isFetching).toBe(false);
    });
    expect(result.current.data).toEqual(user);
    expect(client.getQueryData(protectedKey)).toEqual(['private data']);
    expect(
      requests.filter(
        (request) => requestKey(request) === 'POST /auth/refresh',
      ),
    ).toHaveLength(1);
  });

  it.each([200, 403])(
    'preserves a new login when an older session request finishes with %s',
    async (status) => {
      let finishSession: (() => void) | undefined;
      const signedInUser = { ...user, name: 'New login' };
      httpClient.defaults.adapter = (config) => {
        if (requestKey(config) === 'GET /users/me') {
          return new Promise((resolve, reject) => {
            finishSession = () => {
              respond(config, { ...envelope(user), status })
                .then(resolve)
                .catch(reject);
            };
          });
        }

        return respond(
          config,
          requestKey(config) === 'GET /auth/csrf'
            ? csrfResponse('csrf-token')
            : envelope(signedInUser),
        );
      };
      const client = createQueryClient();
      client.setQueryData(sessionQuery.queryKey, user);
      const pending = client
        .fetchQuery({ ...sessionQuery, staleTime: 0 })
        .catch(() => undefined);
      const { result } = renderHook(() => useLogin(), {
        wrapper: wrapperFor(client),
      });
      await waitFor(() => expect(finishSession).toBeDefined());

      await act(() =>
        result.current.mutateAsync({ email: user.email, password: 'secret' }),
      );
      await act(async () => {
        finishSession?.();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      await pending;

      expect(client.getQueryData(sessionQuery.queryKey)).toEqual(signedInUser);
      expect(client.isFetching()).toBe(0);
    },
  );

  it('does not restore a session when revalidation finishes after sign-out', async () => {
    let finishSession: (() => void) | undefined;
    httpClient.defaults.adapter = (config) =>
      new Promise((resolve, reject) => {
        finishSession = () => {
          respond(config, envelope(user)).then(resolve).catch(reject);
        };
      });
    const client = createQueryClient();
    client.setQueryData(sessionQuery.queryKey, user);
    const pending = client
      .fetchQuery({ ...sessionQuery, staleTime: 0 })
      .catch(() => undefined);
    await waitFor(() => expect(finishSession).toBeDefined());

    clearSession(client);
    await act(async () => {
      finishSession?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await pending;

    expect(client.getQueryData(sessionQuery.queryKey)).toBeNull();
    expect(client.isFetching()).toBe(0);
  });
});
