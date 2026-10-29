import { type Language, toLanguage } from '@/core/i18n/language';

export const DATE_ONLY_FORMAT = 'YYYY-MM-DD';

const dateInputFormats: Record<Language, string> = {
  'pt-BR': 'DD/MM/YYYY',
  en: 'MM/DD/YYYY',
};

export const dateInputFormat = (language: string): string =>
  dateInputFormats[toLanguage(language)];

export const formatDateOnly = (date: string, language: string): string =>
  new Intl.DateTimeFormat(language, { timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
