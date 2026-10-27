import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { Ability } from '@/modules/authorization/domain/ability.schema';
import type { Role } from '@/modules/authorization/domain/role.schema';
import type { UserDetail, UserListItem } from '../../domain/user.schema';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { findDialog } from '@/test/find-dialog';
import { renderRoute } from '@/test/render-route';

const adminRole: Role = {
  uuid: '0b7f8f0e-5d2a-4c3e-9f1a-1a2b3c4d5e6f',
  role: 'ADMIN',
  roleLabel: 'Administrador',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
};

const userRole: Role = {
  uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  role: 'USER',
  roleLabel: 'Usuário',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
};

const sessionUser: UserDetail = {
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  roles: [adminRole],
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const grace: UserListItem = {
  uuid: '9b2d3c4e-1f0a-4b5c-8d7e-6f5a4b3c2d1e',
  name: 'Grace Hopper',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  roles: [userRole],
};

const graceDetail: UserDetail = {
  ...grace,
  email: 'grace@example.com',
  emailConfirmedAt: null,
  creatorName: sessionUser.name,
  updaterName: null,
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

const allAbilities: Ability[] = (['USER', 'ROLE'] as const).flatMap((subject) =>
  (['CREATE', 'READ', 'UPDATE', 'DELETE'] as const).map((action) => ({
    action,
    subject,
  })),
);

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const usersPage = (
  users: UserListItem[],
  page = 1,
  total = users.length,
): StubResponse => ({
  status: 200,
  data: { data: users, meta: { total, page, limit: 20 } },
});

const renderUsers = (
  path: string,
  routes: Record<
    string,
    StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
  > = {},
  abilities: Ability[] = allAbilities,
) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser),
    'GET /users/me/abilities': envelope(abilities),
    'GET /users/me/change-requests': envelope([]),
    'GET /roles': envelope([adminRole, userRole]),
    'GET /users': usersPage([grace]),
    ...routes,
  });
  const rendered = renderRoute(path);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, requests, sent };
};

// The button's accessible name also includes its icon's label.
const createButtonName = () => new RegExp(i18n.t('users.create.title'));

// Ant Design marks each table row with its rowKey; the details modal also renders a table.
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

const graceRow = () => findRow(grace.uuid);

const findErrorDialog = () => findDialog(i18n.t('feedback.error'));

