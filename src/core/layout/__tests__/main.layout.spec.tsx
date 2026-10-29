import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/core/config/env.config';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { LANGUAGE_STORAGE_KEY } from '@/core/i18n/language-preference';
import { AppRoutes } from '@/core/router/app-routes';
import { setThemeMode } from '@/core/theme/use-theme-mode';
import type { UserDetail } from '@/modules/users/domain/user.schema';
import { dashboardRoute } from '@/test/dashboard-fixture';
import { csrfResponse, requestKey, stubHttpRoutes } from '@/test/http-stub';
import { createMatchMedia } from '@/test/match-media';
import { renderRoute } from '@/test/render-route';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../sidebar/use-sidebar-collapsed';

const user: UserDetail = {
  uuid: '6f1c2a54-2d0e-4a4b-9a43-2f1f1d7c9b10',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  statusLabel: 'Active',
  roles: [],
  email: 'ada@example.com',
  emailConfirmedAt: '2026-01-01T00:00:00.000Z',
  creatorName: null,
  updaterName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (data: unknown) => ({ status: 200, data: { data, meta: {} } });

const signedInRoutes = {
  ...dashboardRoute,
  'GET /users/me': envelope(user),
  'GET /users/me/abilities': envelope([{ action: 'READ', subject: 'USER' }]),
  'GET /users/me/change-requests': envelope([]),
};

const sidebarToggle = () =>
  screen.findByRole('button', { name: i18n.t('layout.toggleSidebar') });

const titleLink = () => screen.getByRole('link', { name: env.appName });

const navigationLink = (name: string) =>
  within(
    screen.getByRole('navigation', { name: i18n.t('layout.navigation') }),
  ).findByRole('link', { name });

const sectionButton = (name: string) =>
  within(
    screen.getByRole('navigation', { name: i18n.t('layout.navigation') }),
  ).findByRole('menuitem', { name });

const sidebarButtons = async () =>
  within(await screen.findByRole('complementary')).getAllByRole('button');

const stubSmallScreen = () => {
  vi.spyOn(window, 'matchMedia').mockImplementation(createMatchMedia(375));
};

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('pt-BR');
});

