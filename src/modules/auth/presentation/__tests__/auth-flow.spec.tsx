import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { getAdapter } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { dashboardRoute } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import {
  csrfResponse,
  requestBody,
  requestKey,
  stubHttpRoutes,
} from '@/test/http-stub';
import { renderRoute } from '@/test/render-route';

const user: UserDetail = {
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Active',
  roles: [
    {
      uuid: 'b7e3c0a1-4c55-4f0e-8f0a-0d3f0f6e2a11',
      role: 'ADMIN',
      roleLabel: 'Administrator',
      status: 'ACTIVE',
      statusLabel: 'Active',
    },
  ],
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const layoutRoutes = {
  ...dashboardRoute,
  'GET /users/me/abilities': envelope([]),
  'GET /users/me/change-requests': envelope([]),
};

const signedOutRoutes = {
  'GET /users/me': { status: 401 },
  'GET /auth/csrf': csrfResponse('token-1'),
  'POST /auth/refresh': { status: 401 },
};

const fillField = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const submit = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

beforeEach(() => {
  httpClient.clearCsrfToken();
});

describe('authentication guards', () => {
  it.each([
    [AppRoutes.LOGIN, 'auth.login.title'],
    [AppRoutes.FORGOT_PASSWORD, 'auth.forgotPassword.title'],
    [AppRoutes.RESEND_CONFIRMATION, 'auth.resendConfirmation.title'],
  ] as const)(
    'waits for the session before mounting the auth card at %s',
    async (path, titleKey) => {
      stubHttpRoutes(httpClient, signedOutRoutes);
      const adapter = getAdapter(httpClient.defaults.adapter);
      let releaseSession: (() => void) | undefined;
      const sessionReady = new Promise<void>((resolve) => {
        releaseSession = resolve;
      });
      httpClient.defaults.adapter = async (config) => {
        if (config.url === '/users/me') {
          await sessionReady;
        }

        return adapter(config);
      };

      renderRoute(path);

      await waitFor(() => {
        expect(document.querySelector('.ant-spin')).toBeInTheDocument();
      });
      expect(document.querySelector('.ant-card')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      releaseSession?.();

      expect(
        await screen.findByRole('heading', { name: i18n.t(titleKey) }),
      ).toBeInTheDocument();
      expect(document.querySelector('.ant-card')).toBeInTheDocument();
    },
  );

  it('sends a visitor without a session to the login page', async () => {
    stubHttpRoutes(httpClient, signedOutRoutes);

    const { router } = renderRoute(AppRoutes.DASHBOARD);

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
  });

  it('sends a signed-in user away from guest pages', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(user),
      ...layoutRoutes,
    });

    const { router } = renderRoute(AppRoutes.LOGIN);

    expect(
      await screen.findByText(
        i18n.t('dashboard.greeting', { name: user.name }),
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.DASHBOARD);
  });

  it('signs the user out when a request fails after the session ends', async () => {
    stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(user),
      ...layoutRoutes,
      'GET /users': { status: 401 },
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 401 },
    });

    const { router, queryClient } = renderRoute(AppRoutes.DASHBOARD);
    await screen.findByText(i18n.t('dashboard.greeting', { name: user.name }));
    await queryClient
      .fetchQuery({
        queryKey: ['users'],
        queryFn: () => httpClient.get('/users'),
      })
      .catch(() => undefined);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
    });
  });
});

