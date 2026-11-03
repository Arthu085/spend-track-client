import { beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { getHttpStatus } from '@/core/http/api-error';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { login } from '@/modules/auth/infra/auth.api';
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
  updateAccountStatus,
} from '@/modules/accounts/infra/accounts.api';
import {
  createTransactionCategory,
  deleteTransactionCategory,
  fetchTransactionCategories,
  updateTransactionCategory,
  updateTransactionCategoryStatus,
} from '@/modules/transaction-categories/infra/transaction-categories.api';
import {
  cancelCreditCardPayment,
  createCreditCard,
  createCreditCardPurchase,
  createCreditCardRefund,
  fetchCreditCardInvoice,
  fetchCreditCardInvoices,
  fetchCreditCardPurchases,
  payCreditCardInvoice,
} from '@/modules/credit-cards/infra/credit-cards.api';
import { fetchDashboard } from '@/modules/dashboard/infra/dashboard.api';
import {
  createTransaction,
  deleteTransaction,
  fetchTransaction,
  fetchTransactions,
  updateTransaction,
  updateTransactionState,
} from '@/modules/transactions/infra/transactions.api';
import {
  fetchPreferences,
  updatePreferences,
} from '@/modules/preferences/infra/preferences.api';
import '../../../test/integration/context';

const expectStatus = async (request: Promise<unknown>, status: number) => {
  await expect(request).rejects.toSatisfy(
    (error: unknown) => getHttpStatus(error) === status,
  );
};

