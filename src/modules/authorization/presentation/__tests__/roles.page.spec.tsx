import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { findDialog } from '@/test/find-dialog';
import { renderRoute } from '@/test/render-route';
import type { Ability } from '../../domain/ability.schema';
import type { Role, RoleDetail } from '../../domain/role.schema';
import { getActionLabel, getSubjectLabel } from '../components/ability-labels';

const abilityCatalog: Ability[] = ['USER', 'ROLE', 'ABILITY'].flatMap(
  (subject) =>
    ['CREATE', 'READ', 'UPDATE', 'DELETE'].map((action) => ({
      action,
      subject,
    })),
);

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

const inactiveUserRole: Role = {
  ...userRole,
  status: 'INACTIVE',
  statusLabel: 'Inativo',
};

const adminDetail: RoleDetail = { ...adminRole, abilities: abilityCatalog };

const userDetail: RoleDetail = {
  ...userRole,
  abilities: [{ action: 'READ', subject: 'USER' }],
};

const sessionUser = (roles: Role[]): UserDetail => ({
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  roles,
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const readRoleOnly: Ability[] = [{ action: 'READ', subject: 'ROLE' }];

const roleManager: Ability[] = [
  { action: 'READ', subject: 'ROLE' },
  { action: 'UPDATE', subject: 'ROLE' },
];

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const renderRoles = ({
  roles = [adminRole],
  abilities = abilityCatalog,
  routes = {},
}: {
  roles?: Role[];
  abilities?: Ability[];
  routes?: Record<string, StubResponse>;
} = {}) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(sessionUser(roles)),
    'GET /users/me/abilities': envelope(abilities),
    'GET /users/me/change-requests': envelope([]),
    'GET /roles': envelope([adminRole, userRole]),
    'GET /abilities': envelope(abilityCatalog),
    [`GET /roles/${adminRole.uuid}`]: envelope(adminDetail),
    [`GET /roles/${userRole.uuid}`]: envelope(userDetail),
    ...routes,
  });
  const rendered = renderRoute(AppRoutes.ROLES);
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

const openRole = async ({ uuid, roleLabel }: Role) => {
  fireEvent.click(
    within(await findRow(uuid)).getByRole('button', {
      name: i18n.t('roles.actions.abilities', { role: roleLabel }),
    }),
  );

  return screen.findByRole('dialog');
};

const cell = (dialog: HTMLElement, { action, subject }: Ability) =>
  within(dialog).findByRole('checkbox', {
    name: i18n.t('roles.abilities.cell', {
      action: getActionLabel({ action }),
      subject: getSubjectLabel({ subject }),
    }),
  });

const saveButton = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: i18n.t('common.save') });

