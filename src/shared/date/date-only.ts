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

export const CALENDAR_TIME_ZONE = 'America/Sao_Paulo';

const calendarDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const todayDateOnly = (now: Date = new Date()): string => {
  const parts = calendarDateFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
};
