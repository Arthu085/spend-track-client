import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Category } from '@/modules/categories/domain/category.schema';
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
import type { Preferences } from '../../domain/preferences.schema';

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

const defaults: Preferences = {
  spendingPerspective: 'PURCHASE_DATE',
  spendingPerspectiveLabel: 'Data da compra',
  defaultMonth: 'CURRENT',
  defaultMonthLabel: 'Mês atual',
  updatedAt: null,
};

const food: Category = {
  uuid: '3a1b2c3d-1111-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Alimentação',
  kind: 'EXPENSE',
  kindLabel: 'Despesa',
  scope: 'GLOBAL',
  scopeLabel: 'Global',
  color: null,
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const pets: Category = {
  ...food,
  uuid: '4b2c3d4e-2222-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Pets',
  scope: 'PERSONAL',
  scopeLabel: 'Pessoal',
  color: '#13C2C2',
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

const renderSettings = (
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
    'GET /preferences': envelope(defaults),
    'GET /categories': listPage([food, pets]),
    ...routes,
  });
  const rendered = renderRoute(AppRoutes.FINANCIAL_SETTINGS);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, sent };
};

// Ant Design gives every generated radio group the same name under test, so the
// native checked state leaks between groups; read the wrapper state instead.
const expectSelected = (radio: HTMLElement, selected: boolean) => {
  const wrapper = radio.closest('label');

  if (selected) {
    expect(wrapper).toHaveClass('ant-radio-wrapper-checked');
  } else {
    expect(wrapper).not.toHaveClass('ant-radio-wrapper-checked');
  }
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

describe('FinancialSettingsPage', () => {
  it('saves a preference as soon as it changes', async () => {
    const { sent } = renderSettings({
      'PATCH /preferences': envelope(
        { ...defaults, defaultMonth: 'NEXT', defaultMonthLabel: 'Próximo mês' },
        'Preferências salvas',
      ),
    });

    const nextMonth = await screen.findByRole('radio', {
      name: i18n.t('preferences.defaultMonths.NEXT'),
    });
    expectSelected(
      screen.getByRole('radio', {
        name: i18n.t('preferences.spendingPerspectives.PURCHASE_DATE'),
      }),
      true,
    );
    expectSelected(nextMonth, false);

    fireEvent.click(nextMonth);

    expect(await screen.findByText('Preferências salvas')).toBeInTheDocument();
    expect(requestBody(sent('PATCH /preferences')[0])).toEqual({
      defaultMonth: 'NEXT',
    });
    await waitFor(() => {
      expectSelected(nextMonth, true);
    });
  });

  it('lists expense categories by default and keeps global ones read-only', async () => {
    const { sent } = renderSettings();

    const globalRow = await findRow(food.uuid);
    const personalRow = await findRow(pets.uuid);
    expect(sent('GET /categories')[0].params).toEqual({
      page: 1,
      limit: 20,
      kind: 'EXPENSE',
      status: 'ACTIVE',
    });
    expect(within(globalRow).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(globalRow).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(personalRow).getByRole('button', {
        name: i18n.t('categories.actions.edit', { name: pets.name }),
      }),
    ).toBeInTheDocument();

    fireEvent.mouseDown(
      within(screen.getByRole('search')).getByLabelText(
        i18n.t('categories.fields.kind'),
      ),
    );
    fireEvent.click(
      await screen.findByTitle(i18n.t('categories.kinds.INCOME')),
    );

    await waitFor(() => {
      expect(sent('GET /categories').at(-1)?.params).toEqual({
        page: 1,
        limit: 20,
        kind: 'INCOME',
        status: 'ACTIVE',
      });
    });
  });

  it('creates a personal category of the selected kind with a default color', async () => {
    const { sent } = renderSettings({
      'POST /categories': envelope(pets, 'Categoria criada'),
    });

    await findRow(food.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('categories.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('categories.create.title'));
    expect(within(dialog).getByText('#1677FF')).toBeInTheDocument();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('categories.fields.name')),
      { target: { value: 'Pets' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('common.save') }),
    );

    expect(await screen.findByText('Categoria criada')).toBeInTheDocument();
    expect(requestBody(sent('POST /categories')[0])).toEqual({
      name: 'Pets',
      kind: 'EXPENSE',
      color: '#1677FF',
    });
  });

  it('saves the picked color as a hex code', async () => {
    const { sent } = renderSettings({
      [`PATCH /categories/${pets.uuid}`]: envelope(
        { ...pets, color: '#1677FF' },
        'Categoria atualizada',
      ),
    });

    const row = await findRow(pets.uuid);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('categories.actions.edit', { name: pets.name }),
      }),
    );
    const dialog = await findDialog(i18n.t('categories.edit.title'));
    const trigger = dialog.querySelector<HTMLElement>(
      '.ant-color-picker-trigger',
    );

    if (!trigger) {
      throw new Error('Color picker not found');
    }

    fireEvent.click(trigger);
    const hexInput = await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.ant-color-picker-hex-input input',
      );

      if (!input) {
        throw new Error('Hex input not found');
      }

      return input;
    });
    fireEvent.change(hexInput, { target: { value: '1677ff' } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('common.save') }),
    );

    expect(await screen.findByText('Categoria atualizada')).toBeInTheDocument();
    expect(requestBody(sent(`PATCH /categories/${pets.uuid}`)[0])).toEqual({
      name: pets.name,
      color: '#1677FF',
    });
  });

  it('deactivates a personal category', async () => {
    const { sent } = renderSettings({
      [`PUT /categories/${pets.uuid}/status`]: envelope(
        { ...pets, status: 'INACTIVE', statusLabel: 'Inativo' },
        'Categoria inativada',
      ),
    });

    const row = await findRow(pets.uuid);
    fireEvent.click(
      within(row).getByRole('switch', {
        name: i18n.t('categories.actions.toggleStatus', { name: pets.name }),
      }),
    );

    expect(await screen.findByText('Categoria inativada')).toBeInTheDocument();
    expect(requestBody(sent(`PUT /categories/${pets.uuid}/status`)[0])).toEqual(
      { status: 'INACTIVE' },
    );
  });

  it('deletes a personal category after confirmation', async () => {
    const { sent } = renderSettings({
      [`DELETE /categories/${pets.uuid}`]: envelope(null, 'Categoria excluída'),
    });

    const globalRow = await findRow(food.uuid);
    expect(
      within(globalRow).queryByRole('button', {
        name: i18n.t('categories.actions.delete', { name: food.name }),
      }),
    ).not.toBeInTheDocument();

    const row = await findRow(pets.uuid);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('categories.actions.delete', { name: pets.name }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    expect(await screen.findByText('Categoria excluída')).toBeInTheDocument();
    expect(sent(`DELETE /categories/${pets.uuid}`)).toHaveLength(1);
  });
});
