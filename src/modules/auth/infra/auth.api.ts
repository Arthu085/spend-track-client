import { parseApiData } from '@/core/http/api-envelope';
import { getHttpStatus } from '@/core/http/api-error';
import { httpClient } from '@/core/http/http-client';
import {
  type UserDetail,
  userDetailSchema,
} from '@/modules/users/domain/user.schema';
import type {
  ForgotPasswordForm,
  LoginForm,
  ResendConfirmationForm,
} from '../domain/auth.schemas';

const SIGNED_OUT_STATUSES = new Set([401, 403]);

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export const fetchSessionUser = async (): Promise<UserDetail | null> => {
  try {
    const response = await httpClient.get<unknown>('/users/me');

    return parseApiData(userDetailSchema, response.data);
  } catch (error) {
    if (SIGNED_OUT_STATUSES.has(getHttpStatus(error) ?? 0)) {
      return null;
    }

    throw error;
  }
};

// Login sets the shared auth cookies, so it waits for a refresh running in another tab, whose
// response would otherwise overwrite them with the previous session's tokens.
export const login = async (credentials: LoginForm): Promise<UserDetail> => {
  const response = await httpClient.withSessionLock(() =>
    httpClient.post<unknown>('/auth/login', credentials),
  );

  return parseApiData(userDetailSchema, response.data);
};

export const logout = async (): Promise<void> => {
  try {
    await httpClient.post('/auth/logout');
  } finally {
    httpClient.clearCsrfToken();
  }
};

export const requestPasswordReset = async (
  payload: ForgotPasswordForm,
): Promise<void> => {
  await httpClient.post('/auth/forgot-password', payload);
};

export const resetPassword = async (
  payload: ResetPasswordPayload,
): Promise<void> => {
  await httpClient.post('/auth/reset-password', payload);
};

export const confirmEmail = async (token: string): Promise<void> => {
  await httpClient.post('/users/confirm-email', { token });
};

export const resendEmailConfirmation = async (
  payload: ResendConfirmationForm,
): Promise<void> => {
  await httpClient.post('/users/resend-confirmation', payload);
};
