import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ParseKeys } from 'i18next';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  buildInvestment,
  buildInvestmentMovement,
} from '@/modules/investments/presentation/__tests__/investment-fixture';
import type { Preferences } from '@/modules/preferences/domain/preferences.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  buildCreditCardInvoice,
  buildCreditCardInvoiceDetail,
} from '@/test/credit-card-fixture';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { expandSection, findSectionHeader } from '@/test/expand-section';
import { createMatchMedia } from '@/test/match-media';
import { renderRoute } from '@/test/render-route';
import { formatMoney } from '@/shared/money/money';
import type { Transaction } from '@/modules/transactions/domain/transaction.schema';
import type {
  Dashboard,
  DashboardBudgetLimit,
} from '../../domain/dashboard.schema';
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
  balances: { actual: '1000.30', projected: '1000.30', available: '700.30' },
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

  it('shows card invoices, what is still due, planned charges, and the available balance', async () => {
    const invoice = buildCreditCardInvoice();
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        creditCards: {
          spending: '300.00',
          outstanding: '300.00',
          planned: '55.90',
          plannedDue: '111.80',
          invoices: [invoice],
          plannedCharges: [
            {
              uuid: 'charge-overdue',
              recurrenceUuid: 'recurrence-uuid',
              description: 'Netflix',
              amount: '55.90',
              date: '2026-09-15',
              invoiceMonth: '2026-10-01',
              overdue: true,
              card: { uuid: 'card-uuid', name: 'Visa' },
              category: { uuid: 'category-uuid', name: 'Lazer', color: null },
            },
            {
              uuid: 'charge-next',
              recurrenceUuid: 'recurrence-uuid',
              description: 'Spotify',
              amount: '55.90',
              date: '2026-10-30',
              invoiceMonth: '2026-10-01',
              overdue: false,
              card: { uuid: 'card-uuid', name: 'Visa' },
              category: { uuid: 'category-uuid', name: 'Lazer', color: null },
            },
          ],
          plannedChargesCount: 12,
        },
      }),
      [`GET /credit-card-invoices/${invoice.uuid}`]: envelope(
        buildCreditCardInvoiceDetail(),
      ),
    });

    const page = await main();
    expect(
      await within(page).findByLabelText(
        i18n.t('dashboard.balances.available'),
      ),
    ).toHaveTextContent(money('700.30'));
    expect(
      within(page).getByLabelText(i18n.t('dashboard.creditCards.outstanding')),
    ).toHaveTextContent(money('300.00'));
    expect(
      within(page).getByLabelText(i18n.t('dashboard.creditCards.plannedDue')),
    ).toHaveTextContent(money('111.80'));
    expect(
      within(page).getByText(
        i18n.t('dashboard.creditCards.spendingPlanned', {
          amount: money('55.90'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      page.querySelector('tr[data-row-key="charge-overdue"]'),
    ).not.toBeInTheDocument();

    const plannedHeader = await findSectionHeader(
      i18n.t('dashboard.creditCards.plannedTitle'),
      page,
    );
    expect(plannedHeader).toHaveAttribute('aria-expanded', 'false');
    expect(plannedHeader).toHaveTextContent(
      i18n.t('dashboard.creditCards.plannedCount', { count: 12 }),
    );
    expect(plannedHeader).toHaveTextContent(
      i18n.t('dashboard.creditCards.plannedOverdue', { count: 1 }),
    );

    await expandSection(i18n.t('dashboard.creditCards.plannedTitle'), page);

    expect(
      within(page).getByText(i18n.t('dashboard.creditCards.plannedHint')),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('link', {
        name: i18n.t('dashboard.creditCards.manageRecurrences'),
      }),
    ).toBeInTheDocument();
    const overdueCharge = page.querySelector<HTMLElement>(
      'tr[data-row-key="charge-overdue"]',
    );
    expect(overdueCharge).not.toBeNull();
    expect(within(overdueCharge!).getByText('Netflix')).toBeInTheDocument();
    expect(
      within(overdueCharge!).getByText(i18n.t('transactions.overdue')),
    ).toBeInTheDocument();
    expect(
      within(
        page.querySelector<HTMLElement>('tr[data-row-key="charge-next"]')!,
      ).queryByText(i18n.t('transactions.overdue')),
    ).not.toBeInTheDocument();
    expect(
      within(page).getByText(
        i18n.t('dashboard.upcoming.partial', { shown: 2, count: 12 }),
      ),
    ).toBeInTheDocument();

    const row = page.querySelector<HTMLElement>(
      `tr[data-row-key="${invoice.uuid}"]`,
    );
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Aberta')).toBeInTheDocument();

    fireEvent.click(
      within(row!).getByRole('button', {
        name: i18n.t('creditCards.actions.viewInvoiceOf', {
          card: 'Visa',
          month: formatMonthLabel({ year: 2026, month: 11 }, i18n.language),
        }),
      }),
    );

    const dialog = await findDialog(i18n.t('creditCards.invoice.charges'));
    expect(within(dialog).getByText(/Tênis/)).toBeInTheDocument();
  });

  it('omits the planned charges section when no charge is planned', async () => {
    renderDashboard();

    const page = await main();
    await within(page).findByLabelText(
      i18n.t('dashboard.creditCards.outstanding'),
    );

    expect(
      within(page).queryByRole('button', {
        name: (name) =>
          name.startsWith(i18n.t('dashboard.creditCards.plannedTitle')),
      }),
    ).not.toBeInTheDocument();
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
      await within(page).findByText(i18n.t('dashboard.period.timing.FUTURE')),
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

  it('warns when the available balance is negative', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(
        buildDashboard({
          balances: {
            actual: '100.00',
            projected: '50.00',
            available: '-250.50',
          },
        }),
      ),
    });

    const page = await main();
    expect(
      await within(page).findByText(
        i18n.t('dashboard.balances.shortfall', { amount: money('250.50') }),
      ),
    ).toBeInTheDocument();
    expect(
      within(page).getByLabelText(i18n.t('dashboard.balances.available')),
    ).toHaveTextContent(money('-250.50'));
  });

  it('does not warn while the available balance is not negative', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(buildDashboard()),
    });

    const page = await main();
    await within(page).findByLabelText(i18n.t('dashboard.balances.available'));
    expect(within(page).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('leads with what is left to spend and the available balance', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        balances: {
          actual: '1000.30',
          projected: '900.00',
          available: '700.30',
        },
        spendingGuidance: {
          basis: 'BALANCE',
          remaining: '700.30',
          dailyAllowance: '233.43',
        },
      }),
    });

    const page = await main();
    const amountOf = (key: ParseKeys) =>
      within(page).getAllByLabelText(i18n.t(key))[0];

    expect(
      await within(page).findByLabelText(
        i18n.t('dashboard.budget.guidance.BALANCE'),
      ),
    ).toHaveTextContent(money('700.30'));
    expect(amountOf('dashboard.budget.guidance.daily')).toHaveTextContent(
      money('233.43'),
    );
    expect(amountOf('dashboard.balances.available')).toHaveTextContent(
      money('700.30'),
    );
    expect(amountOf('dashboard.balances.actual')).toHaveTextContent(
      money('1000.30'),
    );
    expect(amountOf('dashboard.balances.projected')).toHaveTextContent(
      money('900.00'),
    );
    for (const key of [
      'dashboard.budget.guidance.BALANCEHint',
      'dashboard.budget.guidance.dailyHint',
      'dashboard.balances.actualHint',
      'dashboard.balances.projectedHint',
      'dashboard.balances.availableHint',
    ] as const) {
      expect(within(page).getByText(i18n.t(key))).toBeInTheDocument();
    }
    expect(
      within(page).getAllByText(i18n.t('dashboard.budget.guidance.BALANCE')),
    ).toHaveLength(1);
    expect(
      within(page).getByText(i18n.t('dashboard.budget.limitsTitle')),
    ).toBeInTheDocument();
    expect(
      within(page).queryByText(i18n.t('dashboard.pace.title')),
    ).not.toBeInTheDocument();
  });

  describe('budget pace', () => {
    const withOverallBudget = (
      total: string,
      period: Partial<Dashboard['period']> = {},
    ) =>
      envelope(
        buildDashboard({
          period: {
            ...buildDashboard().period,
            remainingDays: 20,
            ...period,
          },
          budget: {
            overall: {
              limit: '500.00',
              total,
              completed: total,
              pending: '0.00',
              remaining: '0.00',
              overspent:
                Number(total) > 500 ? (Number(total) - 500).toFixed(2) : '0.00',
            },
            categories: [],
          },
        }),
      );

    const renderPace = async (response: StubResponse) => {
      renderDashboard(AppRoutes.DASHBOARD, { 'GET /dashboard': response });
      const page = await main();
      await within(page).findByText(i18n.t('dashboard.pace.title'));
      return page;
    };

    it('compares the budget used with the month elapsed', async () => {
      const page = await renderPace(withOverallBudget('200.00'));

      expect(
        within(page).getByRole('progressbar', {
          name: i18n.t('dashboard.pace.used'),
        }),
      ).toHaveAttribute('aria-valuenow', '40');
      expect(
        within(page).getByRole('progressbar', {
          name: i18n.t('dashboard.pace.elapsed'),
        }),
      ).toHaveAttribute('aria-valuenow', '35');
      expect(
        within(page).getByText(
          i18n.t('dashboard.pace.summary', { used: 40, elapsed: 35 }),
        ),
      ).toBeInTheDocument();
      expect(
        within(page).getByText(i18n.t('dashboard.pace.status.onTrack')),
      ).toBeInTheDocument();
    });

    it('warns when spending runs faster than the month', async () => {
      const page = await renderPace(withOverallBudget('300.00'));

      expect(
        within(page).getByText(i18n.t('dashboard.pace.status.ahead')),
      ).toBeInTheDocument();
    });

    it('flags an exceeded overall limit', async () => {
      const page = await renderPace(withOverallBudget('650.00'));

      expect(
        within(page).getByText(
          i18n.t('dashboard.pace.summary', { used: 130, elapsed: 35 }),
        ),
      ).toBeInTheDocument();
      expect(
        within(page).getByText(i18n.t('dashboard.pace.status.over')),
      ).toBeInTheDocument();
    });

    it('counts a closed month as fully elapsed', async () => {
      const page = await renderPace(
        withOverallBudget('480.00', { timing: 'PAST', remainingDays: 0 }),
      );

      expect(
        within(page).getByText(
          i18n.t('dashboard.pace.summary', { used: 96, elapsed: 100 }),
        ),
      ).toBeInTheDocument();
      expect(
        within(page).getByText(i18n.t('dashboard.pace.status.onTrack')),
      ).toBeInTheDocument();
    });

    it('is not shown for a future month', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': withOverallBudget('200.00', {
          timing: 'FUTURE',
          remainingDays: 31,
        }),
      });

      const page = await main();
      await within(page).findByText(i18n.t('dashboard.period.timing.FUTURE'));

      expect(
        within(page).queryByText(i18n.t('dashboard.pace.title')),
      ).not.toBeInTheDocument();
    });
  });

  describe('needs attention', () => {
    const limit = (overrides: Partial<DashboardBudgetLimit> = {}) => ({
      limit: '500.00',
      total: '200.00',
      completed: '200.00',
      pending: '0.00',
      remaining: '300.00',
      overspent: '0.00',
      ...overrides,
    });
    const category = (name: string) => ({
      uuid: `${name}-uuid`,
      name,
      color: null,
    });
    const upcomingExpense = (uuid: string, overdue: boolean) => ({
      uuid,
      type: 'EXPENSE' as const,
      typeLabel: 'Despesa',
      description: 'Aluguel',
      amount: '300.00',
      date: '2026-10-05',
      overdue,
      account: {
        uuid: 'account-uuid',
        name: 'Nubank',
        status: 'ACTIVE' as const,
      },
      destinationAccount: null,
      category: category('Moradia'),
    });
    const plannedCharge = (uuid: string, overdue: boolean) => ({
      uuid,
      recurrenceUuid: 'recurrence-uuid',
      description: 'Netflix',
      amount: '55.90',
      date: '2026-10-15',
      invoiceMonth: '2026-10-01',
      overdue,
      card: { uuid: 'card-uuid', name: 'Visa' },
      category: category('Lazer'),
    });
    const needingAttention = buildDashboard({
      balances: { actual: '100.00', projected: '50.00', available: '-250.50' },
      upcoming: [
        upcomingExpense('upcoming-overdue-1', true),
        upcomingExpense('upcoming-overdue-2', true),
        upcomingExpense('upcoming-next', false),
      ],
      upcomingCount: 3,
      creditCards: {
        ...buildDashboard().creditCards,
        invoices: [
          buildCreditCardInvoice({
            uuid: 'invoice-overdue',
            status: 'OVERDUE',
            statusLabel: 'Vencida',
            outstanding: '300.00',
          }),
          buildCreditCardInvoice({
            uuid: 'invoice-closed',
            status: 'CLOSED',
            statusLabel: 'Fechada',
            outstanding: '120.00',
          }),
          buildCreditCardInvoice({
            uuid: 'invoice-closed-paid',
            status: 'CLOSED',
            statusLabel: 'Fechada',
            outstanding: '0.00',
          }),
          buildCreditCardInvoice({ uuid: 'invoice-open' }),
        ],
        plannedCharges: [
          plannedCharge('charge-overdue', true),
          plannedCharge('charge-next', false),
        ],
        plannedChargesCount: 2,
      },
      budget: {
        overall: limit({ total: '650.00', overspent: '150.00' }),
        categories: [
          {
            ...limit({ total: '700.00', overspent: '200.00' }),
            category: category('Mercado'),
          },
          { ...limit(), category: category('Lazer') },
        ],
      },
    });

    it('lists what needs attention, each with a link to act on it', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(needingAttention),
      });

      const strip = await within(await main()).findByRole('alert');
      const link = (key: ParseKeys) =>
        within(strip).getAllByRole('link', { name: i18n.t(key) });

      expect(
        within(strip).getByText(i18n.t('dashboard.attention.title')),
      ).toBeInTheDocument();
      for (const message of [
        i18n.t('dashboard.balances.shortfall', { amount: money('250.50') }),
        i18n.t('dashboard.attention.overdueInvoices', {
          count: 1,
          amount: money('300.00'),
        }),
        i18n.t('dashboard.attention.overdueTransactions', { count: 2 }),
        i18n.t('dashboard.attention.overdueCardCharges', { count: 1 }),
        i18n.t('dashboard.attention.closedInvoices', {
          count: 1,
          amount: money('120.00'),
        }),
        i18n.t('dashboard.attention.overallOverspent', {
          amount: money('150.00'),
        }),
        i18n.t('dashboard.attention.categoriesOverspent', {
          count: 1,
          categories: 'Mercado',
        }),
      ]) {
        expect(within(strip).getByText(message)).toBeInTheDocument();
      }
      expect(within(strip).getAllByRole('listitem')).toHaveLength(7);
      expect(link('dashboard.attention.actions.accounts')[0]).toHaveAttribute(
        'href',
        AppRoutes.ACCOUNTS,
      );
      expect(
        link('dashboard.attention.actions.transactions')[0],
      ).toHaveAttribute('href', `${AppRoutes.TRANSACTIONS}?year=2026&month=10`);
      expect(
        link('dashboard.attention.actions.recurrences')[0],
      ).toHaveAttribute('href', AppRoutes.RECURRENCES);
      for (const invoices of link('dashboard.attention.actions.invoices')) {
        expect(invoices).toHaveAttribute('href', AppRoutes.CREDIT_CARDS);
      }
      for (const budget of link('dashboard.attention.actions.budget')) {
        expect(budget).toHaveAttribute(
          'href',
          `${AppRoutes.BUDGETS}?year=2026&month=10`,
        );
      }
    });

    it('stays hidden when nothing needs attention', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(
          buildDashboard({
            creditCards: {
              ...buildDashboard().creditCards,
              invoices: [buildCreditCardInvoice()],
            },
            budget: { overall: limit(), categories: [] },
          }),
        ),
      });

      const page = await main();
      await within(page).findByRole('heading', monthHeading(2026, 10));

      expect(
        within(page).queryByText(i18n.t('dashboard.attention.title')),
      ).not.toBeInTheDocument();
    });
  });

  it('explains what the selected perspective changes', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(
        buildDashboard({ perspective: 'INVOICE_MONTH' }),
      ),
    });

    const page = await main();
    expect(
      await within(page).findByText(
        i18n.t('dashboard.perspective.INVOICE_MONTH'),
      ),
    ).toBeInTheDocument();
  });

  it('shows the amounts of a month whose refunds exceed its charges', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(
        buildDashboard({
          expenses: { total: '-50.00', completed: '-50.00', pending: '0.00' },
        }),
      ),
    });

    const page = await main();
    expect(
      await within(page).findByLabelText(
        i18n.t('dashboard.expenses.completed'),
      ),
    ).toHaveTextContent(money('-50.00'));
    expect(
      within(page).queryByText(i18n.t('dashboard.expenses.empty')),
    ).not.toBeInTheDocument();
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

  it('shows the budget against the limits with the informational daily allowance', async () => {
    const { router } = renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        budget: {
          overall: {
            limit: '1000.00',
            total: '1200.00',
            completed: '800.00',
            pending: '400.00',
            remaining: '0.00',
            overspent: '200.00',
          },
          categories: [],
        },
        spendingGuidance: {
          basis: 'BUDGET',
          remaining: '0.00',
          dailyAllowance: '0.00',
        },
      }),
    });

    const page = await main();
    expect(
      await within(page).findByText(
        i18n.t('dashboard.budget.overspent', { amount: money('200.00') }),
      ),
    ).toBeInTheDocument();
    expect(
      within(page).getByLabelText(i18n.t('dashboard.budget.guidance.BUDGET')),
    ).toHaveTextContent(money('0.00'));
    expect(
      within(page).getByLabelText(i18n.t('dashboard.budget.guidance.daily')),
    ).toHaveTextContent(money('0.00'));

    fireEvent.click(
      within(page).getByRole('link', {
        name: i18n.t('dashboard.budget.manage'),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(AppRoutes.BUDGETS);
    });
    expect(router.state.location.search).toBe('?year=2026&month=10');
  });

  it('shows investment totals, the month contributions, and goal progress', async () => {
    const { router } = renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        investments: {
          totalValue: '1500.00',
          contributions: {
            total: '700.00',
            completed: '500.00',
            pending: '200.00',
          },
          withdrawals: { total: '0.00', completed: '0.00', pending: '0.00' },
          contributionBreakdown:
            buildDashboard().investments.contributionBreakdown,
          savingPlans: [],
          items: [
            {
              uuid: '7a1b2c3d-7777-4c3e-9f1a-1a2b3c4d5e6f',
              name: 'Viagem',
              type: 'GOAL',
              typeLabel: 'Meta',
              currentValue: '1500.00',
              targetAmount: '6000.00',
              progress: { remaining: '4500.00', percent: 25 },
            },
          ],
        },
      }),
    });

    const page = await main();
    expect(
      await within(page).findByLabelText(
        i18n.t('dashboard.investments.totalValue'),
      ),
    ).toHaveTextContent(money('1500.00'));
    expect(
      within(page).getByLabelText(
        i18n.t('dashboard.investments.contributions'),
      ),
    ).toHaveTextContent(money('500.00'));
    expect(
      within(page).getByText(
        i18n.t('dashboard.investments.pending', { amount: money('200.00') }),
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('progressbar', {
        name: i18n.t('dashboard.investments.contributionsShare'),
      }),
    ).toHaveAttribute('aria-valuenow', '71');
    expect(
      within(page).queryByLabelText(
        i18n.t('dashboard.investments.withdrawals'),
      ),
    ).not.toBeInTheDocument();
    const goals = within(page).getByRole('group', {
      name: i18n.t('dashboard.investments.goals'),
    });
    expect(within(goals).getByText('Viagem')).toBeInTheDocument();
    expect(
      within(goals).getByText(
        i18n.t('investments.targetRemaining', {
          remaining: money('4500.00'),
          target: money('6000.00'),
        }),
      ),
    ).toBeInTheDocument();
    const investmentRow =
      'tr[data-row-key="7a1b2c3d-7777-4c3e-9f1a-1a2b3c4d5e6f"]';
    expect(page.querySelector(investmentRow)).not.toBeInTheDocument();

    const portfolio = await findSectionHeader(
      i18n.t('dashboard.investments.portfolio'),
      page,
    );
    expect(portfolio).toHaveAttribute('aria-expanded', 'false');
    expect(portfolio).toHaveTextContent(
      i18n.t('dashboard.investments.portfolioCount', { count: 1 }),
    );

    await expandSection(i18n.t('dashboard.investments.portfolio'), page);

    expect(
      within(page.querySelector<HTMLElement>(investmentRow)!).getByText(
        'Viagem',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(page).getByRole('link', {
        name: i18n.t('dashboard.investments.manage'),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(AppRoutes.INVESTMENTS);
    });
  });

  it('shows the month withdrawals only when there are any and limits the goals overview', async () => {
    const goal = (index: number) => ({
      uuid: `goal-${index}`,
      name: `Meta ${index}`,
      type: 'GOAL' as const,
      typeLabel: 'Meta',
      currentValue: '100.00',
      targetAmount: '1000.00',
      progress: { remaining: '900.00', percent: 10 },
    });
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        investments: {
          ...withAccounts.investments,
          withdrawals: {
            total: '300.00',
            completed: '100.00',
            pending: '200.00',
          },
          items: [1, 2, 3, 4].map(goal),
        },
      }),
    });

    const page = await main();
    expect(
      await within(page).findByLabelText(
        i18n.t('dashboard.investments.withdrawals'),
      ),
    ).toHaveTextContent(money('100.00'));
    expect(
      within(page).queryByRole('progressbar', {
        name: i18n.t('dashboard.investments.contributionsShare'),
      }),
    ).not.toBeInTheDocument();

    const goals = within(page).getByRole('group', {
      name: i18n.t('dashboard.investments.goals'),
    });
    expect(within(goals).getByText('Meta 3')).toBeInTheDocument();
    expect(within(goals).queryByText('Meta 4')).not.toBeInTheDocument();
    expect(
      within(page).getByText(
        i18n.t('dashboard.upcoming.partial', { shown: 3, count: 4 }),
      ),
    ).toBeInTheDocument();
  });

  describe('contribute from the investments card', () => {
    const activeAccount = {
      uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
      name: 'Nubank',
      type: 'CHECKING',
      typeLabel: 'Conta corrente',
      openingBalance: '0.00',
      openingBalanceDate: '2026-10-01',
      currentBalance: '1000.00',
      isDefault: true,
      status: 'ACTIVE',
      statusLabel: 'Ativo',
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    };
    const trip = buildInvestment();
    const reserve = buildInvestment({
      uuid: '9c3d4e5f-9999-4c3e-9f1a-1a2b3c4d5e6f',
      name: 'Reserva',
    });
    const movementPath = (uuid: string) =>
      `POST /investments/${uuid}/movements`;
    const paged = (data: unknown[]): StubResponse => ({
      status: 200,
      data: { data, meta: { total: data.length, page: 1, limit: 50 } },
    });
    const withInvestments = envelope({
      ...withAccounts,
      investments: {
        ...withAccounts.investments,
        items: [trip, reserve].map(
          ({
            uuid,
            name,
            type,
            typeLabel,
            currentValue,
            targetAmount,
            progress,
          }) => ({
            uuid,
            name,
            type,
            typeLabel,
            currentValue,
            targetAmount,
            progress,
          }),
        ),
      },
    });
    const routes = (path: string) => ({
      'GET /dashboard': withInvestments,
      'GET /accounts': paged([activeAccount]),
      'GET /investments': paged([trip, reserve]),
      [path]: envelope(buildInvestmentMovement(), 'Aporte registrado'),
    });
    const fill = (dialog: HTMLElement) =>
      fireEvent.change(
        within(dialog).getByLabelText(i18n.t('investments.fields.amount')),
        { target: { value: '500' } },
      );
    const save = (dialog: HTMLElement) =>
      fireEvent.click(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      );

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('offers only active records, requires an investment, and explains it is one-time', async () => {
      const { sent } = renderDashboard(
        AppRoutes.DASHBOARD,
        routes(movementPath(reserve.uuid)),
      );

      fireEvent.click(
        await screen.findByRole('button', {
          name: new RegExp(`${i18n.t('dashboard.investments.contribute')}$`),
        }),
      );
      const dialog = await findDialog(i18n.t('investments.contribution.title'));

      expect(
        within(dialog).getByText(i18n.t('investments.contribution.hint')),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(sent('GET /investments')[0]?.params).toMatchObject({
          status: 'ACTIVE',
        });
      });
      expect(sent('GET /accounts')[0].params).toMatchObject({
        status: 'ACTIVE',
      });
      await waitFor(() => {
        expect(within(dialog).getByTitle('Nubank')).toBeInTheDocument();
      });

      fill(dialog);
      save(dialog);

      expect(
        await within(dialog).findByText(i18n.t('validation.required')),
      ).toBeInTheDocument();
      expect(sent(movementPath(reserve.uuid))).toHaveLength(0);

      fireEvent.mouseDown(
        within(dialog).getByLabelText(i18n.t('investments.fields.investment')),
      );
      fireEvent.click(await screen.findByTitle(reserve.name));
      save(dialog);

      await waitFor(() => {
        expect(sent(movementPath(reserve.uuid))).toHaveLength(1);
      });
      expect(requestBody(sent(movementPath(reserve.uuid))[0])).toEqual({
        type: 'CONTRIBUTION',
        accountUuid: activeAccount.uuid,
        amount: '500',
        date: '2026-10-29',
        state: 'COMPLETED',
      });
    });

    it('preselects the investment of the row and refreshes the dashboard', async () => {
      const { sent } = renderDashboard(
        AppRoutes.DASHBOARD,
        routes(movementPath(trip.uuid)),
      );

      await expandSection(i18n.t('dashboard.investments.portfolio'));
      fireEvent.click(
        await screen.findByRole('button', {
          name: i18n.t('investments.actions.contribute', { name: trip.name }),
        }),
      );
      const dialog = await findDialog(i18n.t('investments.contribution.title'));

      expect(within(dialog).getByTitle(trip.name)).toBeInTheDocument();
      await waitFor(() => {
        expect(within(dialog).getByTitle('Nubank')).toBeInTheDocument();
      });
      const dashboardLoads = sent('GET /dashboard').length;

      fill(dialog);
      save(dialog);

      await waitFor(() => {
        expect(sent(movementPath(trip.uuid))).toHaveLength(1);
      });
      await waitFor(() => {
        expect(sent('GET /dashboard').length).toBeGreaterThan(dashboardLoads);
      });
    });

    it('does not offer the action without investments', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /dashboard': envelope(buildDashboard()),
      });

      await screen.findByText(i18n.t('dashboard.investments.empty'));

      expect(
        screen.queryByRole('button', {
          name: new RegExp(`${i18n.t('dashboard.investments.contribute')}$`),
        }),
      ).not.toBeInTheDocument();
    });
  });

  it('stretches every card of a row to the height of the row, whatever its content', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(
        buildDashboard({
          expensesByCategory: [],
        }),
      ),
    });

    await screen.findByText(i18n.t('dashboard.expensesByCategory.empty'));

    const rows = document.querySelectorAll<HTMLElement>('.ant-row');
    const rowsOfCards = [...rows].filter((row) =>
      row.querySelector(':scope > .ant-col > .ant-card'),
    );

    expect(rowsOfCards).toHaveLength(2);

    for (const row of rowsOfCards) {
      expect(row).toHaveClass('ant-row-stretch');

      for (const card of row.querySelectorAll<HTMLElement>(
        ':scope > .ant-col > .ant-card',
      )) {
        expect(card).toHaveStyle({ height: '100%' });
      }
    }
  });

  it('shows no daily allowance once the month is over', async () => {
    renderDashboard(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope({
        ...withAccounts,
        spendingGuidance: {
          basis: 'BALANCE',
          remaining: '700.30',
          dailyAllowance: null,
        },
      }),
    });

    const page = await main();
    expect(
      await within(page).findByText(
        i18n.t('dashboard.budget.guidance.noDaysLeft'),
      ),
    ).toBeInTheDocument();
    expect(
      within(page).getByText(i18n.t('dashboard.budget.empty')),
    ).toBeInTheDocument();
  });

  describe('transaction indicators', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
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
      recurrence: null,
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

    const openCreateMenu = async () => {
      fireEvent.click(
        await within(await main()).findByRole('button', {
          name: new RegExp(i18n.t('dashboard.actions.create')),
        }),
      );
    };

    it('leaves page navigation to the sidebar', async () => {
      renderDashboard();

      const page = await main();
      await within(page).findByRole('heading', monthHeading(2026, 10));

      expect(within(page).queryByRole('navigation')).not.toBeInTheDocument();
      expect(
        within(page).queryByRole('link', {
          name: new RegExp(i18n.t('navigation.recurrences')),
        }),
      ).not.toBeInTheDocument();
    });

    it('opens the transaction form from the new menu', async () => {
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

      await openCreateMenu();
      fireEvent.click(
        await screen.findByRole('menuitem', {
          name: new RegExp(i18n.t('dashboard.actions.transaction')),
        }),
      );

      expect(
        await findDialog(i18n.t('transactions.create.title')),
      ).toBeInTheDocument();
    });

    it('opens the card purchase form from the new menu', async () => {
      renderDashboard(AppRoutes.DASHBOARD, {
        'GET /credit-cards': {
          status: 200,
          data: { data: [], meta: { total: 0, page: 1, limit: 50 } },
        },
        'GET /transaction-categories': {
          status: 200,
          data: { data: [], meta: { total: 0, page: 1, limit: 50 } },
        },
      });

      await openCreateMenu();
      fireEvent.click(
        await screen.findByRole('menuitem', {
          name: new RegExp(i18n.t('dashboard.actions.purchase')),
        }),
      );

      expect(
        await findDialog(i18n.t('creditCards.purchases.create.title')),
      ).toBeInTheDocument();
    });
  });

  describe('on a narrow screen', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockImplementation(createMatchMedia(375));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('stacks the header, the month, and the perspective vertically', async () => {
      renderDashboard();

      const page = await main();
      const month = await within(page).findByRole(
        'heading',
        monthHeading(2026, 10),
      );
      const create = within(page).getByRole('button', {
        name: new RegExp(i18n.t('dashboard.actions.create')),
      });
      const perspective = within(page).getByRole('radiogroup', {
        name: i18n.t('preferences.fields.spendingPerspective'),
      });

      const periodRow = month.parentElement?.parentElement;

      expect(create.parentElement).toHaveClass('ant-flex-vertical');
      expect(periodRow).toHaveClass('ant-flex-vertical');
      expect(periodRow).toContainElement(perspective);
    });
  });
});
