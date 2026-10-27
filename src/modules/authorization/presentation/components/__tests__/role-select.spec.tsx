import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { sessionQuery } from '@/modules/auth/infra/auth.queries';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import {
  requestKey,
  stubHttpRoutes,
  type StubResponse,
} from '@/test/http-stub';
import type { Ability } from '../../../domain/ability.schema';
import type { Role } from '../../../domain/role.schema';
import { abilitiesQuery } from '../../../infra/abilities.queries';
import { RoleSelect } from '../role-select';

const activeRole: Role = {
  uuid: 'active',
  role: 'USER',
  roleLabel: 'Active role',
  status: 'ACTIVE',
  statusLabel: 'Active',
};
const inactiveRole: Role = {
  uuid: 'inactive',
  role: 'USER',
  roleLabel: 'Inactive role',
  status: 'INACTIVE',
  statusLabel: 'Inactive',
};
const otherRole: Role = {
  ...activeRole,
  uuid: 'other',
  roleLabel: 'Other role',
};
const user: UserDetail = {
  uuid: 'user',
  name: 'Ada',
  email: 'ada@example.com',
  status: 'ACTIVE',
  statusLabel: 'Active',
  roles: [activeRole],
  emailConfirmedAt: null,
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderSelect = ({
  abilities = [{ action: 'READ', subject: 'ROLE' }],
  assignedRoles = [],
  includeInactive = false,
  response = {
    status: 200,
    data: { data: [activeRole, inactiveRole, otherRole], meta: {} },
  },
}: {
  abilities?: Ability[];
  assignedRoles?: Role[];
  includeInactive?: boolean;
  response?: StubResponse;
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(sessionQuery.queryKey, user);
  queryClient.setQueryData(abilitiesQuery.queryKey, abilities);
  const requests = stubHttpRoutes(httpClient, { 'GET /roles': response });
  render(
    <QueryClientProvider client={queryClient}>
      <Form initialValues={{ roles: assignedRoles.map(({ uuid }) => uuid) }}>
        <Form.Item name="roles">
          <RoleSelect
            aria-label="Roles"
            mode="multiple"
            open
            virtual={false}
            assignedRoles={assignedRoles}
            includeInactive={includeInactive}
          />
        </Form.Item>
      </Form>
    </QueryClientProvider>,
  );
  return { requests };
};

describe('RoleSelect', () => {
  it('excludes inactive roles from user creation', async () => {
    renderSelect();
    expect(
      await screen.findByRole('option', { name: activeRole.roleLabel }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Inactive role/ }),
    ).not.toBeInTheDocument();
  });

  it('preserves assigned inactive roles visibly without allowing a new inactive assignment', async () => {
    renderSelect({ assignedRoles: [inactiveRole] });
    const option = await screen.findByRole('option', {
      name: 'Inactive role (Inactive)',
    });
    expect(option).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('combobox', { name: 'Roles' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      document.querySelector('.ant-select-selection-item'),
    ).toHaveTextContent('Inactive role (Inactive)');
    const removeButton = document.querySelector(
      '.ant-select-selection-item-remove',
    );
    if (!removeButton) throw new Error('Assigned role removal is missing');
    fireEvent.click(removeButton);
    await waitFor(() =>
      expect(
        document.querySelector('.ant-select-selection-item'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('option', { name: 'Inactive role (Inactive)' }),
    ).not.toBeInTheDocument();
  });

  it('allows inactive roles when used as a filter', async () => {
    renderSelect({ includeInactive: true });
    expect(
      await screen.findByRole('option', { name: 'Inactive role (Inactive)' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('uses only known roles and explains the limited list without READ ROLE', async () => {
    const { requests } = renderSelect({
      abilities: [{ action: 'CREATE', subject: 'USER' }],
      assignedRoles: [otherRole],
    });
    expect(
      await screen.findByRole('option', { name: activeRole.roleLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: otherRole.roleLabel }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('roles.select.limited'),
    );
    expect(requests.map(requestKey)).toEqual([]);
    expect(screen.getByRole('combobox', { name: 'Roles' })).toBeEnabled();
  });

  it('shows loading while the role request is pending', () => {
    renderSelect();
    expect(screen.getByRole('combobox', { name: 'Roles' })).toBeDisabled();
    expect(document.querySelector('.ant-select-loading')).toBeInTheDocument();
  });

  it('shows an API failure instead of silently presenting an empty selector', async () => {
    renderSelect({
      response: { status: 403, data: { message: 'Cannot load roles.' } },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot load roles.',
    );
    expect(screen.getByRole('combobox', { name: 'Roles' })).toBeDisabled();
  });
});
