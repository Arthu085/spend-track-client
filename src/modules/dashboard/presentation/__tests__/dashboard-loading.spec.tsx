import { fireEvent, screen, within } from '@testing-library/react';
import { getAdapter, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { buildDashboard } from '@/test/dashboard-fixture';
import {
  csrfResponse,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';
import { formatMonthLabel } from '@/shared/date/month-ref';

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

const envelope = (data: unknown): StubResponse => ({
  status: 200,
  data: { data, meta: {} },
});

type DashboardRoute =
  StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse);

const renderDashboard = (dashboardRoute: DashboardRoute) => {
  const routes = {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /dashboard': dashboardRoute,
  };
  stubHttpRoutes(httpClient, routes);
  renderRoute(AppRoutes.DASHBOARD);

  return routes;
};

// Holds the dashboard requests that match until the returned release is called.
const holdDashboardRequests = (
  matches: (config: InternalAxiosRequestConfig) => boolean = () => true,
) => {
  const adapter = getAdapter(httpClient.defaults.adapter);
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  httpClient.defaults.adapter = async (config) => {
    if (config.url === '/dashboard' && matches(config)) {
      await released;
    }

    return adapter(config);
  };

  return () => release?.();
};

const monthHeading = (year: number, month: number) => ({
  name: formatMonthLabel({ year, month }, i18n.language),
});

const monthOf = ({ params }: InternalAxiosRequestConfig) => {
  const { year, month } = (params ?? {}) as { year?: number; month?: number };
  const dashboard = buildDashboard();

  return year && month
    ? buildDashboard({ period: { ...dashboard.period, year, month } })
    : dashboard;
};

const isNovember = ({ params }: InternalAxiosRequestConfig) =>
  (params as { month?: number } | undefined)?.month === 11;

const loadingDashboard = () =>
  screen.queryByRole('status', { name: i18n.t('dashboard.loading') });

describe('DashboardPage loading states', () => {
  it('shows a skeleton of the dashboard until the month loads', async () => {
    renderDashboard(envelope(buildDashboard()));
    const release = holdDashboardRequests();

    const page = await screen.findByRole('main');
    expect(
      await within(page).findByRole('status', {
        name: i18n.t('dashboard.loading'),
      }),
    ).toHaveAttribute('aria-busy', 'true');

    release();

    expect(
      await within(page).findByRole('heading', monthHeading(2026, 10)),
    ).toBeInTheDocument();
    expect(loadingDashboard()).not.toBeInTheDocument();
  });

  it('marks the previous month as busy while the next month loads', async () => {
    renderDashboard((config) => envelope(monthOf(config)));
    const release = holdDashboardRequests(isNovember);

    const page = await screen.findByRole('main');
    await within(page).findByRole('heading', monthHeading(2026, 10));
    const content = () =>
      within(page)
        .getByLabelText(i18n.t('dashboard.balances.available'))
        .closest('[aria-busy]');
    const loadingMonth = () =>
      within(page).queryByRole('status', {
        name: i18n.t('dashboard.period.loading'),
      });
    expect(content()).toHaveAttribute('aria-busy', 'false');
    expect(loadingMonth()).not.toBeInTheDocument();

    fireEvent.click(
      within(page).getByRole('button', { name: i18n.t('month.next') }),
    );

    expect(
      await within(page).findByRole('status', {
        name: i18n.t('dashboard.period.loading'),
      }),
    ).toBeInTheDocument();
    expect(content()).toHaveAttribute('aria-busy', 'true');
    expect(
      within(page).getByRole('heading', monthHeading(2026, 10)),
    ).toBeInTheDocument();

    release();

    expect(
      await within(page).findByRole('heading', monthHeading(2026, 11)),
    ).toBeInTheDocument();
    expect(loadingMonth()).not.toBeInTheDocument();
    expect(content()).toHaveAttribute('aria-busy', 'false');
  });
});