describe('LoginPage', () => {
  it('validates the form before calling the API', async () => {
    const requests = stubHttpRoutes(httpClient, signedOutRoutes);
    renderRoute(AppRoutes.LOGIN);

    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });
    const requestsBeforeSubmit = requests.length;
    submit(i18n.t('auth.login.submit'));

    expect(
      await screen.findAllByText(i18n.t('validation.required')),
    ).toHaveLength(2);
    expect(requests).toHaveLength(requestsBeforeSubmit);
  });

  it('signs in and always lands on home, not the page the user came from', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      ...layoutRoutes,
      'POST /auth/login': envelope(user),
    });
    const { router } = renderRoute(`${AppRoutes.USERS}?page=2`);

    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });
    fillField(i18n.t('auth.fields.email'), '  ada@example.com ');
    fillField(i18n.t('auth.fields.password'), 'secret');
    submit(i18n.t('auth.login.submit'));

    expect(
      await screen.findByText(
        i18n.t('dashboard.greeting', { name: user.name }),
      ),
    ).toBeInTheDocument();
    expect(router.state.location).toMatchObject({
      pathname: AppRoutes.DASHBOARD,
      search: '',
    });

    const login = requests.find(
      (request) => requestKey(request) === 'POST /auth/login',
    );
    expect(login && requestBody(login)).toEqual({
      email: 'ada@example.com',
      password: 'secret',
    });
  });

  it('shows the API error when the credentials are rejected', async () => {
    stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /auth/login': {
        status: 401,
        data: { statusCode: 401, message: 'Invalid credentials' },
      },
    });
    renderRoute(AppRoutes.LOGIN);

    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });
    fillField(i18n.t('auth.fields.email'), 'ada@example.com');
    fillField(i18n.t('auth.fields.password'), 'wrong');
    submit(i18n.t('auth.login.submit'));

    const dialog = await findDialog(i18n.t('feedback.error'));
    expect(dialog).toHaveTextContent('Invalid credentials');
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('logout', () => {
  it('ends the session and bootstraps a new CSRF token afterwards', async () => {
    let csrfCalls = 0;
    const requests = stubHttpRoutes(httpClient, {
      'GET /users/me': envelope(user),
      ...layoutRoutes,
      'GET /auth/csrf': () => csrfResponse(`token-${++csrfCalls}`),
      'POST /auth/logout': envelope(null),
      'POST /auth/login': envelope(user),
    });
    renderRoute(AppRoutes.DASHBOARD);

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(user.name) }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: new RegExp(i18n.t('auth.logout')),
      }),
    );
    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });
    fillField(i18n.t('auth.fields.email'), 'ada@example.com');
    fillField(i18n.t('auth.fields.password'), 'secret');
    submit(i18n.t('auth.login.submit'));

    await screen.findByText(i18n.t('dashboard.greeting', { name: user.name }));
    expect(
      requests.map(requestKey).filter((key) => !(key in layoutRoutes)),
    ).toEqual([
      'GET /users/me',
      'GET /auth/csrf',
      'POST /auth/logout',
      'GET /auth/csrf',
      'POST /auth/login',
    ]);
  });
});

describe('ForgotPasswordPage', () => {
  it('confirms the request without revealing whether the account exists', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /auth/forgot-password': envelope(null),
    });
    renderRoute(AppRoutes.FORGOT_PASSWORD);

    await screen.findByLabelText(i18n.t('auth.fields.email'));
    fillField(i18n.t('auth.fields.email'), 'ada@example.com');
    submit(i18n.t('auth.forgotPassword.submit'));

    expect(
      await screen.findByText(i18n.t('auth.forgotPassword.sentTitle')),
    ).toBeInTheDocument();
    const forgot = requests.find(
      (request) => requestKey(request) === 'POST /auth/forgot-password',
    );
    expect(forgot && requestBody(forgot)).toEqual({ email: 'ada@example.com' });
  });

  it('shows a failed request in an error dialog and keeps the form', async () => {
    stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /auth/forgot-password': {
        status: 429,
        data: { statusCode: 429, message: 'Too many requests' },
      },
    });
    renderRoute(AppRoutes.FORGOT_PASSWORD);

    await screen.findByLabelText(i18n.t('auth.fields.email'));
    fillField(i18n.t('auth.fields.email'), 'ada@example.com');
    submit(i18n.t('auth.forgotPassword.submit'));

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'Too many requests',
    );
    expect(screen.getByLabelText(i18n.t('auth.fields.email'))).toHaveValue(
      'ada@example.com',
    );
  });
});