describe('UsersPage', () => {
  it('lists users with the filters from the URL and no email column', async () => {
    const { sent } = renderUsers(
      `${AppRoutes.USERS}?name=grace&email=grace%40example.com&status=ACTIVE`,
    );

    const row = await graceRow();
    expect(within(row).getByText(userRole.roleLabel)).toBeInTheDocument();
    expect(within(row).getByText(grace.statusLabel)).toBeInTheDocument();
    expect(sent('GET /users').at(-1)?.params).toEqual({
      page: 1,
      limit: 20,
      name: 'grace',
      email: 'grace@example.com',
      status: 'ACTIVE',
    });
    expect(
      screen.queryByRole('columnheader', {
        name: i18n.t('users.fields.email'),
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(i18n.t('users.fields.email'))).toHaveValue(
      'grace@example.com',
    );
  });

  it('lists active users by default and keeps the status filter required', async () => {
    const { router, sent } = renderUsers(AppRoutes.USERS);

    await graceRow();
    expect(sent('GET /users').at(-1)?.params).toEqual({
      page: 1,
      limit: 20,
      status: 'ACTIVE',
    });
    const search = screen.getByRole('search');
    expect(
      within(search).getByTitle(i18n.t('recordStatus.ACTIVE')),
    ).toBeInTheDocument();
    expect(search.querySelector('.ant-select-clear')).toBeNull();

    fireEvent.change(screen.getByLabelText(i18n.t('users.fields.name')), {
      target: { value: 'grace' },
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe('?name=grace');
    });
    await waitFor(() => {
      expect(sent('GET /users').at(-1)?.params).toEqual({
        page: 1,
        limit: 20,
        name: 'grace',
        status: 'ACTIVE',
      });
    });

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('list.filters.clear') }),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(screen.getByLabelText(i18n.t('users.fields.name'))).toHaveValue('');
    expect(
      within(search).getByTitle(i18n.t('recordStatus.ACTIVE')),
    ).toBeInTheDocument();
  });

  it('shows the current user details from the API', async () => {
    const { sent } = renderUsers(AppRoutes.USERS, {
      [`GET /users/${grace.uuid}`]: envelope(graceDetail),
    });

    fireEvent.click(
      within(await graceRow()).getByRole('button', {
        name: i18n.t('users.actions.details', { name: grace.name }),
      }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(i18n.t('users.details.title')),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(graceDetail.email)).toBeInTheDocument();
    expect(within(dialog).getByText(sessionUser.name)).toBeInTheDocument();
    expect(sent(`GET /users/${grace.uuid}`)).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    fireEvent.click(
      within(await graceRow()).getByRole('button', {
        name: i18n.t('users.actions.details', { name: grace.name }),
      }),
    );

    // Each opening fetches the user again instead of reusing the cached detail.
    await waitFor(() => {
      expect(sent(`GET /users/${grace.uuid}`)).toHaveLength(2);
    });
  });

  it('marks the signed-in user in the list', async () => {
    const { uuid, name, status, statusLabel, roles } = sessionUser;
    renderUsers(AppRoutes.USERS, {
      'GET /users': usersPage([
        { uuid, name, status, statusLabel, roles },
        grace,
      ]),
    });

    expect(
      within(await findRow(uuid)).getByText(i18n.t('users.currentUser')),
    ).toBeInTheDocument();
    expect(
      within(await graceRow()).queryByText(i18n.t('users.currentUser')),
    ).not.toBeInTheDocument();
  });

  it('shows the forbidden page without the ability to read users', async () => {
    const { sent } = renderUsers(AppRoutes.USERS, {}, []);

    expect(
      await screen.findByText(i18n.t('forbidden.title')),
    ).toBeInTheDocument();
    expect(sent('GET /users')).toHaveLength(0);
  });

  it('hides management actions the user is not granted', async () => {
    renderUsers(AppRoutes.USERS, {}, [{ action: 'READ', subject: 'USER' }]);

    const row = await graceRow();
    expect(within(row).getAllByRole('button')).toEqual([
      within(row).getByRole('button', {
        name: i18n.t('users.actions.details', { name: grace.name }),
      }),
    ]);
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: createButtonName() }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(i18n.t('users.fields.role')),
    ).not.toBeInTheDocument();
  });

  it('creates a user and shows the API message', async () => {
    const { sent } = renderUsers(AppRoutes.USERS, {
      'POST /users': envelope(graceDetail, 'Criado com sucesso'),
    });

    await graceRow();
    fireEvent.click(screen.getByRole('button', { name: createButtonName() }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('users.fields.name')),
      {
        target: { value: 'Grace Hopper' },
      },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('users.fields.email')),
      { target: { value: ' grace@example.com ' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('users.fields.password')),
      { target: { value: 'Secret-password1' } },
    );
    fireEvent.mouseDown(
      within(dialog).getByLabelText(i18n.t('users.fields.roles')),
    );
    fireEvent.click(await screen.findByTitle(userRole.roleLabel));
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('common.save') }),
    );

    expect(await screen.findByText('Criado com sucesso')).toBeInTheDocument();
    expect(requestBody(sent('POST /users')[0])).toEqual({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'Secret-password1',
      roleUuids: [userRole.uuid],
    });
    await waitFor(() => {
      expect(sent('GET /users')).toHaveLength(2);
    });
  });

  it('edits a user loaded from its detail and shows the API message', async () => {
    const { sent } = renderUsers(AppRoutes.USERS, {
      [`GET /users/${grace.uuid}`]: envelope(graceDetail),
      [`PATCH /users/${grace.uuid}`]: envelope(
        graceDetail,
        'Atualizado com sucesso',
      ),
    });

    fireEvent.click(
      within(await graceRow()).getByRole('button', {
        name: i18n.t('users.actions.edit', { name: grace.name }),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByLabelText(i18n.t('users.fields.email')),
    ).toHaveValue(graceDetail.email);
    expect(
      within(dialog).queryByLabelText(i18n.t('users.fields.password')),
    ).not.toBeInTheDocument();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('users.fields.name')),
      {
        target: { value: 'Grace B. Hopper' },
      },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: i18n.t('common.save') }),
    );

    expect(
      await screen.findByText('Atualizado com sucesso'),
    ).toBeInTheDocument();
    expect(sent(`GET /users/${grace.uuid}`)).toHaveLength(1);
    expect(requestBody(sent(`PATCH /users/${grace.uuid}`)[0])).toEqual({
      name: 'Grace B. Hopper',
      email: graceDetail.email,
    });
  });

  describe('editing another admin', () => {
    const turing: UserDetail = {
      ...graceDetail,
      uuid: '1e2d3c4b-5a69-4788-9a0b-1c2d3e4f5a6b',
      name: 'Alan Turing',
      email: 'alan@example.com',
      roles: [adminRole],
    };
    const approvalRequired: StubResponse = {
      status: 409,
      data: { message: 'Alterações em outro administrador exigem aprovação' },
    };

    const submitRename = async () => {
      fireEvent.click(
        within(await findRow(turing.uuid)).getByRole('button', {
          name: i18n.t('users.actions.edit', { name: turing.name }),
        }),
      );
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(
        within(dialog).getByLabelText(i18n.t('users.fields.name')),
        { target: { value: 'Alan M. Turing' } },
      );
      fireEvent.click(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      );

      return dialog;
    };

    const findApprovalDialog = () =>
      findDialog(i18n.t('users.changeRequest.title'));

    it('offers to send the change as a change request in a separate dialog and confirms it was sent', async () => {
      const { sent } = renderUsers(AppRoutes.USERS, {
        'GET /users': usersPage([turing]),
        [`GET /users/${turing.uuid}`]: envelope(turing),
        [`PATCH /users/${turing.uuid}`]: approvalRequired,
        [`POST /users/${turing.uuid}/change-requests`]: {
          status: 201,
          data: {
            data: {
              uuid: '3d6f0a8e-9b1c-4e2d-8f7a-5c4b3a2d1e0f',
              status: 'PENDING',
              statusLabel: 'Pendente',
              requesterName: sessionUser.name,
              current: {
                name: turing.name,
                email: turing.email,
                roles: [adminRole],
              },
              requested: {
                name: 'Alan M. Turing',
                email: turing.email,
                roles: [adminRole],
              },
              expiresAt: '2026-01-03T12:00:00.000Z',
              createdAt: '2026-01-02T12:00:00.000Z',
            },
            meta: { message: 'Criado com sucesso' },
          },
        },
      });

      const dialog = await submitRename();
      const approvalDialog = await findApprovalDialog();

      expect(approvalDialog).toHaveTextContent(
        'Alterações em outro administrador exigem aprovação',
      );
      expect(approvalDialog).toHaveTextContent(
        i18n.t('users.changeRequest.offer', { name: turing.name }),
      );
      expect(
        within(dialog).queryByText(
          'Alterações em outro administrador exigem aprovação',
        ),
      ).not.toBeInTheDocument();
      expect(sent(`POST /users/${turing.uuid}/change-requests`)).toHaveLength(
        0,
      );

      fireEvent.click(
        within(approvalDialog).getByRole('button', {
          name: i18n.t('users.changeRequest.send'),
        }),
      );

      expect(
        await screen.findByText(
          i18n.t('users.changeRequest.sent', { name: turing.name }),
        ),
      ).toBeInTheDocument();
      expect(
        requestBody(sent(`POST /users/${turing.uuid}/change-requests`)[0]),
      ).toEqual(requestBody(sent(`PATCH /users/${turing.uuid}`)[0]));
      expect(
        requestBody(sent(`POST /users/${turing.uuid}/change-requests`)[0]),
      ).toEqual({
        name: 'Alan M. Turing',
        email: turing.email,
      });
    });

    it('keeps the edit dialog and its values when the change request is declined', async () => {
      const { sent } = renderUsers(AppRoutes.USERS, {
        'GET /users': usersPage([turing]),
        [`GET /users/${turing.uuid}`]: envelope(turing),
        [`PATCH /users/${turing.uuid}`]: approvalRequired,
      });

      const dialog = await submitRename();
      fireEvent.click(
        within(await findApprovalDialog()).getByRole('button', {
          name: i18n.t('common.cancel'),
        }),
      );

      expect(
        within(dialog).getByLabelText(i18n.t('users.fields.name')),
      ).toHaveValue('Alan M. Turing');
      expect(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      ).toBeEnabled();
      expect(sent(`POST /users/${turing.uuid}/change-requests`)).toHaveLength(
        0,
      );
    });

    it('shows the API error when the change request is rejected', async () => {
      renderUsers(AppRoutes.USERS, {
        'GET /users': usersPage([turing]),
        [`GET /users/${turing.uuid}`]: envelope(turing),
        [`PATCH /users/${turing.uuid}`]: approvalRequired,
        [`POST /users/${turing.uuid}/change-requests`]: {
          status: 409,
          data: { message: 'E-mail já está em uso' },
        },
      });

      await submitRename();
      fireEvent.click(
        within(await findApprovalDialog()).getByRole('button', {
          name: i18n.t('users.changeRequest.send'),
        }),
      );

      expect(await findErrorDialog()).toHaveTextContent(
        'E-mail já está em uso',
      );
    });

    it('shows a plain error for a conflict on a user who is not an admin', async () => {
      renderUsers(AppRoutes.USERS, {
        [`GET /users/${grace.uuid}`]: envelope(graceDetail),
        [`PATCH /users/${grace.uuid}`]: {
          status: 409,
          data: { message: 'E-mail já está em uso' },
        },
      });

      fireEvent.click(
        within(await graceRow()).getByRole('button', {
          name: i18n.t('users.actions.edit', { name: grace.name }),
        }),
      );
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      );

      expect(await findErrorDialog()).toHaveTextContent(
        'E-mail já está em uso',
      );
      expect(
        screen.queryByText(i18n.t('users.changeRequest.title')),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      ).toBeInTheDocument();
    });
  });

  it('toggles the status and shows the API message', async () => {
    const { sent } = renderUsers(AppRoutes.USERS, {
      [`PUT /users/${grace.uuid}/status`]: envelope(
        { ...graceDetail, status: 'INACTIVE', statusLabel: 'Inativo' },
        'Atualizado com sucesso',
      ),
    });

    fireEvent.click(
      within(await graceRow()).getByRole('switch', {
        name: i18n.t('users.actions.toggleStatus', { name: grace.name }),
      }),
    );

    expect(
      await screen.findByText('Atualizado com sucesso'),
    ).toBeInTheDocument();
    expect(requestBody(sent(`PUT /users/${grace.uuid}/status`)[0])).toEqual({
      status: 'INACTIVE',
    });
  });

  it('shows the API error when an action is rejected', async () => {
    renderUsers(AppRoutes.USERS, {
      [`PUT /users/${grace.uuid}/status`]: {
        status: 409,
        data: { message: 'Último administrador ativo' },
      },
    });

    fireEvent.click(
      within(await graceRow()).getByRole('switch', {
        name: i18n.t('users.actions.toggleStatus', { name: grace.name }),
      }),
    );

    expect(await findErrorDialog()).toHaveTextContent(
      'Último administrador ativo',
    );
  });

  it('shows the API error in a dialog when a delete is rejected', async () => {
    renderUsers(AppRoutes.USERS, {
      [`DELETE /users/${grace.uuid}`]: {
        status: 409,
        data: { message: 'Último administrador ativo' },
      },
    });

    fireEvent.click(
      within(await graceRow()).getByRole('button', {
        name: i18n.t('users.actions.delete', { name: grace.name }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    expect(await findErrorDialog()).toHaveTextContent(
      'Último administrador ativo',
    );
  });

  it('deletes after confirmation and leaves a page it emptied', async () => {
    let deleted = false;
    const { router, sent } = renderUsers(`${AppRoutes.USERS}?page=2`, {
      'GET /users': (config) => {
        const { page } = z.object({ page: z.number() }).parse(config.params);

        return page === 2
          ? usersPage(deleted ? [] : [grace], 2, deleted ? 20 : 21)
          : usersPage([grace], 1, 20);
      },
      [`DELETE /users/${grace.uuid}`]: () => {
        deleted = true;

        return envelope(null, 'Excluído com sucesso');
      },
    });

    fireEvent.click(
      within(await graceRow()).getByRole('button', {
        name: i18n.t('users.actions.delete', { name: grace.name }),
      }),
    );
    expect(sent(`DELETE /users/${grace.uuid}`)).toHaveLength(0);
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    expect(await screen.findByText('Excluído com sucesso')).toBeInTheDocument();
    expect(sent(`DELETE /users/${grace.uuid}`)).toHaveLength(1);
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
  });
  it.each([
    { label: 'with role access', abilities: allAbilities },
    {
      label: 'without role access',
      abilities: [
        { action: 'READ', subject: 'USER' },
        { action: 'UPDATE', subject: 'USER' },
      ],
    },
  ])(
    'preserves an assigned inactive role during a profile-only edit $label',
    async ({ abilities }) => {
      const inactiveRole: Role = {
        ...userRole,
        status: 'INACTIVE',
        statusLabel: 'Inativo',
      };
      const detail = { ...graceDetail, roles: [inactiveRole] };
      const { sent } = renderUsers(
        AppRoutes.USERS,
        {
          [`GET /users/${grace.uuid}`]: envelope(detail),
          'GET /roles': envelope([adminRole, inactiveRole]),
          [`PATCH /users/${grace.uuid}`]: envelope(detail, 'Saved profile.'),
        },
        abilities,
      );
      fireEvent.click(
        within(await graceRow()).getByRole('button', {
          name: i18n.t('users.actions.edit', { name: grace.name }),
        }),
      );
      const dialog = await screen.findByRole('dialog');
      expect(
        await within(dialog).findByText(
          `${inactiveRole.roleLabel} (${inactiveRole.statusLabel})`,
        ),
      ).toBeInTheDocument();
      fireEvent.change(
        within(dialog).getByLabelText(i18n.t('users.fields.name')),
        { target: { value: 'Updated Grace' } },
      );
      fireEvent.click(
        within(dialog).getByRole('button', { name: i18n.t('common.save') }),
      );
      expect(await screen.findByText('Saved profile.')).toBeInTheDocument();
      expect(requestBody(sent(`PATCH /users/${grace.uuid}`)[0])).toEqual({
        name: 'Updated Grace',
        email: detail.email,
      });
      if (!abilities.some(({ subject }) => subject === 'ROLE')) {
        expect(sent('GET /roles')).toHaveLength(0);
      }
    },
  );
});
