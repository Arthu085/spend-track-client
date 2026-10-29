import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ParseKeys } from 'i18next';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Preferences } from '@/modules/preferences/domain/preferences.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';
import { formatMoney } from '@/shared/money/money';
import type { Transaction } from '@/modules/transactions/domain/transaction.schema';
import type { Dashboard } from '../../domain/dashboard.schema';
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
        name: i18n.t('month.next'),
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
        name: i18n.t('month.current'),
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

  describe('transaction indicators', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 29, 12));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const account = {
      uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
      name: 'Nubank',
      status: 'ACTIVE' as const,
    };

    const withTransactions = buildDashboard({
      income: { total: '5000.00', completed: '3000.00', pending: '2000.00' },
      expenses: { total: '1200.00', completed: '800.00', pending: '400.00' },
      expensesByCategory: [
        {
          category: {
            uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
            name: 'Moradia',
            color: '#1677FF',
          },
          total: '900.00',
          completed: '600.00',
          pending: '300.00',
        },
        {
          category: {
            uuid: '4e3b0a91-4444-4c3e-9f1a-1a2b3c4d5e6f',
            name: 'Mercado',
            color: null,
          },
          total: '300.00',
          completed: '200.00',
          pending: '100.00',
        },
      ],
      upcoming: [
        {
          uuid: '5f4c1b02-5555-4c3e-9f1a-1a2b3c4d5e6f',
          type: 'EXPENSE',
          typeLabel: 'Despesa',
          description: 'Aluguel',
          amount: '300.00',
          date: '2026-10-05',
          overdue: true,
          account,
          destinationAccount: null,
          category: {
            uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
            name: 'Moradia',
            color: '#1677FF',
          },
        },
        {
          uuid: '6a5d2c13-6666-4c3e-9f1a-1a2b3c4d5e6f',
          type: 'INCOME',
          typeLabel: 'Receita',
          description: 'Salário',
          amount: '2000.00',
          date: '2026-10-30',
          overdue: false,
          account,
          destinationAccount: null,
          category: {
            uuid: '7b6e3d24-7777-4c3e-9f1a-1a2b3c4d5e6f',
            name: 'Salário',
            color: null,
          },
        },
      ],
      upcomingCount: 12,
    });

    const completedRent: Transaction = {
      uuid: '5f4c1b02-5555-4c3e-9f1a-1a2b3c4d5e6f',
      type: 'EXPENSE',
      typeLabel: 'Despesa',
      description: 'Aluguel',
      amount: '300.00',
      date: '2026-10-05',
      state: 'COMPLETED',
      stateLabel: 'Realizada',
      completedOn: '2026-10-29',
      canceledAt: null,
      account,
      destinationAccount: null,
      category: {
        uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
        name: 'Moradia',
        kind: 'EXPENSE',
        color: '#1677FF',
        status: 'ACTIVE',
      },
      notes: null,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-29T12:00:00.000Z',
    };

    const upcomingRow = (page: HTMLElement, uuid: string) => {
      const row = page.querySelector<HTMLElement>(`tr[data-row-key="${uuid}"]`);

      if (!row) {
        throw new Error('Row not found');
      }

      return row;
    };

    it('separates planned from completed income and expenses', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(withTransactions),
      });

      const page = await main();
      const amountOf = (key: ParseKeys) =>
        within(page).getByLabelText(i18n.t(key));

      expect(
        await within(page).findByLabelText(i18n.t('dashboard.income.title')),
      ).toHaveTextContent(money('5000.00'));
      expect(amountOf('dashboard.income.completed')).toHaveTextContent(
        money('3000.00'),
      );
      expect(amountOf('dashboard.income.pending')).toHaveTextContent(
        money('2000.00'),
      );
      expect(amountOf('dashboard.expenses.title')).toHaveTextContent(
        money('1200.00'),
      );
      expect(amountOf('dashboard.expenses.completed')).toHaveTextContent(
        money('800.00'),
      );
      expect(amountOf('dashboard.expenses.pending')).toHaveTextContent(
        money('400.00'),
      );
      expect(
        within(page).getByRole('progressbar', { name: 'Moradia' }),
      ).toHaveAttribute('aria-valuenow', '75');
      expect(
        within(page).getByText(
          i18n.t('dashboard.expensesByCategory.breakdown', {
            completed: money('600.00'),
            pending: money('300.00'),
          }),
        ),
      ).toBeInTheDocument();
    });

    it('lists upcoming transactions with overdue marks and completes one', async () => {
      const { sent } = renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(withTransactions),
        'PUT /transactions/5f4c1b02-5555-4c3e-9f1a-1a2b3c4d5e6f/state':
          envelope(completedRent, 'Transação realizada'),
      });

      const page = await main();
      await within(page).findByText('Aluguel');
      const overdueRow = upcomingRow(page, withTransactions.upcoming[0].uuid);
      expect(
        within(overdueRow).getByText(i18n.t('transactions.overdue')),
      ).toBeInTheDocument();
      expect(
        within(
          upcomingRow(page, withTransactions.upcoming[1].uuid),
        ).queryByText(i18n.t('transactions.overdue')),
      ).not.toBeInTheDocument();
      expect(
        within(page).getByText(
          i18n.t('dashboard.upcoming.partial', { shown: 2, count: 12 }),
        ),
      ).toBeInTheDocument();

      fireEvent.click(
        within(overdueRow).getByRole('button', {
          name: i18n.t('transactions.actions.complete', {
            description: 'Aluguel',
          }),
        }),
      );
      const dialog = await findDialog(i18n.t('transactions.complete.title'));
      fireEvent.click(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      );

      expect(
        await screen.findByText('Transação realizada'),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(sent('GET /dashboard')).toHaveLength(2);
      });
      expect(
        requestBody(
          sent(
            'PUT /transactions/5f4c1b02-5555-4c3e-9f1a-1a2b3c4d5e6f/state',
          )[0],
        ),
      ).toEqual({ state: 'COMPLETED', completedOn: '2026-10-29' });
    });

    it('shows an empty state for every transaction block', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(buildDashboard()),
      });

      const page = await main();
      for (const key of [
        'dashboard.income.empty',
        'dashboard.expenses.empty',
        'dashboard.upcoming.empty',
        'dashboard.expensesByCategory.empty',
      ] as const) {
        expect(await within(page).findByText(i18n.t(key))).toBeInTheDocument();
      }
    });

    it('opens the transaction form from the quick action', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /accounts': {
          status: 200,
          data: { data: [], meta: { total: 0, page: 1, limit: 50 } },
        },
        'GET /transaction-categories': {
          status: 200,
          data: { data: [], meta: { total: 0, page: 1, limit: 50 } },
        },
      });

      fireEvent.click(
        await within(await main()).findByRole('button', {
          name: new RegExp(i18n.t('dashboard.actions.addTransaction')),
        }),
      );

      expect(
        await findDialog(i18n.t('transactions.create.title')),
      ).toBeInTheDocument();
    });
  });
});