describe('ResetPasswordPage', () => {
  it('explains that a link without a token is invalid', async () => {
    stubHttpRoutes(httpClient, signedOutRoutes);
    renderRoute(AppRoutes.RESET_PASSWORD);

    expect(
      await screen.findByText(i18n.t('auth.resetPassword.missingTokenTitle')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: i18n.t('auth.backToLogin') }),
    ).toHaveAttribute('href', AppRoutes.LOGIN);
  });

  it('links back to the login page from the form', async () => {
    stubHttpRoutes(httpClient, signedOutRoutes);
    const { router } = renderRoute(
      `${AppRoutes.RESET_PASSWORD}?token=reset-token`,
    );

    fireEvent.click(
      await screen.findByRole('link', { name: i18n.t('auth.backToLogin') }),
    );

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.LOGIN);
  });

  it('requires matching passwords', async () => {
    stubHttpRoutes(httpClient, signedOutRoutes);
    renderRoute(`${AppRoutes.RESET_PASSWORD}?token=reset-token`);

    await screen.findByLabelText(i18n.t('auth.fields.newPassword'));
    fillField(i18n.t('auth.fields.newPassword'), 'New-password1');
    fillField(i18n.t('auth.fields.confirmPassword'), 'Other-password1');
    submit(i18n.t('auth.resetPassword.submit'));

    expect(
      await screen.findByText(i18n.t('auth.resetPassword.passwordMismatch')),
    ).toBeInTheDocument();
  });

  it('requires an uppercase letter, a lowercase letter, a number, and a symbol', async () => {
    const requests = stubHttpRoutes(httpClient, signedOutRoutes);
    renderRoute(`${AppRoutes.RESET_PASSWORD}?token=reset-token`);

    await screen.findByLabelText(i18n.t('auth.fields.newPassword'));
    fillField(i18n.t('auth.fields.newPassword'), 'new-password');
    fillField(i18n.t('auth.fields.confirmPassword'), 'new-password');
    submit(i18n.t('auth.resetPassword.submit'));

    expect(
      await screen.findByText(i18n.t('validation.strongPassword', { min: 8 })),
    ).toBeInTheDocument();
    expect(requests.map(requestKey)).not.toContain('POST /auth/reset-password');
  });

  it('resets the password with the token from the link', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/reset-password': envelope(null),
    });
    renderRoute(`${AppRoutes.RESET_PASSWORD}?token=reset-token`);

    await screen.findByLabelText(i18n.t('auth.fields.newPassword'));
    fillField(i18n.t('auth.fields.newPassword'), 'New-password1');
    fillField(i18n.t('auth.fields.confirmPassword'), 'New-password1');
    submit(i18n.t('auth.resetPassword.submit'));

    expect(
      await screen.findByText(i18n.t('auth.resetPassword.successTitle')),
    ).toBeInTheDocument();
    const reset = requests.find(
      (request) => requestKey(request) === 'POST /auth/reset-password',
    );
    expect(reset && requestBody(reset)).toEqual({
      token: 'reset-token',
      password: 'New-password1',
    });
  });

  it('offers a new link in the error dialog when the token is rejected', async () => {
    stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /auth/reset-password': {
        status: 422,
        data: { statusCode: 422, message: 'Invalid reset link' },
      },
    });
    const { router } = renderRoute(
      `${AppRoutes.RESET_PASSWORD}?token=used-token`,
    );

    await screen.findByLabelText(i18n.t('auth.fields.newPassword'));
    fillField(i18n.t('auth.fields.newPassword'), 'New-password1');
    fillField(i18n.t('auth.fields.confirmPassword'), 'New-password1');
    submit(i18n.t('auth.resetPassword.submit'));

    const dialog = await findDialog(i18n.t('feedback.error'));
    expect(dialog).toHaveTextContent('Invalid reset link');
    fireEvent.click(
      within(dialog).getByRole('link', {
        name: i18n.t('auth.resetPassword.requestNewLink'),
      }),
    );

    expect(
      await screen.findByRole('heading', {
        name: i18n.t('auth.forgotPassword.title'),
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(AppRoutes.FORGOT_PASSWORD);
  });
});

