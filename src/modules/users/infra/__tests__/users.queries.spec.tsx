import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/core/config/query-client.config';
import { httpClient } from '@/core/http/http-client';
import { sessionQuery } from '@/modules/auth/infra/auth.queries';
import { SESSION_CHANNEL_NAME } from '@/modules/auth/infra/session-channel';
import { csrfResponse, requestKey, stubHttpRoutes } from '@/test/http-stub';
import type { UserDetail } from '../../domain/user.schema';
import { useUpdateUser, useUsers } from '../users.queries';

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

const otherUser = {
  ...user,
  uuid: '9b2d3c4e-1f0a-4b5c-8d7e-6f5a4b3c2d1e',
  name: 'Grace Hopper',
};
const params = { page: 1, limit: 20 };
const listKey = ['users', 'list', params];
const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const setup = () => {
  const client = createQueryClient();
  client.setQueryData(sessionQuery.queryKey, user);
  client.setQueryData(listKey, {
    data: [otherUser],
    meta: { total: 1, page: 1, limit: 20 },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <AntdApp>{children}</AntdApp>
    </QueryClientProvider>
  );

  return { client, wrapper };
};

beforeEach(() => httpClient.clearCsrfToken());
afterEach(() => vi.restoreAllMocks());

describe('useUpdateUser', () => {
  it('immediately clears its own session, CSRF token, and cache and notifies other tabs', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('csrf-token'),
      [`PATCH /users/${user.uuid}`]: envelope({
        ...user,
        name: 'Updated name',
      }),
    });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    const clearCsrfToken = vi.spyOn(httpClient, 'clearCsrfToken');
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);
    const sessionEvent = new Promise<unknown>((resolve) => {
      otherTab.addEventListener('message', ({ data }) => resolve(data), {
        once: true,
      });
    });

    try {
      await act(() =>
        result.current.mutateAsync({
          uuid: user.uuid,
          name: 'Updated name',
          email: user.email,
          roleUuids: [],
        }),
      );

      expect(client.getQueryData(sessionQuery.queryKey)).toBeNull();
      expect(client.getQueryData(listKey)).toBeUndefined();
      expect(clearCsrfToken).toHaveBeenCalledOnce();
      expect(await sessionEvent).toBe('signed-out');
      expect(requests.map(requestKey)).toEqual([
        'GET /auth/csrf',
        `PATCH /users/${user.uuid}`,
      ]);
    } finally {
      otherTab.close();
    }
  });

  it('keeps the session and refreshes users when updating someone else', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('csrf-token'),
      [`PATCH /users/${otherUser.uuid}`]: envelope(otherUser),
      'GET /users': {
        status: 200,
        data: { data: [otherUser], meta: { total: 1, page: 1, limit: 20 } },
      },
    });
    const { client, wrapper } = setup();
    const { result } = renderHook(
      () => ({ mutation: useUpdateUser(), users: useUsers(params) }),
      { wrapper },
    );
    const clearCsrfToken = vi.spyOn(httpClient, 'clearCsrfToken');

    await act(() =>
      result.current.mutation.mutateAsync({
        uuid: otherUser.uuid,
        name: 'Updated name',
        email: otherUser.email,
        roleUuids: [],
      }),
    );

    await waitFor(() => expect(result.current.users.isFetching).toBe(false));
    expect(client.getQueryData(sessionQuery.queryKey)).toEqual(user);
    expect(clearCsrfToken).not.toHaveBeenCalled();
    expect(requests.map(requestKey)).toEqual([
      'GET /auth/csrf',
      `PATCH /users/${otherUser.uuid}`,
      'GET /users',
    ]);
  });

  it('keeps the session and cache when its own update fails', async () => {
    stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('csrf-token'),
      [`PATCH /users/${user.uuid}`]: {
        status: 409,
        data: { message: 'Email is already in use' },
      },
    });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          uuid: user.uuid,
          name: 'Updated name',
          email: user.email,
          roleUuids: [],
        }),
      ).rejects.toThrow();
    });

    expect(client.getQueryData(sessionQuery.queryKey)).toEqual(user);
    expect(client.getQueryData(listKey)).toBeDefined();
  });
});
