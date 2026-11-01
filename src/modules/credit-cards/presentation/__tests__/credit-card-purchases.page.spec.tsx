import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import { formatMoney } from '@/shared/money/money';
import {
  buildCreditCard,
  buildCreditCardPurchase,
} from '@/test/credit-card-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import {
  chooseOption,
  envelope,
  findRow,
  groceries,
  listPage,
  renderWithRoutes,
  save,
} from './credit-card-test-support';

const visa = buildCreditCard();
const shoes = buildCreditCardPurchase();
const OCTOBER_2026 = `${AppRoutes.CREDIT_CARD_PURCHASES}?year=2026&month=10`;

const money = (amount: string) => formatMoney(amount, i18n.language);

const renderPurchases = (routes = {}) =>
  renderWithRoutes(OCTOBER_2026, {
    'GET /credit-cards': listPage([visa]),
    'GET /credit-card-purchases': listPage([shoes]),
    ...routes,
  });

describe('CreditCardPurchasesPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the month's purchases with their installments", async () => {
    const { sent } = renderPurchases();

    const row = await findRow(shoes.uuid);
    expect(within(row).getByText('Tênis')).toBeInTheDocument();
    expect(within(row).getByText(money('300.00'))).toBeInTheDocument();
    expect(
      within(row).getByText(
        new RegExp(i18n.t('creditCards.installmentsSummary', { count: 3 })),
      ),
    ).toBeInTheDocument();
    expect(sent('GET /credit-card-purchases')[0].params).toEqual({
      page: 1,
      limit: 20,
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('records a purchase in installments on the default card', async () => {
    const { sent } = renderPurchases({
      'POST /credit-card-purchases': envelope(shoes, 'Compra registrada'),
    });

    await findRow(shoes.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('creditCards.purchases.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('creditCards.hints.installments'));
    await waitFor(() => {
      expect(within(dialog).getByTitle(visa.name)).toBeInTheDocument();
    });
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.description')),
      { target: { value: 'Tênis' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.amount')),
      { target: { value: '300' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(
        i18n.t('creditCards.fields.installmentCount'),
      ),
      { target: { value: '3' } },
    );
    await chooseOption(
      dialog,
      i18n.t('creditCards.fields.category'),
      groceries.name,
    );
    save(dialog);

    expect(await screen.findByText('Compra registrada')).toBeInTheDocument();
    expect(requestBody(sent('POST /credit-card-purchases')[0])).toEqual({
      cardUuid: visa.uuid,
      categoryUuid: groceries.uuid,
      description: 'Tênis',
      amount: expect.stringMatching(/^300(\.00?)?$/) as unknown,
      purchaseDate: '2026-10-29',
      installmentCount: 3,
    });
  });

  it('edits only the description, category, and notes', async () => {
    const { sent } = renderPurchases({
      [`PATCH /credit-card-purchases/${shoes.uuid}`]: envelope(
        shoes,
        'Compra atualizada',
      ),
    });

    fireEvent.click(
      within(await findRow(shoes.uuid)).getByRole('button', {
        name: i18n.t('creditCards.actions.editPurchase', {
          description: 'Tênis',
        }),
      }),
    );
    const dialog = await findDialog(i18n.t('creditCards.hints.purchaseLocked'));
    expect(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.amount')),
    ).toBeDisabled();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.description')),
      { target: { value: 'Tênis de corrida' } },
    );
    save(dialog);

    expect(await screen.findByText('Compra atualizada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PATCH /credit-card-purchases/${shoes.uuid}`)[0]),
    ).toEqual({ description: 'Tênis de corrida', notes: null });
  });

  it('refunds part of a purchase', async () => {
    const { sent } = renderPurchases({
      [`POST /credit-card-purchases/${shoes.uuid}/refunds`]: envelope(
        {
          uuid: 'd4e5f6a7-dddd-4c3e-9f1a-1a2b3c4d5e6f',
          purchase: { uuid: shoes.uuid, description: 'Tênis' },
          invoice: shoes.installments[0].invoice,
          amount: '50.00',
          date: '2026-10-29',
          notes: null,
          createdAt: '2026-10-29T15:00:00.000Z',
        },
        'Estorno registrado',
      ),
    });

    fireEvent.click(
      within(await findRow(shoes.uuid)).getByRole('button', {
        name: i18n.t('creditCards.actions.refund', { description: 'Tênis' }),
      }),
    );
    const dialog = await findDialog(i18n.t('creditCards.refund.hint'));
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.amount')),
      { target: { value: '50' } },
    );
    save(dialog);

    expect(await screen.findByText('Estorno registrado')).toBeInTheDocument();
    expect(
      requestBody(sent(`POST /credit-card-purchases/${shoes.uuid}/refunds`)[0]),
    ).toEqual({
      amount: expect.stringMatching(/^50(\.00?)?$/) as unknown,
      date: '2026-10-29',
    });
  });

  it('offers delete only for deletable purchases', async () => {
    renderPurchases({
      'GET /credit-card-purchases': listPage([
        { ...shoes, deletable: false, refundableAmount: '0.00' },
      ]),
    });

    const row = await findRow(shoes.uuid);
    expect(
      within(row).queryByRole('button', {
        name: i18n.t('creditCards.actions.deletePurchase', {
          description: 'Tênis',
        }),
      }),
    ).not.toBeInTheDocument();
    expect(
      within(row).queryByRole('button', {
        name: i18n.t('creditCards.actions.refund', { description: 'Tênis' }),
      }),
    ).not.toBeInTheDocument();
  });
});
