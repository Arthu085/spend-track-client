import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { LANGUAGE_STORAGE_KEY } from '@/core/i18n/language-preference';
import { csrfResponse, stubHttpRoutes } from '@/test/http-stub';
import App from '../App';

const stubSignedOut = () =>
  stubHttpRoutes(httpClient, {
    'GET /users/me': { status: 401 },
    'GET /auth/csrf': csrfResponse('token-1'),
    'POST /auth/refresh': { status: 401 },
  });

afterEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('pt-BR');
});

describe('App', () => {
  it('renders the login page for a visitor without a session', async () => {
    stubSignedOut();

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
  });

  it('follows a language chosen in another tab', async () => {
    stubSignedOut();
    render(<App />);
    await screen.findByRole('heading', { name: i18n.t('auth.login.title') });

    // The browser fires `storage` only in the other tabs of the origin.
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LANGUAGE_STORAGE_KEY,
          newValue: 'en',
        }),
      );
    });

    expect(
      await screen.findByRole('heading', {
        name: i18n.getFixedT('en')('auth.login.title'),
      }),
    ).toBeInTheDocument();
    expect(i18n.language).toBe('en');
  });
});
