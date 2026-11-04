import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { stubHttpRoutes } from '@/test/http-stub';
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

describe('routes', () => {
  it('links the not-found page back to the dashboard', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(sessionUser),
      'GET /users/me/abilities': envelope([]),
      'GET /users/me/change-requests': envelope([]),
    });

    renderRoute('/does-not-exist');

    expect(
      await screen.findByRole('link', {
        name: i18n.t('common.backToDashboard'),
      }),
    ).toHaveAttribute('href', AppRoutes.DASHBOARD);
  });
});
