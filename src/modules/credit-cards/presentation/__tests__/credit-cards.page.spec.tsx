import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes, creditCardInvoicesPath } from '@/core/router/app-routes';
import { formatMonthLabel } from '@/shared/date/month-ref';
import { formatMoney } from '@/shared/money/money';
import {
  buildCreditCard,
  buildCreditCardInvoice,
  buildCreditCardInvoiceDetail,
} from '@/test/credit-card-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import {
  envelope,
  findRow,
  listPage,
  nubank,
  renderWithRoutes,
  save,
} from './credit-card-test-support';

const visa = buildCreditCard({ creditBalance: '25.00' });
const invoice = buildCreditCardInvoice({
  status: 'CLOSED',
  statusLabel: 'Fechada',
});
const invoiceDetail = buildCreditCardInvoiceDetail({
  status: 'CLOSED',
  statusLabel: 'Fechada',
  paid: '100.00',
  outstanding: '200.00',
  payments: [
    {
      uuid: 'c3d4e5f6-cccc-4c3e-9f1a-1a2b3c4d5e6f',
      invoice: {
        uuid: invoice.uuid,
        referenceMonth: invoice.referenceMonth,
        closingDate: invoice.closingDate,
        dueDate: invoice.dueDate,
      },
      account: { uuid: nubank.uuid, name: nubank.name, status: 'ACTIVE' },
      amount: '100.00',
      paidOn: '2026-11-06',
      canceledAt: null,
      createdAt: '2026-11-06T12:00:00.000Z',
    },
  ],
});

const money = (amount: string) => formatMoney(amount, i18n.language);
const november = () =>
  formatMonthLabel({ year: 2026, month: 11 }, i18n.language);

describe('CreditCardsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-08T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists active cards with their billing cycle, limits, and credit', async () => {
    const { sent } = renderWithRoutes(AppRoutes.CREDIT_CARDS, {
      'GET /credit-cards': listPage([visa]),
    });

    const row = await findRow(visa.uuid);
    expect(within(row).getByText('Visa')).toBeInTheDocument();
    expect(
      within(row).getByText(i18n.t('creditCards.default')),
    ).toBeInTheDocument();
    expect(
      within(row).getByText(
        i18n.t('creditCards.billingDays', { closingDay: 5, dueDay: 12 }),
      ),
    ).toBeInTheDocument();
    expect(within(row).getByText(money('4700.00'))).toBeInTheDocument();
    expect(within(row).getByText(money('25.00'))).toBeInTheDocument();
    expect(sent('GET /credit-cards')[0].params).toEqual({
      page: 1,
      limit: 20,
      status: 'ACTIVE',
    });
  });

  it('creates a card with its billing days', async () => {
    const { sent } = renderWithRoutes(AppRoutes.CREDIT_CARDS, {
      'GET /credit-cards': listPage([visa]),
      'POST /credit-cards': envelope(visa, 'Cartão criado'),
    });

    await findRow(visa.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('creditCards.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('creditCards.hints.billingDays'));
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.name')),
      { target: { value: 'Master' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.creditLimit')),
      { target: { value: '1500' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.closingDay')),
      { target: { value: '28' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.dueDay')),
      { target: { value: '5' } },
    );
    save(dialog);

    expect(await screen.findByText('Cartão criado')).toBeInTheDocument();
    expect(requestBody(sent('POST /credit-cards')[0])).toEqual({
      name: 'Master',
      creditLimit: expect.stringMatching(/^1500(\.00?)?$/) as unknown,
      closingDay: 28,
      dueDay: 5,
      isDefault: false,
    });
  });

  it('opens the invoices of a card and shows one with its charges and payments', async () => {
    const { router } = renderWithRoutes(AppRoutes.CREDIT_CARDS, {
      'GET /credit-cards': listPage([visa]),
      [`GET /credit-cards/${visa.uuid}/invoices`]: listPage([invoice]),
      [`GET /credit-card-invoices/${invoice.uuid}`]: envelope(invoiceDetail),
    });

    const row = await findRow(visa.uuid);
    fireEvent.click(
      within(row).getByRole('link', {
        name: i18n.t('creditCards.actions.invoices', { name: 'Visa' }),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        creditCardInvoicesPath(visa.uuid),
      );
    });
    expect(
      await screen.findByRole('heading', {
        name: i18n.t('creditCards.invoices.titleOf', { name: 'Visa' }),
      }),
    ).toBeInTheDocument();
    const invoiceRow = await findRow(invoice.uuid);
    expect(within(invoiceRow).getByText('Fechada')).toBeInTheDocument();

    fireEvent.click(
      within(invoiceRow).getByRole('button', {
        name: i18n.t('creditCards.actions.viewInvoice', { month: november() }),
      }),
    );

    const dialog = await findDialog(i18n.t('creditCards.invoice.payments'));
    expect(within(dialog).getByText(/Tênis/)).toBeInTheDocument();
    expect(within(dialog).getByText(/\(1\/3\)/)).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.outstanding')),
    ).toHaveTextContent(money('200.00'));
  });

  it('pays part of an invoice from an account and cancels a payment', async () => {
    const { sent } = renderWithRoutes(creditCardInvoicesPath(visa.uuid), {
      [`GET /credit-cards/${visa.uuid}/invoices`]: listPage([invoice]),
      [`GET /credit-card-invoices/${invoice.uuid}`]: envelope(invoiceDetail),
      [`POST /credit-card-invoices/${invoice.uuid}/payments`]: envelope(
        invoiceDetail.payments[0],
        'Pagamento registrado',
      ),
      [`PUT /credit-card-invoices/${invoice.uuid}/payments/${invoiceDetail.payments[0].uuid}/cancellation`]:
        envelope(
          { ...invoiceDetail.payments[0], canceledAt: '2026-11-08T15:00:00Z' },
          'Pagamento cancelado',
        ),
    });

    fireEvent.click(
      within(await findRow(invoice.uuid)).getByRole('button', {
        name: i18n.t('creditCards.actions.viewInvoice', { month: november() }),
      }),
    );
    const dialog = await findDialog(i18n.t('creditCards.invoice.payments'));

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: new RegExp(i18n.t('creditCards.pay.title')),
      }),
    );
    const payDialog = await findDialog(i18n.t('creditCards.pay.hint'));
    expect(await within(payDialog).findByText(nubank.name)).toBeInTheDocument();
    fireEvent.change(
      within(payDialog).getByLabelText(i18n.t('creditCards.fields.amount')),
      { target: { value: '50' } },
    );
    save(payDialog);

    expect(await screen.findByText('Pagamento registrado')).toBeInTheDocument();
    expect(
      requestBody(
        sent(`POST /credit-card-invoices/${invoice.uuid}/payments`)[0],
      ),
    ).toEqual({
      accountUuid: nubank.uuid,
      amount: expect.stringMatching(/^50(\.00?)?$/) as unknown,
      paidOn: '2026-11-08',
    });

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('creditCards.actions.cancelPayment', { amount: '100.00' }),
      }),
    );
    const confirm = await findDialog(
      i18n.t('creditCards.cancelPayment.description'),
    );
    fireEvent.click(
      within(confirm).getByRole('button', {
        name: i18n.t('creditCards.cancelPayment.confirm'),
      }),
    );

    expect(await screen.findByText('Pagamento cancelado')).toBeInTheDocument();
  });
});
