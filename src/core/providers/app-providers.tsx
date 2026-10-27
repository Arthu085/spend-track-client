import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, type AppProps, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import ptBR from 'antd/locale/pt_BR';
import type { Locale } from 'antd/es/locale';
import { type PropsWithChildren, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createQueryClient } from '@/core/config/query-client.config';
import { applyDocumentTheme, themeConfigs } from '@/core/config/theme.config';
import { type Language, toLanguage } from '@/core/i18n/language';
import { useLanguageSync } from '@/core/i18n/use-change-language';
import { UpdatePrompt } from '@/core/pwa/update-prompt';
import { useThemeMode } from '@/core/theme/use-theme-mode';
import {
  clearSession,
  syncSessionAcrossTabs,
} from '@/modules/auth/infra/auth.queries';

const antdLocales: Record<Language, Locale> = {
  'pt-BR': ptBR,
  en: enUS,
};

const MAIN_HEADER_HEIGHT = 64;

// Ant Design 6 feedback list containers catch clicks beyond their visible notices (the message
// list spans the full width), so only the notices themselves should receive pointer events.
const clickThroughList = { listContent: { pointerEvents: 'none' } } as const;

const messageConfig: AppProps['message'] = {
  top: MAIN_HEADER_HEIGHT + 8,
  styles: clickThroughList,
};

const notificationConfig: AppProps['notification'] = {
  top: MAIN_HEADER_HEIGHT + 24,
  styles: clickThroughList,
};

const modalConfig = { centered: true };

const queryClient = createQueryClient({ onUnauthorized: clearSession });

const LanguageSync = () => {
  useLanguageSync();

  return null;
};

export const AppProviders = ({ children }: PropsWithChildren) => {
  const { i18n } = useTranslation();
  const language = toLanguage(i18n.language);
  const themeMode = useThemeMode();

  useEffect(() => {
    applyDocumentTheme(themeMode);
  }, [themeMode]);

  useEffect(() => syncSessionAcrossTabs(queryClient), []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageSync />
      <ConfigProvider
        theme={themeConfigs[themeMode]}
        locale={antdLocales[language]}
        modal={modalConfig}
      >
        <AntdApp message={messageConfig} notification={notificationConfig}>
          <UpdatePrompt />
          {children}
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};
