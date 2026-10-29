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
  createCategory,
  fetchCategories,
  updateCategory,
  updateCategoryStatus,
} from '@/modules/categories/infra/categories.api';
import { fetchDashboard } from '@/modules/dashboard/infra/dashboard.api';
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
    expect(await fetchAccounts()).toEqual([]);
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
      (await fetchAccounts({ status: 'INACTIVE' })).map(({ uuid }) => uuid),
    ).toEqual([created.data.uuid]);
    await deleteAccount(created.data.uuid);
    await deleteAccount(wallet.data.uuid);
    expect((await fetchDashboard()).accounts).toEqual([]);
  });

  it('lists global categories and keeps personal ones private', async () => {
    const globals = await fetchCategories({ kind: 'EXPENSE' });
    const globalCategory = globals.find(({ scope }) => scope === 'GLOBAL');

    expect(globalCategory).toBeDefined();
    if (!globalCategory) {
      throw new Error('The backend did not seed global categories.');
    }

    await expectStatus(
      updateCategory({ uuid: globalCategory.uuid, name: 'Renamed' }),
      403,
    );

    const created = await createCategory({
      name: 'Contract pets',
      kind: 'EXPENSE',
      color: '#13C2C2',
    });

    expect(created.data.scope).toBe('PERSONAL');
    expect(created.data.color).toBe('#13C2C2');

    await login(backend.admin);
    expect(
      (await fetchCategories()).some(({ uuid }) => uuid === created.data.uuid),
    ).toBe(false);
    await expectStatus(
      updateCategoryStatus({ uuid: created.data.uuid, status: 'INACTIVE' }),
      404,
    );

    await login(backend.user);
    expect(
      (
        await updateCategoryStatus({
          uuid: created.data.uuid,
          status: 'INACTIVE',
        })
      ).data.status,
    ).toBe('INACTIVE');
  });
});