describe('RolesPage', () => {
  it('lists roles with their status and a menu entry', async () => {
    renderRoles();

    const row = await findRow(userRole.uuid);
    expect(within(row).getByText(userRole.roleLabel)).toBeInTheDocument();
    expect(within(row).getByText(userRole.statusLabel)).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: i18n.t('navigation.roles') }),
    ).toHaveAttribute('href', AppRoutes.ROLES);
  });

  it('shows the forbidden page without the ability to read roles', async () => {
    const { sent } = renderRoles({
      abilities: [{ action: 'READ', subject: 'USER' }],
    });

    expect(
      await screen.findByText(i18n.t('forbidden.title')),
    ).toBeInTheDocument();
    expect(sent('GET /roles')).toHaveLength(0);
    expect(
      screen.queryByRole('link', { name: i18n.t('navigation.roles') }),
    ).not.toBeInTheDocument();
  });

  it('disables opening an inactive role', async () => {
    renderRoles({
      routes: { 'GET /roles': envelope([adminRole, inactiveUserRole]) },
    });

    expect(
      within(await findRow(userRole.uuid)).getByRole('button', {
        name: i18n.t('roles.actions.abilities', { role: userRole.roleLabel }),
      }),
    ).toBeDisabled();
  });

  it('replaces the grants and enables save only when the selection changed', async () => {
    const { sent } = renderRoles({
      routes: {
        [`PATCH /roles/${userRole.uuid}/abilities`]: envelope(
          { ...userDetail, abilities: [] },
          'Atualizado com sucesso',
        ),
      },
    });

    const dialog = await openRole(userRole);
    const readUsers = await cell(dialog, { action: 'READ', subject: 'USER' });
    const updateUsers = await cell(dialog, {
      action: 'UPDATE',
      subject: 'USER',
    });
    expect(readUsers).toBeChecked();
    expect(updateUsers).not.toBeChecked();
    expect(saveButton(dialog)).toBeDisabled();

    fireEvent.click(updateUsers);
    expect(saveButton(dialog)).toBeEnabled();
    fireEvent.click(updateUsers);
    expect(saveButton(dialog)).toBeDisabled();

    fireEvent.click(readUsers);
    fireEvent.click(saveButton(dialog));

    expect(
      await screen.findByText('Atualizado com sucesso'),
    ).toBeInTheDocument();
    expect(
      requestBody(sent(`PATCH /roles/${userRole.uuid}/abilities`)[0]),
    ).toEqual({ abilities: [] });
    await waitFor(() => {
      expect(sent('GET /roles')).toHaveLength(2);
    });
    expect(sent('GET /users/me/abilities')).toHaveLength(1);
  });

  it('refetches the session abilities after changing a role the user holds', async () => {
    const { sent } = renderRoles({
      roles: [userRole],
      abilities: [...roleManager, { action: 'READ', subject: 'ABILITY' }],
      routes: {
        [`PATCH /roles/${userRole.uuid}/abilities`]: envelope(userDetail),
      },
    });

    const dialog = await openRole(userRole);
    fireEvent.click(await cell(dialog, { action: 'CREATE', subject: 'ROLE' }));
    fireEvent.click(saveButton(dialog));

    await waitFor(() => {
      expect(sent('GET /users/me/abilities')).toHaveLength(2);
    });
    expect(
      requestBody(sent(`PATCH /roles/${userRole.uuid}/abilities`)[0]),
    ).toEqual({
      abilities: [
        { action: 'READ', subject: 'USER' },
        { action: 'CREATE', subject: 'ROLE' },
      ],
    });
    expect(sent('GET /abilities')).toHaveLength(1);
  });

  it('shows the API error message in a separate dialog and keeps the grid open when saving fails', async () => {
    renderRoles({
      routes: {
        [`PATCH /roles/${userRole.uuid}/abilities`]: {
          status: 409,
          data: { message: 'Uma permissão está inativa.' },
        },
      },
    });

    const dialog = await openRole(userRole);
    fireEvent.click(await cell(dialog, { action: 'READ', subject: 'ROLE' }));
    fireEvent.click(saveButton(dialog));

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Uma permissão está inativa.',
    );
    expect(
      within(dialog).queryByText('Uma permissão está inativa.'),
    ).toBeNull();
    expect(saveButton(dialog)).toBeEnabled();
  });

  it('shows the ADMIN grants read-only with a note', async () => {
    const { sent } = renderRoles();

    const dialog = await openRole(adminRole);

    expect(
      await within(dialog).findByText(i18n.t('roles.abilities.adminImmutable')),
    ).toBeInTheDocument();
    const readRoles = await cell(dialog, { action: 'READ', subject: 'ROLE' });
    expect(readRoles).toBeChecked();
    expect(readRoles).toBeDisabled();
    expect(
      within(dialog).queryByRole('button', { name: i18n.t('common.save') }),
    ).not.toBeInTheDocument();
    expect(sent('GET /abilities')).toHaveLength(1);
  });

  it('shows only the assigned grants read-only with only READ on ROLE', async () => {
    const { sent } = renderRoles({
      roles: [userRole],
      abilities: readRoleOnly,
    });

    const dialog = await openRole(userRole);

    const readUsers = await cell(dialog, { action: 'READ', subject: 'USER' });
    expect(readUsers).toBeChecked();
    expect(readUsers).toBeDisabled();
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1);
    expect(
      within(dialog).getByText(i18n.t('roles.abilities.catalogRestricted')),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: i18n.t('common.save') }),
    ).not.toBeInTheDocument();
    expect(sent('GET /abilities')).toHaveLength(0);
  });
  it('keeps an incomplete catalog read-only even with UPDATE on ROLE', async () => {
    const { sent } = renderRoles({ roles: [userRole], abilities: roleManager });
    const dialog = await openRole(userRole);
    expect(
      await cell(dialog, { action: 'READ', subject: 'USER' }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByRole('button', { name: i18n.t('common.save') }),
    ).not.toBeInTheDocument();
    expect(sent('GET /abilities')).toHaveLength(0);
  });

  it('uses sparse backend pairs and labels for new subjects and actions', async () => {
    const catalog: Ability[] = [
      {
        action: 'READ',
        subject: 'USER',
        actionLabel: 'Consultar',
        subjectLabel: 'Pessoas',
      },
      {
        action: 'EXPORT',
        subject: 'REPORT',
        actionLabel: 'Exportar',
        subjectLabel: 'Relatórios',
      },
    ];
    const { sent } = renderRoles({
      routes: {
        'GET /abilities': envelope(catalog),
        [`GET /roles/${userRole.uuid}`]: envelope({
          ...userDetail,
          abilities: [catalog[0]],
        }),
        [`PATCH /roles/${userRole.uuid}/abilities`]: envelope(userDetail),
      },
    });
    const dialog = await openRole(userRole);
    const exportReports = await within(dialog).findByRole('checkbox', {
      name: i18n.t('roles.abilities.cell', {
        action: 'Exportar',
        subject: 'Relatórios',
      }),
    });
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(2);
    expect(
      within(dialog).getByRole('columnheader', { name: 'Exportar' }),
    ).toBeInTheDocument();
    fireEvent.click(exportReports);
    fireEvent.click(saveButton(dialog));
    await waitFor(() =>
      expect(sent(`PATCH /roles/${userRole.uuid}/abilities`)).toHaveLength(1),
    );
    expect(
      requestBody(sent(`PATCH /roles/${userRole.uuid}/abilities`)[0]),
    ).toEqual({
      abilities: [
        { action: 'READ', subject: 'USER' },
        { action: 'EXPORT', subject: 'REPORT' },
      ],
    });
  });

  it('shows catalog errors without offering an invented fallback', async () => {
    renderRoles({
      routes: {
        'GET /abilities': {
          status: 403,
          data: { message: 'Catalog unavailable.' },
        },
      },
    });
    const dialog = await openRole(userRole);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Catalog unavailable.',
    );
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: i18n.t('common.save') }),
    ).not.toBeInTheDocument();
  });
});
