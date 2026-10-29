import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import { sessionQuery } from '@/modules/auth/infra/auth.queries';
import type { Role } from '@/modules/authorization/domain/role.schema';
import type { UserChangeRequest } from '../../domain/user-change-request.schema';
import type { UserDetail } from '../../domain/user.schema';
import { dashboardRoute } from '@/test/dashboard-fixture';
import {
  csrfResponse,
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

const user: UserDetail = {
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

const changeRequest: UserChangeRequest = {
  uuid: '3d6f0a8e-9b1c-4e2d-8f7a-5c4b3a2d1e0f',
  status: 'PENDING',
  statusLabel: 'Pendente',
  requesterName: 'Grace Hopper',
  current: { name: user.name, email: user.email, roles: [adminRole] },
  requested: {
    name: user.name,
    email: 'ada@lovelace.dev',
    roles: [adminRole, userRole],
  },
  expiresAt: '2026-01-03T12:00:00.000Z',
  createdAt: '2026-01-02T12:00:00.000Z',
};

const approvePath = `POST /users/me/change-requests/${changeRequest.uuid}/approve`;
const rejectPath = `POST /users/me/change-requests/${changeRequest.uuid}/reject`;

const envelope = (data: unknown, message?: string): StubResponse => ({
  status: 200,
  data: { data, meta: message ? { message } : {} },
});

const renderChangeRequests = (
  routes: Record<
    string,
    StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse)
  > = {},
  path: string = AppRoutes.CHANGE_REQUESTS,
) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /auth/csrf': csrfResponse('csrf-token'),
    'GET /users/me': envelope(user),
    'GET /users/me/abilities': envelope([]),
    'GET /users/me/change-requests': envelope([changeRequest]),
    ...dashboardRoute,
    ...routes,
  });
  const rendered = renderRoute(path);
  const sent = (key: string) =>
    requests.filter((request) => requestKey(request) === key);

  return { ...rendered, sent };
};

const findCard = async () =>
  (
    await screen.findByText(
      i18n.t('changeRequests.requestedBy', {
        name: changeRequest.requesterName,
      }),
    )
  ).closest<HTMLElement>('.ant-card');

const diffRow = (card: HTMLElement, fieldLabel: string) =>
  within(card).getByText(fieldLabel).closest('tr');

const decide = async (
  card: HTMLElement,
  action: 'approve' | 'reject',
): Promise<void> => {
  fireEvent.click(
    within(card).getByRole('button', {
      name: i18n.t(`changeRequests.${action}.submit`),
    }),
  );
  const confirmation = (
    await screen.findByText(i18n.t(`changeRequests.${action}.title`))
  ).closest<HTMLElement>('.ant-popover');

  if (!confirmation) {
    throw new Error('Confirmation not found');
  }
  fireEvent.click(
    within(confirmation).getByRole('button', {
      name: i18n.t(`changeRequests.${action}.submit`),
    }),
  );
};

beforeEach(() => {
  httpClient.clearCsrfToken();
});

