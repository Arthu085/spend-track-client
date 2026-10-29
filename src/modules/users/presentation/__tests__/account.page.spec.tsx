import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import { sessionQuery } from '@/modules/auth/infra/auth.queries';
import type { UserDetail } from '../../domain/user.schema';
import { dashboardRoute } from '@/test/dashboard-fixture';
import {
  csrfResponse,
  requestBody,
  requestKey,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { findDialog } from '@/test/find-dialog';
import { renderRoute } from '@/test/render-route';

const user: UserDetail = {
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

const envelope = (data: unknown): StubResponse => ({
  status: 200,
  data: { data, meta: {} },
});

const signedInRoutes = {
  ...dashboardRoute,
  'GET /users/me': envelope(user),
  'GET /users/me/abilities': envelope([]),
  'GET /users/me/change-requests': envelope([]),
  'GET /auth/csrf': csrfResponse('token-1'),
};

const fieldLabels = () => ({
  name: i18n.t('users.fields.name'),
  email: i18n.t('users.fields.email'),
  currentPassword: i18n.t('account.fields.currentPassword'),
});

const profileForm = () =>
  within(screen.getByRole('form', { name: i18n.t('account.profile.title') }));

const passwordForm = () =>
  within(screen.getByRole('form', { name: i18n.t('account.password.title') }));

const fillField = (label: string, value: string, form = profileForm()) => {
  fireEvent.change(form.getByLabelText(label), { target: { value } });
};

const saveButton = () =>
  screen.getByRole('button', { name: i18n.t('common.save') });

// The form watches its fields asynchronously, so the button and the password
// field follow a change on a later render.
const save = async () => {
  await waitFor(() => {
    expect(saveButton()).toBeEnabled();
  });
  fireEvent.click(saveButton());
};

const renderAccountPage = async () => {
  const rendered = renderRoute(AppRoutes.ACCOUNT);
  await screen.findByRole('heading', { name: i18n.t('account.title') });

  return rendered;
};

beforeEach(() => {
  httpClient.clearCsrfToken();
});

describe('user menu', () => {
  it('links to the account page from the header', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);
    const { router } = renderRoute(AppRoutes.HOME);

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(user.name) }),
    );
    fireEvent.click(
      await screen.findByRole('link', { name: i18n.t('account.title') }),
    );

    expect(
      await screen.findByRole('heading', { name: i18n.t('account.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.ACCOUNT);
  });
});

describe('AccountPage', () => {
  it('groups the account sections under the page heading without skipping a level', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);
    await renderAccountPage();

    expect(
      screen.getByRole('heading', { name: i18n.t('account.title'), level: 2 }),
    ).toBeInTheDocument();

    for (const name of [
      i18n.t('account.profile.title'),
      i18n.t('account.password.title'),
      i18n.t('account.access.title'),
    ]) {
      expect(screen.getByRole('heading', { name, level: 3 }).tagName).toBe(
        'H3',
      );
    }
  });

  it('shows the roles and the permissions grouped by subject', async () => {
    stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'GET /users/me': envelope({
        ...user,
        roles: [
          {
            uuid: 'b7e3c0a1-4c55-4f0e-8f0a-0d3f0f6e2a11',
            role: 'ADMIN',
            roleLabel: 'Administrador',
            status: 'ACTIVE',
            statusLabel: 'Ativo',
          },
        ],
      }),
      'GET /users/me/abilities': envelope([
        { action: 'UPDATE', subject: 'USER' },
        { action: 'READ', subject: 'USER' },
        { action: 'READ', subject: 'ROLE' },
      ]),
    });
    await renderAccountPage();

    expect(
      screen.getByRole('heading', { name: i18n.t('account.profile.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: i18n.t('account.access.title') }),
    ).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    const permissions = within(await screen.findByRole('table'));
    expect(
      permissions
        .getByText(i18n.t('authorization.subjects.USER'))
        .closest('tr'),
    ).toHaveTextContent(
      `${i18n.t('authorization.actions.UPDATE')}${i18n.t('authorization.actions.READ')}`,
    );
    expect(
      permissions
        .getByText(i18n.t('authorization.subjects.ROLE'))
        .closest('tr'),
    ).toHaveTextContent(i18n.t('authorization.actions.READ'));
    expect(permissions.getAllByRole('row')).toHaveLength(2);
  });

  it('says when the user has no permissions', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);
    await renderAccountPage();

    expect(
      await screen.findByText(i18n.t('authorization.noAbilities')),
    ).toBeInTheDocument();
  });

  it('saves only when something changed and asks for no password for a name change', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'PATCH /users/me': envelope({ ...user, name: 'Ada King' }),
    });
    const { router, queryClient } = await renderAccountPage();
    const labels = fieldLabels();

    expect(saveButton()).toBeDisabled();
    fillField(labels.email, ' ADA@example.com ');
    fillField(labels.name, 'Ada King');
    await save();

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('account.updated.description')),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(i18n.t('account.updated.confirmNewEmail')),
    ).toBeNull();
    expect(screen.queryByLabelText(labels.currentPassword)).toBeNull();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    const update = requests.find(
      (request) => requestKey(request) === 'PATCH /users/me',
    );
    expect(update && requestBody(update)).toEqual({
      name: 'Ada King',
      email: 'ADA@example.com',
    });
  });

  it('requires the current password to change the email and asks to confirm the new address', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'PATCH /users/me': envelope({ ...user, email: 'ada@lovelace.dev' }),
    });
    const { router } = await renderAccountPage();
    const labels = fieldLabels();

    fillField(labels.email, 'ada@lovelace.dev');
    await save();

    expect(
      await screen.findByText(i18n.t('validation.required')),
    ).toBeInTheDocument();
    expect(requests.map(requestKey)).not.toContain('PATCH /users/me');

    fillField(labels.currentPassword, 'secret-password');
    await save();

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('account.updated.confirmNewEmail')),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
    const update = requests.find(
      (request) => requestKey(request) === 'PATCH /users/me',
    );
    expect(update && requestBody(update)).toEqual({
      name: user.name,
      email: 'ada@lovelace.dev',
      currentPassword: 'secret-password',
    });
  });

  it('keeps the session and shows the API error when the update fails', async () => {
    stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'PATCH /users/me': {
        status: 403,
        data: { message: 'Current password is incorrect.' },
      },
    });
    const { router, queryClient } = await renderAccountPage();
    const labels = fieldLabels();

    fillField(labels.email, 'ada@lovelace.dev');
    await profileForm().findByLabelText(labels.currentPassword);
    fillField(labels.currentPassword, 'wrong-password');
    await save();

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Current password is incorrect.',
    );
    expect(router.state.location.pathname).toBe(AppRoutes.ACCOUNT);
    await waitFor(() => {
      expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(user);
    });
  });
});

