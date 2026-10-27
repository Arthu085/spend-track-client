import { env } from '@/core/config/env.config';
import i18n from '@/core/i18n/i18n.config';
import { createHttpClient } from './create-http-client';

export const httpClient = createHttpClient({
  baseURL: `${env.apiUrl}/api`,
  getLanguage: () => i18n.language,
});