describe('MainLayout', () => {
  it('renders the navigation, the signed-in user, and the page', async () => {
    const requests = stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const navigation = await screen.findByRole('navigation', {
      name: i18n.t('layout.navigation'),
    });
    expect(
      within(navigation).getByRole('link', {
        name: i18n.t('navigation.dashboard'),
      }),
    ).toHaveAttribute('href', AppRoutes.HOME);
    const administration = await sectionButton(
      i18n.t('navigationSections.administration'),
    );
    expect(administration).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(navigation).queryByRole('link', {
        name: i18n.t('navigation.users'),
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(administration);

    expect(administration).toHaveAttribute('aria-expanded', 'true');
    expect(
      await within(navigation).findByRole('link', {
        name: i18n.t('navigation.users'),
      }),
    ).toHaveAttribute('href', AppRoutes.USERS);
    expect(
      await screen.findByText(
        i18n.t('dashboard.greeting', { name: user.name }),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(user.name)).toBeInTheDocument();
    await waitFor(() => {
      expect(requests.map(requestKey)).toContain('GET /users/me/abilities');
    });
  });

  it('opens the section of the current page', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.USERS);

    await sidebarToggle();
    expect(
      await sectionButton(i18n.t('navigationSections.administration')),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(await navigationLink(i18n.t('navigation.users'))).toHaveAttribute(
      'href',
      AppRoutes.USERS,
    );
  });

  it('switches the language, remembers the choice, and refetches localized data', async () => {
    const requests = stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const switcher = await screen.findByRole('combobox', {
      name: i18n.t('language.label'),
    });
    await waitFor(() => {
      expect(requests.map(requestKey)).toContain('GET /users/me/abilities');
    });
    const requestsBeforeSwitch = requests.length;

    fireEvent.mouseDown(switcher);
    fireEvent.click(await screen.findByTitle('English'));

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    await waitFor(() => {
      expect(requests.slice(requestsBeforeSwitch).map(requestKey)).toEqual(
        expect.arrayContaining(['GET /users/me', 'GET /users/me/abilities']),
      );
    });
  });

  it('switches the theme from the sidebar', async () => {
    act(() => setThemeMode('light'));
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const sider = await screen.findByRole('complementary');
    fireEvent.click(
      within(sider).getByRole('button', {
        name: i18n.t('theme.switchToDark'),
      }),
    );
    expect(localStorage.getItem('theme-mode')).toBe('dark');

    fireEvent.click(
      within(sider).getByRole('button', {
        name: i18n.t('theme.switchToLight'),
      }),
    );
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });

  it('signs out from the bottom of the sidebar', async () => {
    const requests = stubHttpRoutes(httpClient, {
      ...signedInRoutes,
      'GET /auth/csrf': csrfResponse('token'),
      'POST /auth/logout': envelope(null),
    });

    renderRoute(AppRoutes.HOME);

    const logoutButton = (await sidebarButtons()).at(-1);
    expect(logoutButton).toHaveAccessibleName(i18n.t('auth.logout'));
    expect(logoutButton).toHaveTextContent(i18n.t('auth.logout'));

    fireEvent.click(logoutButton!);

    expect(
      await screen.findByRole('heading', { name: i18n.t('auth.login.title') }),
    ).toBeInTheDocument();
    expect(requests.map(requestKey)).toContain('POST /auth/logout');
  });

  it('names the sidebar logout button when the sidebar is collapsed', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const logoutButton = (await sidebarButtons()).at(-1);
    expect(logoutButton).toHaveAccessibleName(i18n.t('auth.logout'));
    expect(logoutButton).not.toHaveTextContent(i18n.t('auth.logout'));
  });

  it('links the sidebar title to the home page', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.USERS);

    await sidebarToggle();
    expect(titleLink()).toHaveAttribute('href', AppRoutes.HOME);
    expect(titleLink()).toHaveTextContent(env.appName);
  });

  it('opens the sidebar by default and remembers when it is collapsed', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const toggle = await sidebarToggle();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
    expect(titleLink()).toHaveAttribute('href', AppRoutes.HOME);
    expect(titleLink()).toHaveTextContent(env.appMark);
    expect(
      screen.queryByText(i18n.t('navigationSections.finances')),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');
  });

  it('starts collapsed when the user collapsed it before', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    expect(await sidebarToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the navigation in a drawer on small screens', async () => {
    stubSmallScreen();
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const toggle = await sidebarToggle();
    expect(document.querySelector('.ant-layout-sider')).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: i18n.t('layout.navigation') }),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('layout.navigation'),
    });
    expect(toggle).toHaveAttribute('aria-controls', drawer.id);
    expect(titleLink()).toHaveTextContent(env.appName);
    expect(
      within(drawer).getByRole('button', {
        name: i18n.t('theme.switchToDark'),
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      await sectionButton(i18n.t('navigationSections.administration')),
    );
    const usersLink = await navigationLink(i18n.t('navigation.users'));

    fireEvent.click(usersLink);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it('closes the navigation drawer with the Escape key', async () => {
    stubSmallScreen();
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const toggle = await sidebarToggle();
    fireEvent.click(toggle);
    const drawer = await screen.findByRole('dialog', {
      name: i18n.t('layout.navigation'),
    });

    fireEvent.keyDown(drawer, { key: 'Escape' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the collapsible sidebar on large screens', async () => {
    stubHttpRoutes(httpClient, signedInRoutes);

    renderRoute(AppRoutes.HOME);

    const toggle = await sidebarToggle();
    const sider = document.querySelector('.ant-layout-sider');
    expect(sider).not.toBeNull();
    expect(toggle).toHaveAttribute('aria-controls', sider?.id);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
