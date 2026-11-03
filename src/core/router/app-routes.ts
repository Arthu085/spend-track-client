export const AppRoutes = {
  DASHBOARD: '/',
  HOME: '/home',
  TRANSACTIONS: '/transactions',
  RECURRENCES: '/recurrences',
  ACCOUNTS: '/accounts',
  CREDIT_CARDS: '/credit-cards',
  CREDIT_CARD_INVOICES: '/credit-cards/:uuid/invoices',
  CREDIT_CARD_PURCHASES: '/credit-card-purchases',
  FINANCIAL_SETTINGS: '/settings',
  USERS: '/users',
  ROLES: '/roles',
  ACCOUNT: '/account',
  CHANGE_REQUESTS: '/account/change-requests',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  CONFIRM_EMAIL: '/confirm-email',
  RESEND_CONFIRMATION: '/resend-confirmation',
  NOT_FOUND: '*',
} as const;

export const creditCardInvoicesPath = (cardUuid: string) =>
  AppRoutes.CREDIT_CARD_INVOICES.replace(':uuid', encodeURIComponent(cardUuid));