describe('real backend finance contracts', () => {
  const backend = inject('backend');

  beforeAll(async () => {
    await i18n.changeLanguage('en');
    httpClient.defaults.baseURL = backend.baseURL;
    httpClient.defaults.adapter = 'xhr';
  });

  beforeEach(async () => {
    httpClient.clearCsrfToken();
    await login(backend.user);
  });

  it('keeps preferences per user and reflects them on the dashboard', async () => {
    const initial = await fetchPreferences();

    expect(initial.spendingPerspective).toBe('PURCHASE_DATE');

    const updated = await updatePreferences({
      spendingPerspective: 'INVOICE_MONTH',
    });

    expect(updated.data.spendingPerspective).toBe('INVOICE_MONTH');
    expect((await fetchDashboard()).perspective).toBe('INVOICE_MONTH');

    await login(backend.admin);
    expect((await fetchPreferences()).spendingPerspective).toBe(
      'PURCHASE_DATE',
    );

    await login(backend.user);
    await updatePreferences({ spendingPerspective: 'PURCHASE_DATE' });
  });

  it('manages accounts with exact amounts and hides them from other users', async () => {
    const created = await createAccount({
      name: 'Contract checking',
      type: 'CHECKING',
      openingBalance: '1020.80',
      openingBalanceDate: '2026-10-01',
      isDefault: true,
    });

    expect(created.data.openingBalance).toBe('1020.80');
    expect(created.data.isDefault).toBe(true);

    const wallet = await createAccount({
      name: 'Contract wallet',
      type: 'CASH',
      openingBalance: '-20.50',
      openingBalanceDate: '2026-10-01',
      isDefault: false,
    });
    const dashboard = await fetchDashboard({ year: 2030, month: 1 });

    expect(dashboard.period).toMatchObject({
      year: 2030,
      month: 1,
      timing: 'FUTURE',
    });
    expect(dashboard.balances.actual).toBe('1000.30');
    expect(
      (await updateAccount({ uuid: wallet.data.uuid, name: 'Contract cash' }))
        .data.name,
    ).toBe('Contract cash');

    await login(backend.admin);
    expect((await fetchAccounts()).meta.total).toBe(0);
    await expectStatus(deleteAccount(created.data.uuid), 404);

    await login(backend.user);
    expect(
      (
        await updateAccountStatus({
          uuid: created.data.uuid,
          status: 'INACTIVE',
        })
      ).data.isDefault,
    ).toBe(false);
    expect(
      (await fetchAccounts({ status: 'INACTIVE' })).data.map(
        ({ uuid }) => uuid,
      ),
    ).toEqual([created.data.uuid]);
    await deleteAccount(created.data.uuid);
    await deleteAccount(wallet.data.uuid);
    expect((await fetchDashboard()).accounts).toEqual([]);
  });

  it('lists global categories and keeps personal ones private', async () => {
    const globals = await fetchTransactionCategories({
      kind: 'EXPENSE',
      limit: 5,
    });
    const globalTransactionCategory = globals.data.find(
      ({ scope }) => scope === 'GLOBAL',
    );

    expect(globals.data).toHaveLength(5);
    expect(globals.meta).toMatchObject({ page: 1, limit: 5 });
    expect(globals.meta.total).toBeGreaterThanOrEqual(11);

    expect(globalTransactionCategory).toBeDefined();
    if (!globalTransactionCategory) {
      throw new Error('The backend did not seed global categories.');
    }

    await expectStatus(
      updateTransactionCategory({
        uuid: globalTransactionCategory.uuid,
        name: 'Renamed',
      }),
      403,
    );

    const created = await createTransactionCategory({
      name: 'Contract pets',
      kind: 'EXPENSE',
      color: '#13C2C2',
    });

    expect(created.data.scope).toBe('PERSONAL');
    expect(created.data.color).toBe('#13C2C2');

    await login(backend.admin);
    expect(
      (await fetchTransactionCategories({ limit: 50 })).data.some(
        ({ uuid }) => uuid === created.data.uuid,
      ),
    ).toBe(false);
    await expectStatus(
      updateTransactionCategoryStatus({
        uuid: created.data.uuid,
        status: 'INACTIVE',
      }),
      404,
    );

    await login(backend.user);
    expect(
      (
        await updateTransactionCategoryStatus({
          uuid: created.data.uuid,
          status: 'INACTIVE',
        })
      ).data.status,
    ).toBe('INACTIVE');

    expect(
      (await deleteTransactionCategory(created.data.uuid)).data,
    ).toBeNull();
    expect(
      (
        await fetchTransactionCategories({ status: 'INACTIVE', limit: 50 })
      ).data.some(({ uuid }) => uuid === created.data.uuid),
    ).toBe(false);
  });

  it('records transactions that move balances only when completed', async () => {
    const checking = await createAccount({
      name: 'Contract transactions checking',
      type: 'CHECKING',
      openingBalance: '1000.00',
      openingBalanceDate: '2030-01-01',
      isDefault: false,
    });
    const savings = await createAccount({
      name: 'Contract transactions savings',
      type: 'SAVINGS',
      openingBalance: '0.00',
      openingBalanceDate: '2030-01-01',
      isDefault: false,
    });
    const expenseCategory = (
      await fetchTransactionCategories({ kind: 'EXPENSE', limit: 1 })
    ).data[0];
    const month = { year: 2030, month: 1 };
    const balanceOf = async (uuid: string) =>
      (await fetchDashboard(month)).accounts.find(
        (account) => account.uuid === uuid,
      );

    const rent = await createTransaction({
      type: 'EXPENSE',
      description: 'Contract rent',
      amount: '250.40',
      date: '2030-01-10',
      state: 'PLANNED',
      accountUuid: checking.data.uuid,
      categoryUuid: expenseCategory.uuid,
    });

    expect(rent.data).toMatchObject({ state: 'PLANNED', completedOn: null });
    expect(await balanceOf(checking.data.uuid)).toMatchObject({
      actualBalance: '1000.00',
      projectedBalance: '749.60',
    });
    expect((await fetchDashboard(month)).expenses).toEqual({
      total: '250.40',
      completed: '0.00',
      pending: '250.40',
    });

    const completed = await updateTransactionState({
      uuid: rent.data.uuid,
      state: 'COMPLETED',
      completedOn: '2030-01-11',
    });

    expect(completed.data.completedOn).toBe('2030-01-11');
    expect(await balanceOf(checking.data.uuid)).toMatchObject({
      actualBalance: '749.60',
    });
    await expectStatus(
      updateTransaction({ uuid: rent.data.uuid, amount: '1.00' }),
      409,
    );
    await expectStatus(deleteTransaction(rent.data.uuid), 409);

    await createTransaction({
      type: 'TRANSFER',
      description: 'Contract reserve',
      amount: '100.00',
      date: '2030-01-12',
      state: 'COMPLETED',
      accountUuid: checking.data.uuid,
      destinationAccountUuid: savings.data.uuid,
    });

    const dashboard = await fetchDashboard(month);

    expect(dashboard.expenses).toEqual({
      total: '250.40',
      completed: '250.40',
      pending: '0.00',
    });
    expect(dashboard.upcomingCount).toBe(0);
    expect(await balanceOf(savings.data.uuid)).toMatchObject({
      actualBalance: '100.00',
    });
    expect(
      (
        await fetchTransactions({
          from: '2030-01-01',
          to: '2030-01-31',
          accountUuid: savings.data.uuid,
        })
      ).meta.total,
    ).toBe(1);

    await login(backend.admin);
    await expectStatus(fetchTransaction(rent.data.uuid), 404);

    await login(backend.user);
    await expectStatus(deleteAccount(checking.data.uuid), 409);
    expect(
      (
        await updateTransactionState({
          uuid: rent.data.uuid,
          state: 'CANCELED',
        })
      ).data.state,
    ).toBe('CANCELED');
    expect(await balanceOf(checking.data.uuid)).toMatchObject({
      actualBalance: '900.00',
    });

    for (const { uuid } of [checking.data, savings.data]) {
      await updateAccountStatus({ uuid, status: 'INACTIVE' });
    }
  });
  it('records card purchases on invoices and pays them from an account', async () => {
    const checking = await createAccount({
      name: 'Contract card payer',
      type: 'CHECKING',
      openingBalance: '1000.00',
      openingBalanceDate: '2031-01-01',
      isDefault: false,
    });
    const expenseCategory = (
      await fetchTransactionCategories({ kind: 'EXPENSE', limit: 1 })
    ).data[0];
    const card = await createCreditCard({
      name: 'Contract card',
      creditLimit: '5000.00',
      closingDay: 5,
      dueDay: 12,
      isDefault: false,
    });

    const purchase = await createCreditCardPurchase({
      cardUuid: card.data.uuid,
      categoryUuid: expenseCategory.uuid,
      description: 'Contract shoes',
      amount: '100.00',
      purchaseDate: '2031-10-29',
      installmentCount: 3,
    });

    expect(
      purchase.data.installments.map(({ amount, invoice }) => [
        amount,
        invoice.referenceMonth,
      ]),
    ).toEqual([
      ['33.34', '2031-11-01'],
      ['33.33', '2031-12-01'],
      ['33.33', '2032-01-01'],
    ]);
    expect(
      (
        await fetchCreditCardPurchases({
          cardUuid: card.data.uuid,
          from: '2031-10-01',
          to: '2031-10-31',
        })
      ).meta.total,
    ).toBe(1);
    expect(
      (await fetchCreditCardInvoices(card.data.uuid)).data.map(
        ({ total }) => total,
      ),
    ).toEqual(['33.33', '33.33', '33.34']);

    const november = purchase.data.installments[0].invoice;

    expect(
      (await fetchDashboard({ year: 2031, month: 10 })).expenses.total,
    ).toBe('33.34');
    await updatePreferences({ spendingPerspective: 'INVOICE_MONTH' });
    expect(
      (await fetchDashboard({ year: 2031, month: 11 })).creditCards,
    ).toMatchObject({ spending: '33.34' });
    await updatePreferences({ spendingPerspective: 'PURCHASE_DATE' });

    await expectStatus(
      payCreditCardInvoice({
        invoiceUuid: november.uuid,
        accountUuid: checking.data.uuid,
        amount: '33.35',
        paidOn: '2031-11-12',
      }),
      422,
    );

    const payment = await payCreditCardInvoice({
      invoiceUuid: november.uuid,
      accountUuid: checking.data.uuid,
      amount: '33.34',
      paidOn: '2031-11-12',
    });
    const paid = await fetchCreditCardInvoice(november.uuid);

    expect(paid).toMatchObject({ outstanding: '0.00', status: 'OPEN' });
    expect(paid.chargeEntries[0]).toMatchObject({
      installmentNumber: 1,
      installmentCount: 3,
    });

    const refund = await createCreditCardRefund({
      purchaseUuid: purchase.data.uuid,
      amount: '10.00',
      date: '2031-11-20',
    });

    expect(refund.data.invoice.referenceMonth).toBe('2031-12-01');
    expect(
      (
        await cancelCreditCardPayment({
          invoiceUuid: november.uuid,
          paymentUuid: payment.data.uuid,
        })
      ).data.canceledAt,
    ).not.toBeNull();

    await login(backend.admin);
    await expectStatus(fetchCreditCardInvoice(november.uuid), 404);

    await login(backend.user);
    await updateAccountStatus({ uuid: checking.data.uuid, status: 'INACTIVE' });
  });
});