describe('ChangeRequestsPage', () => {
  it('shows each request as a diff with who asked and when', async () => {
    renderChangeRequests();

    const card = await findCard();
    if (!card) {
      throw new Error('Card not found');
    }
    const changed = i18n.t('changeRequests.changed');
    expect(diffRow(card, i18n.t('users.fields.name'))).not.toHaveTextContent(
      changed,
    );
    expect(diffRow(card, i18n.t('users.fields.email'))).toHaveTextContent(
      `${changed}${user.email}ada@lovelace.dev`,
    );
    expect(diffRow(card, i18n.t('users.fields.roles'))).toHaveTextContent(
      `${changed}${adminRole.roleLabel}${adminRole.roleLabel}${userRole.roleLabel}`,
    );
    const dateTimeFormat = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    expect(
      within(card).getByText(
        i18n.t('changeRequests.dates', {
          createdAt: dateTimeFormat.format(new Date(changeRequest.createdAt)),
          expiresAt: dateTimeFormat.format(new Date(changeRequest.expiresAt)),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('says when nothing is pending', async () => {
    renderChangeRequests({ 'GET /users/me/change-requests': envelope([]) });

    expect(
      await screen.findByText(i18n.t('changeRequests.empty')),
    ).toBeInTheDocument();
  });

  it('approves after confirmation, ends the session, and sends the user to login', async () => {
    const { router, queryClient, sent } = renderChangeRequests({
      [approvePath]: envelope({ ...user, email: 'ada@lovelace.dev' }),
    });
    const card = await findCard();
    if (!card) {
      throw new Error('Card not found');
    }

    await decide(card, 'approve');

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('changeRequests.approve.done')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('account.updated.confirmNewEmail')),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    expect(sent(approvePath)).toHaveLength(1);
  });

  it('rejects after confirmation, keeps the session, and refreshes the list', async () => {
    let pending = [changeRequest];
    const { router, queryClient, sent } = renderChangeRequests({
      'GET /users/me/change-requests': () => envelope(pending),
      [rejectPath]: () => {
        pending = [];
        return envelope(null, 'Solicitação de alteração rejeitada');
      },
    });
    const card = await findCard();
    if (!card) {
      throw new Error('Card not found');
    }

    await decide(card, 'reject');

    expect(
      await screen.findByText('Solicitação de alteração rejeitada'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(i18n.t('changeRequests.empty')),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.CHANGE_REQUESTS);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(user);
    expect(sent(approvePath)).toHaveLength(0);
  });

  it('shows the API message and refreshes the list when the request is stale', async () => {
    const { router, sent } = renderChangeRequests({
      [approvePath]: {
        status: 409,
        data: { message: 'Seu perfil mudou depois desta solicitação' },
      },
    });
    const card = await findCard();
    if (!card) {
      throw new Error('Card not found');
    }
    const listRequestsBefore = sent('GET /users/me/change-requests').length;

    await decide(card, 'approve');

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Seu perfil mudou depois desta solicitação',
    );
    await waitFor(() => {
      expect(sent('GET /users/me/change-requests').length).toBeGreaterThan(
        listRequestsBefore,
      );
    });
    expect(router.state.location.pathname).toBe(AppRoutes.CHANGE_REQUESTS);
  });
});

describe('without the ADMIN role', () => {
  const regularUser: UserDetail = { ...user, roles: [userRole] };

  it('shows the forbidden page and never lists change requests', async () => {
    const { sent } = renderChangeRequests({
      'GET /users/me': envelope(regularUser),
    });

    expect(
      await screen.findByText(i18n.t('forbidden.title')),
    ).toBeInTheDocument();
    expect(sent('GET /users/me/change-requests')).toHaveLength(0);
  });

  it('leaves the page out of the user menu', async () => {
    const { sent } = renderChangeRequests(
      { 'GET /users/me': envelope(regularUser) },
      AppRoutes.DASHBOARD,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(user.name) }),
    );

    expect(
      await screen.findByRole('link', { name: i18n.t('account.title') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: i18n.t('changeRequests.title') }),
    ).not.toBeInTheDocument();
    expect(sent('GET /users/me/change-requests')).toHaveLength(0);
  });
});

describe('pending change requests', () => {
  it('shows the pending count in the user menu and links to the page', async () => {
    const { router } = renderChangeRequests({}, AppRoutes.DASHBOARD);

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(user.name) }),
    );
    const link = await screen.findByRole('link', {
      name: i18n.t('changeRequests.title'),
    });
    await waitFor(() => {
      expect(link.closest('li')).toHaveTextContent('1');
    });
    fireEvent.click(link);

    expect(await findCard()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.CHANGE_REQUESTS);
  });

  it('links to the page from the account page when a request is pending', async () => {
    const { router } = renderChangeRequests({}, AppRoutes.ACCOUNT);

    expect(
      await screen.findByText(i18n.t('changeRequests.pending', { count: 1 })),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('link', { name: i18n.t('changeRequests.review') }),
    );

    expect(await findCard()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.CHANGE_REQUESTS);
  });
});
