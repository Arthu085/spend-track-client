import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { z } from 'zod';
import { parseApiData } from '@/core/http/api-envelope';
import { getApiErrorMessage, getHttpStatus } from '@/core/http/api-error';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { fetchSessionUser, login, logout } from '@/modules/auth/infra/auth.api';
import {
  fetchAbilityCatalog,
  fetchOwnAbilities,
} from '@/modules/authorization/infra/abilities.api';
import {
  fetchRole,
  fetchRoles,
  updateRoleAbilities,
} from '@/modules/authorization/infra/roles.api';
import { userDetailSchema } from '@/modules/users/domain/user.schema';
import {
  createUser,
  deleteUser,
  fetchUser,
  fetchUsers,
  updateOwnProfile,
  updateUser,
  updateUserStatus,
} from '@/modules/users/infra/users.api';
import '../../../test/integration/context';

const apiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.iso.datetime(),
  path: z.string(),
});

const expectApiError = async (request: Promise<unknown>, status: number) => {
  try {
    await request;
  } catch (error) {
    expect(getHttpStatus(error)).toBe(status);
    expect(isAxiosError(error)).toBe(true);

    if (!isAxiosError(error)) {
      throw error;
    }

    const body = apiErrorSchema.parse(error.response?.data);

    expect(body.statusCode).toBe(status);
    expect(getApiErrorMessage(error)).toBe(body.message);

    return;
  }

  throw new Error(`Expected the API to reject with ${status}.`);
};

