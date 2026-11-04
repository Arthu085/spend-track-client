import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { buildDashboard } from '@/test/dashboard-fixture';
import { csrfResponse, stubHttpRoutes } from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';
import { AppRoutes } from '../app-routes';

const sessionUser: UserDetail = {
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  roles: [],
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const stubSignedIn = () =>
  stubHttpRoutes(httpClient, {
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /dashboard': envelope(buildDashboard()),
  });

describe('routes', () => {
  it('redirects the former home path to the dashboard', async () => {
    stubSignedIn();

    const { router } = renderRoute(AppRoutes.LEGACY_HOME);

    expect(
      await screen.findByRole('heading', {
        name: i18n.t('dashboard.greeting', { name: sessionUser.name }),
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.DASHBOARD);
  });

  it('sends a signed-out visitor of the former home path to the login page', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': { status: 401 },
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 401 },
    });

    const { router } = renderRoute(AppRoutes.LEGACY_HOME);

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
  });

  it('links the not-found page back to the dashboard', async () => {
    stubSignedIn();

    renderRoute('/does-not-exist');

    expect(
      await screen.findByRole('link', { name: i18n.t('common.backToHome') }),
    ).toHaveAttribute('href', AppRoutes.DASHBOARD);
  });
});
