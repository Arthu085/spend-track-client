import { screen, within } from '@testing-library/react';
import { getAdapter } from 'axios';
import type { ParseKeys } from 'i18next';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Ability } from '@/modules/authorization/domain/ability.schema';
import type { Role } from '@/modules/authorization/domain/role.schema';
import type { UserChangeRequest } from '@/modules/users/domain/user-change-request.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { stubHttpRoutes } from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';

const adminRole: Role = {
  uuid: '0b7f8f0e-5d2a-4c3e-9f1a-1a2b3c4d5e6f',
  role: 'ADMIN',
  roleLabel: 'Administrador',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
};

const sessionUser = (roles: Role[]): UserDetail => ({
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  roles,
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const changeRequest: UserChangeRequest = {
  uuid: '3d6f0a8e-9b1c-4e2d-8f7a-5c4b3a2d1e0f',
  status: 'PENDING',
  statusLabel: 'Pendente',
  requesterName: 'Grace Hopper',
  current: { name: 'Ada Lovelace', email: 'ada@example.com', roles: [] },
  requested: { name: 'Ada King', email: 'ada@example.com', roles: [] },
  expiresAt: '2026-01-03T12:00:00.000Z',
  createdAt: '2026-01-02T12:00:00.000Z',
};

const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const renderHome = ({
  roles,
  abilities,
  changeRequests = [],
}: {
  roles: Role[];
  abilities: Ability[];
  changeRequests?: UserChangeRequest[];
}) => {
  stubHttpRoutes(httpClient, {
    'GET /users/me': envelope(sessionUser(roles)),
    'GET /users/me/abilities': envelope(abilities),
    'GET /users/me/change-requests': envelope(changeRequests),
  });

  renderRoute(AppRoutes.HOME);
};

const findShortcut = async (titleKey: ParseKeys) =>
  within(await screen.findByRole('main')).findByRole('link', {
    name: (name) => name.includes(i18n.t(titleKey)),
  });

const queryShortcut = (titleKey: ParseKeys) =>
  within(screen.getByRole('main')).queryByRole('link', {
    name: (name) => name.includes(i18n.t(titleKey)),
  });

describe('HomePage', () => {
  it('waits for initial abilities before displaying the shortcut grid', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(sessionUser([adminRole])),
      'GET /users/me/abilities': envelope([
        { action: 'READ', subject: 'USER' },
        { action: 'READ', subject: 'ROLE' },
      ]),
      'GET /users/me/change-requests': envelope([]),
    });
    const adapter = getAdapter(httpClient.defaults.adapter);
    let releaseAbilities: (() => void) | undefined;
    const abilitiesReady = new Promise<void>((resolve) => {
      releaseAbilities = resolve;
    });
    httpClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/abilities') {
        await abilitiesReady;
      }

      return adapter(config);
    };

    renderRoute(AppRoutes.HOME);

    await screen.findByRole('heading', {
      name: i18n.t('home.greeting', { name: 'Ada Lovelace' }),
    });
    expect(queryShortcut('account.title')).not.toBeInTheDocument();
    expect(queryShortcut('changeRequests.title')).not.toBeInTheDocument();
    expect(queryShortcut('navigation.users')).not.toBeInTheDocument();

    releaseAbilities?.();

    expect(await findShortcut('navigation.users')).toBeInTheDocument();
    expect(await findShortcut('navigation.roles')).toBeInTheDocument();
    expect(await findShortcut('account.title')).toBeInTheDocument();
    expect(await findShortcut('changeRequests.title')).toBeInTheDocument();
  });

  it('greets the user and links only to the pages they can reach', async () => {
    renderHome({ roles: [], abilities: [{ action: 'READ', subject: 'USER' }] });

    expect(
      await screen.findByRole('heading', {
        name: i18n.t('home.greeting', { name: 'Ada Lovelace' }),
      }),
    ).toBeInTheDocument();
    expect(await findShortcut('navigation.users')).toHaveAttribute(
      'href',
      AppRoutes.USERS,
    );
    expect(await findShortcut('account.title')).toHaveAttribute(
      'href',
      AppRoutes.ACCOUNT,
    );
    expect(queryShortcut('navigation.roles')).not.toBeInTheDocument();
    expect(queryShortcut('changeRequests.title')).not.toBeInTheDocument();
  });

  it('links an admin to change requests with the pending count', async () => {
    renderHome({
      roles: [adminRole],
      abilities: [{ action: 'READ', subject: 'ROLE' }],
      changeRequests: [changeRequest],
    });

    expect(await findShortcut('navigation.roles')).toHaveAttribute(
      'href',
      AppRoutes.ROLES,
    );
    const changeRequestsLink = await findShortcut('changeRequests.title');
    expect(changeRequestsLink).toHaveAttribute(
      'href',
      AppRoutes.CHANGE_REQUESTS,
    );
    expect(
      await within(changeRequestsLink).findByText('1'),
    ).toBeInTheDocument();
    expect(queryShortcut('navigation.users')).not.toBeInTheDocument();
  });
});