describe('email confirmation', () => {
  it('offers to resend the confirmation when the email is not confirmed', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /auth/login': {
        status: 403,
        data: { statusCode: 403, message: 'Confirm your email' },
      },
      'POST /users/resend-confirmation': envelope(null),
    });
    const { router } = renderRoute(AppRoutes.LOGIN);

    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });
    fillField(i18n.t('auth.fields.email'), 'ada@example.com');
    fillField(i18n.t('auth.fields.password'), 'secret');
    submit(i18n.t('auth.login.submit'));

    const dialog = await findDialog(i18n.t('feedback.error'));
    expect(dialog).toHaveTextContent('Confirm your email');
    expect(
      requests.filter((request) => requestKey(request) === 'POST /auth/login'),
    ).toHaveLength(1);

    fireEvent.click(
      within(dialog).getByRole('link', {
        name: i18n.t('auth.login.resendConfirmation'),
      }),
    );
    await screen.findByRole('heading', {
      name: i18n.t('auth.resendConfirmation.title'),
    });
    expect(router.state.location.pathname).toBe(AppRoutes.RESEND_CONFIRMATION);
    expect(screen.getByLabelText(i18n.t('auth.fields.email'))).toHaveValue(
      'ada@example.com',
    );

    submit(i18n.t('auth.resendConfirmation.submit'));

    expect(
      await screen.findByText(i18n.t('auth.resendConfirmation.sentTitle')),
    ).toBeInTheDocument();
    const resend = requests.find(
      (request) => requestKey(request) === 'POST /users/resend-confirmation',
    );
    expect(resend && requestBody(resend)).toEqual({ email: 'ada@example.com' });
  });

  it('explains that a link without a token is invalid', async () => {
    stubHttpRoutes(httpClient, signedOutRoutes);
    renderRoute(AppRoutes.CONFIRM_EMAIL);

    expect(
      await screen.findByText(i18n.t('auth.confirmEmail.missingTokenTitle')),
    ).toBeInTheDocument();
  });

  it('confirms the email with the token from the link', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /users/confirm-email': envelope(null),
    });
    renderRoute(`${AppRoutes.CONFIRM_EMAIL}?token=confirm-token`);

    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('auth.confirmEmail.submit'),
      }),
    );

    expect(
      await screen.findByText(i18n.t('auth.confirmEmail.successTitle')),
    ).toBeInTheDocument();
    const confirm = requests.find(
      (request) => requestKey(request) === 'POST /users/confirm-email',
    );
    expect(confirm && requestBody(confirm)).toEqual({ token: 'confirm-token' });
  });

  it('offers a new link in the error dialog when the token is rejected', async () => {
    stubHttpRoutes(httpClient, {
      ...signedOutRoutes,
      'POST /users/confirm-email': {
        status: 422,
        data: { statusCode: 422, message: 'Invalid confirmation link' },
      },
    });
    renderRoute(`${AppRoutes.CONFIRM_EMAIL}?token=used-token`);

    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('auth.confirmEmail.submit'),
      }),
    );

    const dialog = await findDialog(i18n.t('feedback.error'));
    expect(dialog).toHaveTextContent('Invalid confirmation link');
    fireEvent.click(
      within(dialog).getByRole('link', {
        name: i18n.t('auth.confirmEmail.requestNewLink'),
      }),
    );

    expect(
      await screen.findByRole('heading', {
        name: i18n.t('auth.resendConfirmation.title'),
      }),
    ).toBeInTheDocument();
  });
});
