import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Preferences } from '@/modules/preferences/domain/preferences.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { buildDashboard } from '@/test/dashboard-fixture';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';
import { formatMoney } from '@/shared/money/money';
import type { Dashboard } from '../../domain/dashboard.schema';
import { formatMonthLabel } from '../../domain/month-ref';

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

const withAccounts = buildDashboard({
  balances: { actual: '1000.30', projected: '1000.30' },
  accounts: [
    {
      uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
      name: 'Nubank',
      type: 'CHECKING',
      typeLabel: 'Conta corrente',
      isDefault: true,
      actualBalance: '1020.80',
      projectedBalance: '1020.80',
    },
    {
      uuid: '2c1f8e7f-2222-4c3e-9f1a-1a2b3c4d5e6f',
      name: 'Carteira',
      type: 'CASH',
      typeLabel: 'Dinheiro',
      isDefault: false,
      actualBalance: '-20.50',
      projectedBalance: '-20.50',
    },
  ],
});

const preferences: Preferences = {
  spendingPerspective: 'INVOICE_MONTH',
  spendingPerspectiveLabel: 'Mês da fatura',
  defaultMonth: 'CURRENT',
  defaultMonthLabel: 'Mês atual',
  updatedAt: '2026-10-29T12:00:00.000Z',
};

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const monthOf = ({ params }: InternalAxiosRequestConfig): Dashboard => {
  const { year, month } = (params ?? {}) as { year?: number; month?: number };

  return year && month
    ? buildDashboard({
        period: {
          ...withAccounts.period,
          year,
          month,
          timing: 'FUTURE',
          remainingDays: 30,
        },
      })
    : withAccounts;
};

const renderDashboard = (
  path: string = AppRoutes.DASHBOARD,
  routes: Record<
    string,
    StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
  > = {},
) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /dashboard': (config) => envelope(monthOf(config)),
    ...routes,
  });
  const rendered = renderRoute(path);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, sent };
};

const main = () => screen.findByRole('main');

const monthHeading = (year: number, month: number) => ({
  name: formatMonthLabel({ year, month }, i18n.language),
});

const money = (amount: string) => formatMoney(amount, i18n.language);

describe('DashboardPage', () => {
  it('shows the balances of the default month and of each active account', async () => {
    const { sent } = renderDashboard();

    const page = await main();
    expect(
      await within(page).findByRole('heading', monthHeading(2026, 10)),
    ).toBeInTheDocument();
    expect(sent('GET /dashboard')[0].params).toBeUndefined();
    expect(
      within(page).getByText(i18n.t('dashboard.period.timing.CURRENT')),
    ).toBeInTheDocument();
    expect(
      within(page).getByText(
        i18n.t('dashboard.period.remainingDays', { count: 3 }),
      ),
    ).toBeInTheDocument();
    expect(
      within(page).getAllByLabelText(i18n.t('dashboard.balances.actual'))[0],
    ).toHaveTextContent(money('1000.30'));

    const walletRow = page.querySelector<HTMLElement>(
      `tr[data-row-key="${withAccounts.accounts[1].uuid}"]`,
    );
    expect(walletRow).not.toBeNull();
    expect(within(walletRow!).getAllByText(money('-20.50'))).toHaveLength(2);
    expect(
      within(page).getByText(i18n.t('accounts.default')),
    ).toBeInTheDocument();
  });

  it('moves between months through the URL, including future months', async () => {
    const { router, sent } = renderDashboard();

    const page = await main();
    await within(page).findByRole('heading', monthHeading(2026, 10));
    fireEvent.click(
      within(page).getByRole('button', {
        name: i18n.t('dashboard.period.next'),
      }),
    );

    expect(
      await within(page).findByRole('heading', monthHeading(2026, 11)),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?year=2026&month=11');
    expect(sent('GET /dashboard').at(-1)?.params).toEqual({
      year: 2026,
      month: 11,
    });
    expect(
      within(page).getByText(i18n.t('dashboard.period.timing.FUTURE')),
    ).toBeInTheDocument();

    fireEvent.click(
      within(page).getByRole('button', {
        name: i18n.t('dashboard.period.current'),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe('?year=2026&month=10');
    });
  });

  it('loads the month from the URL', async () => {
    const { sent } = renderDashboard(
      `${AppRoutes.DASHBOARD}?year=2027&month=1`,
    );

    expect(
      await within(await main()).findByRole('heading', monthHeading(2027, 1)),
    ).toBeInTheDocument();
    expect(sent('GET /dashboard')[0].params).toEqual({ year: 2027, month: 1 });
  });

  it('saves the spending perspective and reloads the dashboard', async () => {
    const { sent } = renderDashboard(AppRoutes.DASHBOARD, {
      'PATCH /preferences': envelope(preferences, 'Preferências salvas'),
    });

    const page = await main();
    fireEvent.click(
      await within(page).findByText(
        i18n.t('preferences.spendingPerspectives.INVOICE_MONTH'),
      ),
    );

    expect(await screen.findByText('Preferências salvas')).toBeInTheDocument();
    expect(requestBody(sent('PATCH /preferences')[0])).toEqual({
      spendingPerspective: 'INVOICE_MONTH',
    });
    await waitFor(() => {
      expect(sent('GET /dashboard')).toHaveLength(2);
    });
  });

  it('invites the user to add an account when there is none', async () => {
    const { router } = renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(buildDashboard()),
    });

    const page = await main();
    expect(
      await within(page).findByText(i18n.t('dashboard.accounts.empty')),
    ).toBeInTheDocument();
    fireEvent.click(
      within(page).getByRole('link', {
        name: new RegExp(i18n.t('dashboard.accounts.add')),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(AppRoutes.ACCOUNTS);
    });
  });

  it('shows the API error when the dashboard cannot load', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': {
        status: 400,
        data: { statusCode: 400, message: 'Mês inválido' },
      },
    });

    expect(
      await within(await main()).findByText('Mês inválido'),
    ).toBeInTheDocument();
  });
});