describe('real backend API contracts', () => {
  const backend = inject('backend');
  const requests: string[] = [];
  let rawClient: AxiosInstance;

  beforeAll(async () => {
    await i18n.changeLanguage('en');
    httpClient.defaults.baseURL = backend.baseURL;
    httpClient.defaults.adapter = 'xhr';
    rawClient = axios.create({
      baseURL: backend.baseURL,
      withCredentials: true,
      adapter: 'xhr',
      headers: { 'Accept-Language': 'en' },
    });
    httpClient.interceptors.request.use((config) => {
      requests.push(`${config.method ?? 'get'} ${config.url ?? ''}`);

      return config;
    });
  });

  beforeEach(async () => {
    httpClient.clearCsrfToken();
    await login(backend.admin);
    requests.length = 0;
  });

  it('logs in through CSRF bootstrap and parses the session and invalid credentials', async () => {
    httpClient.clearCsrfToken();
    const user = await login(backend.admin);

    expect(user.email).toBe(backend.admin.email);
    expect(user.roles.some(({ role }) => role === 'ADMIN')).toBe(true);
    expect(await fetchSessionUser()).toEqual(user);
    expect(requests).toContain('get /auth/csrf');
    await expectApiError(
      login({ ...backend.admin, password: 'incorrect-password' }),
      401,
    );
  });

  it('refreshes an expired access cookie once and rotates refresh cookies sequentially', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2250));
    const users = await fetchUsers({ page: 1, limit: 10 });

    expect(users.meta.total).toBeGreaterThanOrEqual(2);
    expect(
      requests.filter((request) => request === 'post /auth/refresh'),
    ).toHaveLength(1);

    for (let rotation = 0; rotation < 2; rotation += 1) {
      const response = await httpClient.post<unknown>('/auth/refresh');
      const user = parseApiData(userDetailSchema, response.data);

      expect(user.email).toBe(backend.admin.email);
    }

    expect((await fetchSessionUser())?.email).toBe(backend.admin.email);
  });

  it.each([undefined, 'invalid-token'])(
    'rejects unsafe browser requests with CSRF token %s',
    async (token) => {
      await expectApiError(
        rawClient.post('/auth/logout', undefined, {
          headers: token ? { 'X-CSRF-Token': token } : {},
        }),
        403,
      );

      expect((await fetchSessionUser())?.email).toBe(backend.admin.email);
    },
  );

  it('recovers a stale in-memory CSRF token after another login rotates the cookies', async () => {
    const bootstrap = await rawClient.get<unknown>('/auth/csrf');
    const token = z
      .object({ data: z.object({ csrfToken: z.string() }) })
      .parse(bootstrap.data).data.csrfToken;

    const response = await rawClient.post<unknown>(
      '/auth/login',
      backend.admin,
      {
        headers: { 'X-CSRF-Token': token },
      },
    );
    const user = parseApiData(userDetailSchema, response.data);

    requests.length = 0;
    await updateOwnProfile({ name: user.name, email: user.email });

    expect(
      requests.filter((request) => request === 'patch /users/me'),
    ).toHaveLength(2);
    expect(
      requests.filter((request) => request === 'get /auth/csrf'),
    ).toHaveLength(1);
    expect(await fetchSessionUser()).toBeNull();
  });

  it('creates, filters, edits, deactivates, reactivates, and deletes a user', async () => {
    const userRole = (await fetchRoles()).find(({ role }) => role === 'USER');

    expect(userRole).toBeDefined();
    if (!userRole) {
      throw new Error('The backend did not seed the USER role.');
    }

    const payload = {
      name: 'Contract User',
      email: 'contract-user@example.com',
      password: 'Contract-user-password1!',
      roleUuids: [userRole.uuid],
    };
    const created = await createUser(payload);

    expect(created.data.email).toBe(payload.email);
    expect(created.meta.message).toBeTruthy();
    expect(await fetchUser(created.data.uuid)).toEqual(created.data);
    expect(
      (await fetchUsers({ page: 1, limit: 10, email: payload.email })).data.map(
        ({ uuid }) => uuid,
      ),
    ).toEqual([created.data.uuid]);
    await expectApiError(createUser(payload), 409);

    const updated = await updateUser({
      uuid: created.data.uuid,
      name: 'Edited Contract User',
      email: payload.email,
      roleUuids: payload.roleUuids,
    });

    expect(updated.data.name).toBe('Edited Contract User');
    expect((await fetchSessionUser())?.email).toBe(backend.admin.email);
    expect(
      (await updateUserStatus({ uuid: created.data.uuid, status: 'INACTIVE' }))
        .data.status,
    ).toBe('INACTIVE');
    await expectApiError(fetchUser(created.data.uuid), 409);
    await updateUserStatus({ uuid: created.data.uuid, status: 'ACTIVE' });
    expect((await deleteUser(created.data.uuid)).data).toBeNull();
    await expectApiError(fetchUser(created.data.uuid), 404);
  });

  it('reads the catalog, replaces role grants, and enforces the effective permissions', async () => {
    const catalog = await fetchAbilityCatalog();
    const ownAbilities = await fetchOwnAbilities();
    const userRole = (await fetchRoles()).find(({ role }) => role === 'USER');

    expect(catalog.length).toBeGreaterThan(0);
    expect(ownAbilities).toEqual(
      expect.arrayContaining(
        catalog.map(({ action, subject }) => ({ action, subject })),
      ),
    );
    if (!userRole) {
      throw new Error('The backend did not seed the USER role.');
    }

    const original = await fetchRole(userRole.uuid);
    const abilities = [{ action: 'READ', subject: 'USER' }] as const;

    try {
      const updated = await updateRoleAbilities({
        uuid: userRole.uuid,
        abilities: [...abilities],
      });

      expect(
        updated.data.abilities.map(({ action, subject }) => ({
          action,
          subject,
        })),
      ).toEqual(abilities);
      await login(backend.user);
      expect(await fetchOwnAbilities()).toEqual(abilities);
      expect(
        (await fetchUsers({ page: 1, limit: 10 })).meta.total,
      ).toBeGreaterThan(0);
      await expectApiError(fetchRoles(), 403);
    } finally {
      await login(backend.admin);
      await updateRoleAbilities({
        uuid: userRole.uuid,
        abilities: original.abilities,
      });
    }
  });

  it('updates the profile and immediately ends its authenticated session', async () => {
    const user = await login(backend.user);
    const updated = await updateOwnProfile({
      name: 'Updated Contract Profile',
      email: user.email,
    });

    expect(updated.name).toBe('Updated Contract Profile');
    expect(await fetchSessionUser()).toBeNull();
    expect((await login(backend.user)).name).toBe(updated.name);
  });

  it('ends the session when an administrator edits their own management record', async () => {
    const user = await fetchSessionUser();

    if (!user) {
      throw new Error('The administrator session is missing.');
    }

    const updated = await updateUser({
      uuid: user.uuid,
      name: 'Updated Contract Admin',
      email: user.email,
      roleUuids: user.roles.map(({ uuid }) => uuid),
    });

    expect(updated.data.name).toBe('Updated Contract Admin');
    expect(await fetchSessionUser()).toBeNull();
  });

  it('logs out and makes both the session and refresh endpoint unauthenticated', async () => {
    await logout();

    expect(await fetchSessionUser()).toBeNull();
    await expectApiError(httpClient.post('/auth/refresh'), 401);
  });
});
