import type { RouteObject } from 'react-router';
import { NotFoundPage } from '@/core/pages/not-found.page';
import { RouteErrorPage } from '@/core/pages/route-error.page';
import { AbilityGuard } from '@/modules/authorization/presentation/guards/ability.guard';
import { AdminGuard } from '@/modules/authorization/presentation/guards/admin.guard';
import { AuthGuard } from '@/modules/auth/presentation/guards/auth.guard';
import { GuestGuard } from '@/modules/auth/presentation/guards/guest.guard';
import { AuthLayout } from '@/modules/auth/presentation/layouts/auth.layout';
import { AppRoutes } from './app-routes';

export const routes: RouteObject[] = [
  {
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        Component: AuthGuard,
        children: [
          {
            lazy: async () => ({
              Component: (await import('@/core/layout/main.layout')).MainLayout,
            }),
            children: [
              {
                path: AppRoutes.HOME,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/dashboard/presentation/pages/dashboard.page')
                  ).DashboardPage,
                }),
              },
              {
                path: AppRoutes.ACCOUNTS,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/accounts/presentation/pages/accounts.page')
                  ).AccountsPage,
                }),
              },
              {
                path: AppRoutes.FINANCIAL_SETTINGS,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/preferences/presentation/pages/financial-settings.page')
                  ).FinancialSettingsPage,
                }),
              },
              {
                path: AppRoutes.ACCOUNT,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/users/presentation/pages/account.page')
                  ).AccountPage,
                }),
              },
              {
                Component: AdminGuard,
                children: [
                  {
                    path: AppRoutes.CHANGE_REQUESTS,
                    lazy: async () => ({
                      Component: (
                        await import('@/modules/users/presentation/pages/change-requests.page')
                      ).ChangeRequestsPage,
                    }),
                  },
                ],
              },
              {
                element: (
                  <AbilityGuard ability={{ action: 'READ', subject: 'USER' }} />
                ),
                children: [
                  {
                    path: AppRoutes.USERS,
                    lazy: async () => ({
                      Component: (
                        await import('@/modules/users/presentation/pages/users.page')
                      ).UsersPage,
                    }),
                  },
                ],
              },
              {
                element: (
                  <AbilityGuard ability={{ action: 'READ', subject: 'ROLE' }} />
                ),
                children: [
                  {
                    path: AppRoutes.ROLES,
                    lazy: async () => ({
                      Component: (
                        await import('@/modules/authorization/presentation/pages/roles.page')
                      ).RolesPage,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        Component: GuestGuard,
        children: [
          {
            Component: AuthLayout,
            children: [
              {
                path: AppRoutes.LOGIN,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/auth/presentation/pages/login.page')
                  ).LoginPage,
                }),
              },
              {
                path: AppRoutes.FORGOT_PASSWORD,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/auth/presentation/pages/forgot-password.page')
                  ).ForgotPasswordPage,
                }),
              },
              {
                path: AppRoutes.RESEND_CONFIRMATION,
                lazy: async () => ({
                  Component: (
                    await import('@/modules/auth/presentation/pages/resend-confirmation.page')
                  ).ResendConfirmationPage,
                }),
              },
            ],
          },
        ],
      },
      {
        Component: AuthLayout,
        children: [
          {
            path: AppRoutes.RESET_PASSWORD,
            lazy: async () => ({
              Component: (
                await import('@/modules/auth/presentation/pages/reset-password.page')
              ).ResetPasswordPage,
            }),
          },
          {
            path: AppRoutes.CONFIRM_EMAIL,
            lazy: async () => ({
              Component: (
                await import('@/modules/auth/presentation/pages/confirm-email.page')
              ).ConfirmEmailPage,
            }),
          },
        ],
      },
      { path: AppRoutes.NOT_FOUND, Component: NotFoundPage },
    ],
  },
];
