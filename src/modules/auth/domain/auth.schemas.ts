import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';

export const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/;

const required = () => i18n.t('validation.required');
const maxLength = (max: number) => () =>
  i18n.t('validation.maxLength', { max });

export const emailSchema = z
  .string({ error: required })
  .trim()
  .min(1, { error: required })
  .max(EMAIL_MAX_LENGTH, { error: maxLength(EMAIL_MAX_LENGTH) })
  .pipe(z.email({ error: () => i18n.t('validation.email') }));

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: required })
    .min(1, { error: required })
    .max(PASSWORD_MAX_LENGTH, { error: maxLength(PASSWORD_MAX_LENGTH) }),
});

export const forgotPasswordFormSchema = z.object({
  email: emailSchema,
});

export const resendConfirmationFormSchema = z.object({
  email: emailSchema,
});

const strongPassword = () =>
  i18n.t('validation.strongPassword', { min: PASSWORD_MIN_LENGTH });

export const newPasswordSchema = z
  .string({ error: required })
  .min(PASSWORD_MIN_LENGTH, { error: strongPassword })
  .max(PASSWORD_MAX_LENGTH, { error: maxLength(PASSWORD_MAX_LENGTH) })
  .regex(STRONG_PASSWORD_PATTERN, { error: strongPassword });

export const resetPasswordFormSchema = z.object({
  password: newPasswordSchema,
});

export type LoginForm = z.infer<typeof loginFormSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordFormSchema>;
export type ResendConfirmationForm = z.infer<
  typeof resendConfirmationFormSchema
>;
export type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;
