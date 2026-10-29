import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
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
import type { Account } from '../../domain/account.schema';

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

const checking: Account = {
  uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Nubank',
  type: 'CHECKING',
  typeLabel: 'Conta corrente',
  openingBalance: '1020.80',
  openingBalanceDate: '2026-10-01',
  currentBalance: '1020.80',
  isDefault: true,
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const listPage = <T,>(
  items: T[],
  page = 1,
  total = items.length,
): StubResponse => ({
  status: 200,
  data: { data: items, meta: { total, page, limit: 20 } },
});

const renderAccounts = (
  routes: Record<
    string,
    StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
  > = {},
  path: string = AppRoutes.ACCOUNTS,
) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([]),
    'GET /accounts': listPage([checking]),
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

describe('AccountsPage', () => {
  it('lists active accounts by default and inactive ones through the status filter', async () => {
    const { router, sent } = renderAccounts();

    const row = await findRow(checking.uuid);
    expect(within(row).getByText(checking.typeLabel)).toBeInTheDocument();
    expect(
      within(row).getByText(i18n.t('accounts.default')),
    ).toBeInTheDocument();
    expect(sent('GET /accounts')[0].params).toEqual({
      page: 1,
      limit: 20,
      status: 'ACTIVE',
    });

    fireEvent.mouseDown(
      within(screen.getByRole('search')).getByLabelText(
        i18n.t('accounts.fields.status'),
      ),
    );
    fireEvent.click(await screen.findByTitle(i18n.t('recordStatus.INACTIVE')));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=INACTIVE');
    });
    await waitFor(() => {
      expect(sent('GET /accounts').at(-1)?.params).toEqual({
        page: 1,
        limit: 20,
        status: 'INACTIVE',
      });
    });
  });

  it('creates an account with an exact decimal opening balance', async () => {
    const { sent } = renderAccounts({
      'POST /accounts': envelope(checking, 'Conta criada'),
    });

    await findRow(checking.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('accounts.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('accounts.create.title'));
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('accounts.fields.name')),
      { target: { value: 'Nubank' } },
    );
    fireEvent.mouseDown(
      within(dialog).getByLabelText(i18n.t('accounts.fields.type')),
    );
    fireEvent.click(
      await screen.findByTitle(i18n.t('accounts.types.CHECKING')),
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('accounts.fields.openingBalance')),
      { target: { value: '1020.8' } },
    );
    fireEvent.click(
      within(dialog).getByLabelText(i18n.t('accounts.fields.isDefault')),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('common.save') }),
    );

    expect(await screen.findByText('Conta criada')).toBeInTheDocument();
    expect(requestBody(sent('POST /accounts')[0])).toEqual({
      name: 'Nubank',
      type: 'CHECKING',
      openingBalance: expect.stringMatching(/^1020\.80?$/) as unknown,
      openingBalanceDate: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}$/,
      ) as unknown,
      isDefault: true,
    });
    await waitFor(() => {
      expect(sent('GET /accounts')).toHaveLength(2);
    });
  });

  it('deactivates an account and shows the API message', async () => {
    const { sent } = renderAccounts({
      [`PUT /accounts/${checking.uuid}/status`]: envelope(
        { ...checking, status: 'INACTIVE', isDefault: false },
        'Conta inativada',
      ),
    });

    const row = await findRow(checking.uuid);
    fireEvent.click(
      within(row).getByRole('switch', {
        name: i18n.t('accounts.actions.toggleStatus', { name: checking.name }),
      }),
    );

    expect(await screen.findByText('Conta inativada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PUT /accounts/${checking.uuid}/status`)[0]),
    ).toEqual({ status: 'INACTIVE' });
  });

  it('deletes an account after confirmation', async () => {
    const { sent } = renderAccounts({
      [`DELETE /accounts/${checking.uuid}`]: envelope(null, 'Conta excluída'),
    });

    const row = await findRow(checking.uuid);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('accounts.actions.delete', { name: checking.name }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    expect(await screen.findByText('Conta excluída')).toBeInTheDocument();
    expect(sent(`DELETE /accounts/${checking.uuid}`)).toHaveLength(1);
  });

  it('pages through accounts and leaves a page its delete emptied', async () => {
    const { router, sent } = renderAccounts(
      {
        'GET /accounts': listPage([checking], 2, 21),
        [`DELETE /accounts/${checking.uuid}`]: envelope(null, 'Conta excluída'),
      },
      `${AppRoutes.ACCOUNTS}?page=2`,
    );

    const row = await findRow(checking.uuid);
    expect(sent('GET /accounts')[0].params).toEqual({
      page: 2,
      limit: 20,
      status: 'ACTIVE',
    });
    expect(
      screen.getByText(i18n.t('list.total', { count: 21 })),
    ).toBeInTheDocument();

    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('accounts.actions.delete', { name: checking.name }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
  });

  it('shows the API error when an account cannot be found', async () => {
    renderAccounts({
      [`PUT /accounts/${checking.uuid}/status`]: {
        status: 404,
        data: { statusCode: 404, message: 'Conta não encontrada' },
      },
    });

    const row = await findRow(checking.uuid);
    fireEvent.click(
      within(row).getByRole('switch', {
        name: i18n.t('accounts.actions.toggleStatus', { name: checking.name }),
      }),
    );

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Conta não encontrada',
    );
  });
});
