import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Account } from '@/modules/accounts/domain/account.schema';
import type { Preferences } from '@/modules/preferences/domain/preferences.schema';
import type { TransactionCategory } from '@/modules/transaction-categories/domain/transaction-category.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { findDialog } from '@/test/find-dialog';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';
import type { Transaction } from '../../domain/transaction.schema';

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

const buildAccount = (overrides: Partial<Account>): Account => ({
  uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Nubank',
  type: 'CHECKING',
  typeLabel: 'Conta corrente',
  openingBalance: '0.00',
  openingBalanceDate: '2026-10-01',
  currentBalance: '0.00',
  isDefault: false,
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

const wallet = buildAccount({
  uuid: '2c1f8e7f-2222-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Carteira',
  type: 'CASH',
});
const nubank = buildAccount({ isDefault: true });

const buildCategory = (
  overrides: Partial<TransactionCategory>,
): TransactionCategory => ({
  uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Mercado',
  kind: 'EXPENSE',
  kindLabel: 'Despesa',
  scope: 'GLOBAL',
  scopeLabel: 'Global',
  color: '#52C41A',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

const groceries = buildCategory({});
const salary = buildCategory({
  uuid: '4e3b0a91-4444-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Salário',
  kind: 'INCOME',
  kindLabel: 'Receita',
});

const rent: Transaction = {
  uuid: '5f4c1b02-5555-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'EXPENSE',
  typeLabel: 'Despesa',
  description: 'Aluguel',
  amount: '1500.00',
  date: '2026-10-05',
  state: 'PLANNED',
  stateLabel: 'Prevista',
  completedOn: null,
  canceledAt: null,
  account: { uuid: nubank.uuid, name: nubank.name, status: 'ACTIVE' },
  destinationAccount: null,
  category: {
    uuid: groceries.uuid,
    name: groceries.name,
    kind: 'EXPENSE',
    color: groceries.color,
    status: 'ACTIVE',
  },
  notes: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const paycheck: Transaction = {
  ...rent,
  uuid: '6a5d2c13-6666-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'INCOME',
  typeLabel: 'Receita',
  description: 'Salário',
  amount: '5000.00',
  date: '2026-10-01',
  state: 'COMPLETED',
  stateLabel: 'Realizada',
  completedOn: '2026-10-01',
  category: {
    uuid: salary.uuid,
    name: salary.name,
    kind: 'INCOME',
    color: null,
    status: 'ACTIVE',
  },
};

const preferences: Preferences = {
  spendingPerspective: 'PURCHASE_DATE',
  spendingPerspectiveLabel: 'Data da compra',
  defaultMonth: 'CURRENT',
  defaultMonthLabel: 'Mês atual',
  updatedAt: null,
};

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const listPage = <T,>(items: T[]): StubResponse => ({
  status: 200,
  data: { data: items, meta: { total: items.length, page: 1, limit: 20 } },
});

const categoriesOf = ({ params }: InternalAxiosRequestConfig) => {
  const { kind } = (params ?? {}) as { kind?: string };

  return listPage(
    [groceries, salary].filter((category) => !kind || category.kind === kind),
  );
};

const OCTOBER_2026 = `${AppRoutes.TRANSACTIONS}?year=2026&month=10`;

const renderTransactions = (
  routes: Record<
    string,
    StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
  > = {},
  path: string = OCTOBER_2026,
) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /preferences': envelope(preferences),
    'GET /accounts': listPage([nubank, wallet]),
    'GET /transaction-categories': categoriesOf,
    'GET /transactions': listPage([rent, paycheck]),
    ...routes,
  });
  const rendered = renderRoute(path);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, sent };
};

const findRow = (uuid: string) =>
  waitFor(() => {
    const row = document.querySelector<HTMLElement>(
      `tr[data-row-key="${uuid}"]`,
    );

    if (!row) {
      throw new Error('Row not found');
    }

    return row;
  });

const openCreateDialog = async () => {
  await findRow(rent.uuid);
  fireEvent.click(
    screen.getByRole('button', {
      name: new RegExp(i18n.t('transactions.create.title')),
    }),
  );

  return findDialog(i18n.t('transactions.create.title'));
};

const chooseOption = async (
  container: HTMLElement,
  label: string,
  option: string,
) => {
  fireEvent.mouseDown(within(container).getByLabelText(label));
  fireEvent.click(await screen.findByTitle(option));
};

const save = (dialog: HTMLElement) => {
  fireEvent.click(
    within(dialog).getByRole('button', { name: i18n.t('common.save') }),
  );
};

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the month's transactions and moves between months", async () => {
    const { router, sent } = renderTransactions();

    const rentRow = await findRow(rent.uuid);
    expect(within(rentRow).getByText('Aluguel')).toBeInTheDocument();
    expect(
      within(rentRow).getByText(i18n.t('transactions.overdue')),
    ).toBeInTheDocument();
    expect(
      within(await findRow(paycheck.uuid)).queryByText(
        i18n.t('transactions.overdue'),
      ),
    ).not.toBeInTheDocument();
    expect(sent('GET /transactions')[0].params).toEqual({
      page: 1,
      limit: 20,
      from: '2026-10-01',
      to: '2026-10-31',
    });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('month.next') }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?year=2026&month=11');
    });
    await waitFor(() => {
      expect(sent('GET /transactions').at(-1)?.params).toEqual({
        page: 1,
        limit: 20,
        from: '2026-11-01',
        to: '2026-11-30',
      });
    });
  });

  it.each([
    ['CURRENT', '2026-10-01', '2026-10-31'],
    ['NEXT', '2026-11-01', '2026-11-30'],
  ] as const)(
    'opens on the %s month of the preferences without a month in the URL',
    async (defaultMonth, from, to) => {
      const { sent } = renderTransactions(
        { 'GET /preferences': envelope({ ...preferences, defaultMonth }) },
        AppRoutes.TRANSACTIONS,
      );

      await findRow(rent.uuid);
      expect(sent('GET /transactions')).toHaveLength(1);
      expect(sent('GET /transactions')[0].params).toEqual({
        page: 1,
        limit: 20,
        from,
        to,
      });
    },
  );

  it('ignores malformed filters in the URL', async () => {
    const { sent } = renderTransactions(
      {},
      `${OCTOBER_2026}&accountUuid=not-a-uuid&categoryUuid=${groceries.uuid}&description=${'a'.repeat(151)}`,
    );

    await findRow(rent.uuid);
    expect(sent('GET /transactions')[0].params).toEqual({
      page: 1,
      limit: 20,
      from: '2026-10-01',
      to: '2026-10-31',
      categoryUuid: groceries.uuid,
    });
  });

  it('filters the month by type', async () => {
    const { router, sent } = renderTransactions();

    await findRow(rent.uuid);
    await chooseOption(
      screen.getByRole('search'),
      i18n.t('transactions.fields.type'),
      i18n.t('transactions.types.EXPENSE'),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?year=2026&month=10&type=EXPENSE',
      );
    });
    await waitFor(() => {
      expect(sent('GET /transactions').at(-1)?.params).toMatchObject({
        from: '2026-10-01',
        type: 'EXPENSE',
      });
    });
  });

  it('creates a planned expense from the default account', async () => {
    const { sent } = renderTransactions({
      'POST /transactions': envelope(rent, 'Transação criada'),
    });

    const dialog = await openCreateDialog();
    expect(await within(dialog).findByText(nubank.name)).toBeInTheDocument();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('transactions.fields.description')),
      { target: { value: 'Mercado' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('transactions.fields.amount')),
      { target: { value: '250.4' } },
    );
    await chooseOption(
      dialog,
      i18n.t('transactions.fields.category'),
      groceries.name,
    );
    save(dialog);

    expect(await screen.findByText('Transação criada')).toBeInTheDocument();
    expect(requestBody(sent('POST /transactions')[0])).toEqual({
      type: 'EXPENSE',
      description: 'Mercado',
      amount: expect.stringMatching(/^250\.40?$/) as unknown,
      date: '2026-10-29',
      state: 'PLANNED',
      accountUuid: nubank.uuid,
      categoryUuid: groceries.uuid,
    });
    await waitFor(() => {
      expect(sent('GET /transactions')).toHaveLength(2);
    });
  });

  it('shows the fields of each transaction type', async () => {
    const { sent } = renderTransactions({
      'POST /transactions': envelope(rent, 'Transação criada'),
    });

    const dialog = await openCreateDialog();
    expect(
      within(dialog).getByLabelText(
        i18n.t('transactions.accountLabels.EXPENSE'),
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('transactions.types.INCOME'),
      }),
    );
    expect(
      await within(dialog).findByLabelText(
        i18n.t('transactions.accountLabels.INCOME'),
      ),
    ).toBeInTheDocument();
    fireEvent.mouseDown(
      within(dialog).getByLabelText(i18n.t('transactions.fields.category')),
    );
    expect(await screen.findByTitle(salary.name)).toBeInTheDocument();
    expect(screen.queryByTitle(groceries.name)).not.toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('transactions.types.TRANSFER'),
      }),
    );
    await waitFor(() => {
      expect(
        within(dialog).queryByLabelText(i18n.t('transactions.fields.category')),
      ).not.toBeInTheDocument();
    });
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('transactions.fields.description')),
      { target: { value: 'Reserva' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('transactions.fields.amount')),
      { target: { value: '100' } },
    );
    await chooseOption(
      dialog,
      i18n.t('transactions.fields.destinationAccount'),
      wallet.name,
    );
    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('transactions.states.COMPLETED'),
      }),
    );
    expect(
      await within(dialog).findByLabelText(
        i18n.t('transactions.fields.completedOn'),
      ),
    ).toBeInTheDocument();
    save(dialog);

    await screen.findByText('Transação criada');
    expect(requestBody(sent('POST /transactions')[0])).toEqual({
      type: 'TRANSFER',
      description: 'Reserva',
      amount: expect.stringMatching(/^100(\.00)?$/) as unknown,
      date: '2026-10-29',
      state: 'COMPLETED',
      accountUuid: nubank.uuid,
      destinationAccountUuid: wallet.uuid,
    });
  });

  it('marks a planned transaction as completed on today by default', async () => {
    const { sent } = renderTransactions({
      [`PUT /transactions/${rent.uuid}/state`]: envelope(
        { ...rent, state: 'COMPLETED', completedOn: '2026-10-29' },
        'Transação realizada',
      ),
    });

    const row = await findRow(rent.uuid);
    expect(
      within(await findRow(paycheck.uuid)).queryByRole('button', {
        name: i18n.t('transactions.actions.complete', {
          description: paycheck.description,
        }),
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('transactions.actions.complete', {
          description: rent.description,
        }),
      }),
    );
    save(await findDialog(i18n.t('transactions.complete.title')));

    expect(await screen.findByText('Transação realizada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PUT /transactions/${rent.uuid}/state`)[0]),
    ).toEqual({ state: 'COMPLETED', completedOn: '2026-10-29' });
  });

  it('cancels a transaction after a warning', async () => {
    const { sent } = renderTransactions({
      [`PUT /transactions/${paycheck.uuid}/state`]: envelope(
        { ...paycheck, state: 'CANCELED' },
        'Transação cancelada',
      ),
    });

    const row = await findRow(paycheck.uuid);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('transactions.actions.cancel', {
          description: paycheck.description,
        }),
      }),
    );
    const warning = await findDialog(i18n.t('transactions.cancel.title'));
    fireEvent.click(
      within(warning).getByRole('button', {
        name: i18n.t('transactions.cancel.confirm'),
      }),
    );

    expect(await screen.findByText('Transação cancelada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PUT /transactions/${paycheck.uuid}/state`)[0]),
    ).toEqual({ state: 'CANCELED' });
  });

  it('edits only the description, category, and notes of a completed transaction', async () => {
    const { sent } = renderTransactions({
      [`PATCH /transactions/${paycheck.uuid}`]: envelope(
        paycheck,
        'Transação atualizada',
      ),
    });

    const row = await findRow(paycheck.uuid);
    expect(
      within(row).queryByRole('button', {
        name: i18n.t('transactions.actions.delete', {
          description: paycheck.description,
        }),
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('transactions.actions.edit', {
          description: paycheck.description,
        }),
      }),
    );
    const dialog = await findDialog(i18n.t('transactions.edit.title'));
    expect(
      within(dialog).getByText(i18n.t('transactions.hints.completedLocked')),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(i18n.t('transactions.fields.amount')),
    ).toBeDisabled();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('transactions.fields.notes')),
      { target: { value: 'Bônus incluído' } },
    );
    save(dialog);

    expect(await screen.findByText('Transação atualizada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PATCH /transactions/${paycheck.uuid}`)[0]),
    ).toEqual({ description: 'Salário', notes: 'Bônus incluído' });
  });
});
