import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getAdapter, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { buildDashboard } from '@/test/dashboard-fixture';
import {
  csrfResponse,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { buildPreferences } from '@/test/preferences-fixture';
import { renderRoute } from '@/test/render-route';
import { dashboardKey } from '../../infra/dashboard.queries';
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

const renderDashboard = (
  dashboardRoute: DashboardRoute,
  path: string = AppRoutes.DASHBOARD,
) => {
  const routes: Record<string, DashboardRoute> = {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /dashboard': dashboardRoute,
    'GET /preferences': envelope(buildPreferences()),
  };
  const requests = stubHttpRoutes(httpClient, routes);
  const { router, queryClient } = renderRoute(path);
  const dashboardRequests = () =>
    requests.filter((request) => requestKey(request) === 'GET /dashboard');

  return { routes, router, queryClient, dashboardRequests };
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

const requestedMonth = ({ params }: InternalAxiosRequestConfig) =>
  (params as { month?: number } | undefined)?.month;

const isNovember = (config: InternalAxiosRequestConfig) =>
  requestedMonth(config) === 11;

const invalidMonth: StubResponse = {
  status: 400,
  data: { statusCode: 400, message: 'Mês inválido' },
};

const retryButton = (container: HTMLElement) =>
  within(container).getByRole('button', { name: i18n.t('dashboard.retry') });

const loadingDashboard = () =>
  screen.queryByRole('status', { name: i18n.t('dashboard.loading') });

const monthButton = (
  container: HTMLElement,
  key: 'month.previous' | 'month.next',
) => within(container).getByRole('button', { name: i18n.t(key) });

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
      within(page).getByRole('heading', monthHeading(2026, 11)),
    ).toBeInTheDocument();
    expect(
      within(page).queryByText(i18n.t('dashboard.period.timing.CURRENT')),
    ).not.toBeInTheDocument();

    release();

    expect(
      await within(page).findByText(i18n.t('dashboard.period.timing.CURRENT')),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('heading', monthHeading(2026, 11)),
    ).toBeInTheDocument();
    expect(loadingMonth()).not.toBeInTheDocument();
    expect(content()).toHaveAttribute('aria-busy', 'false');
  });

  it('retries a dashboard that failed to load', async () => {
    const { routes, dashboardRequests } = renderDashboard(invalidMonth);

    const page = await screen.findByRole('main');
    const alert = await within(page).findByRole('alert');
    expect(alert).toHaveTextContent('Mês inválido');
    expect(monthButton(page, 'month.next')).toBeInTheDocument();

    routes['GET /dashboard'] = envelope(buildDashboard());
    fireEvent.click(retryButton(alert));

    expect(
      await within(page).findByRole('heading', monthHeading(2026, 10)),
    ).toBeInTheDocument();
    expect(dashboardRequests()).toHaveLength(2);
    expect(within(page).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the last figures with a warning when a refresh fails', async () => {
    const { routes, queryClient, dashboardRequests } = renderDashboard(
      envelope(buildDashboard()),
    );

    const page = await screen.findByRole('main');
    await within(page).findByRole('heading', monthHeading(2026, 10));

    routes['GET /dashboard'] = invalidMonth;
    await act(() => queryClient.invalidateQueries({ queryKey: dashboardKey }));

    const alert = await within(page).findByRole('alert');
    expect(alert).toHaveTextContent(i18n.t('dashboard.refreshFailed'));
    expect(alert).toHaveTextContent('Mês inválido');
    expect(
      within(page).getByRole('heading', monthHeading(2026, 10)),
    ).toBeInTheDocument();

    routes['GET /dashboard'] = envelope(buildDashboard());
    fireEvent.click(retryButton(alert));

    await waitFor(() => {
      expect(within(page).queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(dashboardRequests()).toHaveLength(3);
  });

  it.each([
    { button: 'month.previous', month: 10 },
    { button: 'month.next', month: 12 },
  ] as const)(
    'moves from a month that failed to load with $button',
    async ({ button, month }) => {
      const { router, dashboardRequests } = renderDashboard(
        (config) =>
          isNovember(config) ? invalidMonth : envelope(monthOf(config)),
        `${AppRoutes.DASHBOARD}?year=2026&month=11`,
      );

      const page = await screen.findByRole('main');
      const alert = await within(page).findByRole('alert');
      expect(alert).toHaveTextContent('Mês inválido');
      expect(
        within(page).getByRole('heading', monthHeading(2026, 11)),
      ).toBeInTheDocument();

      fireEvent.click(monthButton(page, button));

      expect(
        await within(page).findByText(
          i18n.t('dashboard.period.timing.CURRENT'),
        ),
      ).toBeInTheDocument();
      expect(
        within(page).getByRole('heading', monthHeading(2026, month)),
      ).toBeInTheDocument();
      expect(within(page).queryByRole('alert')).not.toBeInTheDocument();
      expect(router.state.location.search).toBe(`?year=2026&month=${month}`);
      expect(dashboardRequests().at(-1)?.params).toEqual({ year: 2026, month });
    },
  );

  it('moves on from the requested month while the previous one is shown', async () => {
    const { router, dashboardRequests } = renderDashboard((config) =>
      envelope(monthOf(config)),
    );
    const release = holdDashboardRequests(isNovember);

    const page = await screen.findByRole('main');
    await within(page).findByRole('heading', monthHeading(2026, 10));

    fireEvent.click(monthButton(page, 'month.next'));
    await within(page).findByRole('status', {
      name: i18n.t('dashboard.period.loading'),
    });
    fireEvent.click(monthButton(page, 'month.next'));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?year=2026&month=12');
    });
    expect(
      await within(page).findByText(i18n.t('dashboard.period.timing.CURRENT')),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('heading', monthHeading(2026, 12)),
    ).toBeInTheDocument();

    release();

    await waitFor(() => {
      expect(dashboardRequests().map(requestedMonth)).toEqual([
        undefined,
        12,
        11,
      ]);
    });
    expect(
      within(page).getByRole('heading', monthHeading(2026, 12)),
    ).toBeInTheDocument();
  });
});
