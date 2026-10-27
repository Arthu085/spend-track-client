import { AxiosError, isAxiosError } from 'axios';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';

const TIMEOUT_CODES = new Set<string>([
  AxiosError.ECONNABORTED,
  AxiosError.ETIMEDOUT,
]);

const apiErrorBodySchema = z.object({
  message: z.string().min(1),
  auditId: z.string().trim().min(1).optional().catch(undefined),
});

export const getHttpStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

export const getApiErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) {
    return i18n.t('apiErrors.unexpected');
  }

  if (!error.response) {
    return TIMEOUT_CODES.has(error.code ?? '')
      ? i18n.t('apiErrors.timeout')
      : i18n.t('apiErrors.network');
  }

  const body = apiErrorBodySchema.safeParse(error.response.data);

  if (!body.success) {
    return i18n.t('apiErrors.unexpected');
  }

  const { message, auditId } = body.data;

  return auditId
    ? `${message} ${i18n.t('apiErrors.auditReference', { auditId })}`
    : message;
};
