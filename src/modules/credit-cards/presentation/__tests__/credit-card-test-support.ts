import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import type { Account } from '@/modules/accounts/domain/account.schema';
import type { Preferences } from '@/modules/preferences/domain/preferences.schema';
import type { TransactionCategory } from '@/modules/transaction-categories/domain/transaction-category.schema';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  csrfResponse,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';

export const sessionUser: UserDetail = {
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

export const nubank: Account = {
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

export const groceries: TransactionCategory = {
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
};

export const preferences: Preferences = {
  spendingPerspective: 'INVOICE_MONTH',
  spendingPerspectiveLabel: 'Mês da fatura',
  defaultMonth: 'CURRENT',
  defaultMonthLabel: 'Mês atual',
  dashboardCardsVisible: true,
  updatedAt: null,
};

export const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

export const listPage = <T>(items: T[]): StubResponse => ({
  status: 200,
  data: { data: items, meta: { total: items.length, page: 1, limit: 20 } },
});

export type StubRoutes = Record<
  string,
  StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
>;

export const renderWithRoutes = (path: string, routes: StubRoutes) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /preferences': envelope(preferences),
    'GET /accounts': listPage([nubank]),
    'GET /transaction-categories': listPage([groceries]),
    ...routes,
  });
  const rendered = renderRoute(path);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, sent };
};

export const findRow = (key: string) =>
  waitFor(() => {
    const row = document.querySelector<HTMLElement>(
      `tr[data-row-key="${key}"]`,
    );

    if (!row) {
      throw new Error('Row not found');
    }

    return row;
  });

export const chooseOption = async (
  container: HTMLElement,
  label: string,
  option: string,
) => {
  fireEvent.mouseDown(within(container).getByLabelText(label));
  fireEvent.click(await screen.findByTitle(option));
};

export const save = (dialog: HTMLElement) => {
  fireEvent.click(
    within(dialog).getByRole('button', { name: i18n.t('common.save') }),
  );
};