describe('ChangeOwnPasswordForm', () => {
  const passwordLabels = () => ({
    currentPassword: i18n.t('account.fields.currentPassword'),
    newPassword: i18n.t('account.fields.newPassword'),
    confirmNewPassword: i18n.t('account.fields.confirmNewPassword'),
  });

  const fillPasswordForm = (values: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    const labels = passwordLabels();
    const form = passwordForm();

    fillField(labels.currentPassword, values.currentPassword, form);
    fillField(labels.newPassword, values.newPassword, form);
    fillField(labels.confirmNewPassword, values.confirmNewPassword, form);
  };

  const submitButton = () =>
    passwordForm().getByRole('button', {
      name: i18n.t('account.password.submit'),
    });

  it('changes the password, ends the session, and asks to sign in again', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'PATCH /users/me/password': {
        status: 200,
        data: {
          data: null,
          meta: { message: 'Password changed successfully' },
        },
      },
    });
    const { router, queryClient } = await renderAccountPage();

    fillPasswordForm({
      currentPassword: 'old-password',
      newPassword: 'New-password1',
      confirmNewPassword: 'New-password1',
    });
    fireEvent.click(submitButton());

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Password changed successfully'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('account.updated.description')),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    const change = requests.find(
      (request) => requestKey(request) === 'PATCH /users/me/password',
    );
    expect(change && requestBody(change)).toEqual({
      currentPassword: 'old-password',
      newPassword: 'New-password1',
    });
  });

  it('validates the new password and its confirmation before sending', async () => {
    const requests = stubHttpRoutes(httpClient, signedInRoutes);
    await renderAccountPage();

    fillPasswordForm({
      currentPassword: 'old-password',
      newPassword: 'short',
      confirmNewPassword: 'shorter',
    });
    fireEvent.click(submitButton());

    expect(
      await passwordForm().findByText(
        i18n.t('validation.strongPassword', { min: 8 }),
      ),
    ).toBeInTheDocument();
    expect(
      passwordForm().getByText(i18n.t('validation.passwordMismatch')),
    ).toBeInTheDocument();
    expect(requests.map(requestKey)).not.toContain('PATCH /users/me/password');
  });

  it('rejects a new password without every character class', async () => {
    const requests = stubHttpRoutes(httpClient, signedInRoutes);
    await renderAccountPage();

    fillPasswordForm({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmNewPassword: 'new-password',
    });
    fireEvent.click(submitButton());

    expect(
      await passwordForm().findByText(
        i18n.t('validation.strongPassword', { min: 8 }),
      ),
    ).toBeInTheDocument();
    expect(requests.map(requestKey)).not.toContain('PATCH /users/me/password');
  });

  it('keeps the session and opens the error dialog for a wrong current password', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'PATCH /users/me/password': {
        status: 403,
        data: { message: 'Current password is incorrect.' },
      },
    });
    const { router, queryClient } = await renderAccountPage();

    fillPasswordForm({
      currentPassword: 'wrong-password',
      newPassword: 'New-password1',
      confirmNewPassword: 'New-password1',
    });
    fireEvent.click(submitButton());

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Current password is incorrect.',
    );
    expect(router.state.location.pathname).toBe(AppRoutes.ACCOUNT);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(user);
    expect(
      requests.filter(
        (request) => requestKey(request) === 'PATCH /users/me/password',
      ),
    ).toHaveLength(1);
    await waitFor(() => {
      expect(submitButton()).toBeEnabled();
    });
  });
});
