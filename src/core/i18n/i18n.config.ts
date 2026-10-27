import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';
import {
  DEFAULT_LANGUAGE,
  type Language,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
  toLanguage,
} from './language';
import { readStoredLanguage } from './language-preference';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

const localeAdapters: Record<
  Language,
  { dayjs: string; zod: typeof z.locales.en }
> = {
  'pt-BR': { dayjs: 'pt-br', zod: z.locales.ptBR },
  en: { dayjs: 'en', zod: z.locales.en },
};

const applyLanguage = (value: string) => {
  const language = toLanguage(value);
  const adapter = localeAdapters[language];

  document.documentElement.lang = language;
  dayjs.locale(adapter.dayjs);
  z.config(adapter.zod());
};

i18n.on('languageChanged', applyLanguage);

await i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en satisfies typeof ptBR },
  },
  lng: readStoredLanguage() ?? resolveLanguage(navigator.languages),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  load: 'currentOnly',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
