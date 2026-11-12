import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  envelope,
  renderWithRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { formatDateOnly } from '@/shared/date/date-only';
import { formatMonthLabel } from '@/shared/date/month-ref';
import { formatMoney } from '@/shared/money/money';
import {
  buildCreditCardInvoice,
  buildCreditCardInvoiceDetail,
} from '@/test/credit-card-fixture';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import { createMatchMedia } from '@/test/match-media';

const money = (amount: string) => formatMoney(amount, i18n.language);

const invoice = buildCreditCardInvoice();

const account = {
  uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Nubank',
  status: 'ACTIVE' as const,
};

const dashboard = buildDashboard({
  accounts: [
    {
      ...account,
      type: 'CHECKING',
      typeLabel: 'Conta corrente',
      isDefault: true,
      actualBalance: '1020.80',
      projectedBalance: '720.80',
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
  ],
  upcomingCount: 1,
  creditCards: {
    ...buildDashboard().creditCards,
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
    ],
    plannedChargesCount: 1,
  },
  investments: {
    ...buildDashboard().investments,
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
});

const renderDashboard = () =>
  renderWithRoutes(AppRoutes.DASHBOARD, {
    'GET /dashboard': envelope(dashboard),
    [`GET /credit-card-invoices/${invoice.uuid}`]: envelope(
      buildCreditCardInvoiceDetail(),
    ),
  });

const rowOf = async (text: string) => {
  const item = (await screen.findByText(text)).closest('li');

  if (!item) {
    throw new Error('Row not found');
  }

  return item;
};

const viewInvoiceLabel = () =>
  i18n.t('creditCards.actions.viewInvoiceOf', {
    card: 'Visa',
    month: formatMonthLabel({ year: 2026, month: 11 }, i18n.language),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Dashboard lists on narrow screens', () => {
  const stubNarrowScreen = () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(createMatchMedia(360));
  };

  it('shows compact rows instead of tables', async () => {
    stubNarrowScreen();
    renderDashboard();

    const upcoming = await rowOf('Aluguel');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(upcoming).getByText('Moradia')).toBeInTheDocument();
    expect(within(upcoming).getByText(money('-300.00'))).toBeInTheDocument();
    expect(
      within(upcoming).getByText(i18n.t('transactions.overdue')),
    ).toBeInTheDocument();
    expect(
      within(upcoming).getByRole('button', {
        name: i18n.t('transactions.actions.complete', {
          description: 'Aluguel',
        }),
      }),
    ).toBeInTheDocument();

    const charge = await rowOf('Netflix');
    expect(within(charge).getByText(money('55.90'))).toBeInTheDocument();
    expect(
      within(charge).getByText(i18n.t('transactions.overdue')),
    ).toBeInTheDocument();

    const investment = await rowOf('Viagem');
    expect(within(investment).getByText(money('1500.00'))).toBeInTheDocument();
    expect(
      within(investment).getByRole('button', {
        name: i18n.t('investments.actions.contribute', { name: 'Viagem' }),
      }),
    ).toBeInTheDocument();

    const nubank = (await screen.findByText('Conta corrente')).closest('li');
    expect(nubank).not.toBeNull();
    expect(
      within(nubank!).getByText(i18n.t('dashboard.balances.projected')),
    ).toBeInTheDocument();
    expect(within(nubank!).getByText(money('720.80'))).toBeInTheDocument();
  });

  it('opens the invoice from its compact row', async () => {
    stubNarrowScreen();
    renderDashboard();

    const row = (
      await screen.findByRole('button', { name: viewInvoiceLabel() })
    ).closest('li');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Aberta')).toBeInTheDocument();
    expect(within(row!).getByText(money('300.00'))).toBeInTheDocument();
    expect(
      within(row!).getByText(
        i18n.t('dashboard.creditCards.dueOn', {
          date: formatDateOnly(invoice.dueDate, i18n.language),
        }),
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(row!).getByRole('button', { name: viewInvoiceLabel() }),
    );

    const dialog = await findDialog(i18n.t('creditCards.invoice.charges'));
    expect(within(dialog).getByText(/Tênis/)).toBeInTheDocument();
  });

  it('keeps the tables on wide screens', async () => {
    renderDashboard();

    await screen.findByText('Aluguel');
    expect(screen.getAllByRole('table')).toHaveLength(5);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
