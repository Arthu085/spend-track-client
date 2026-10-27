import { Card, Flex, Typography } from 'antd';
import { Outlet } from 'react-router';
import { env } from '@/core/config/env.config';
import { LanguageSwitcher } from '@/core/i18n/language-switcher';
import { OfflineAlert } from '@/core/pwa/offline-alert';
import { ThemeToggle } from '@/core/theme/theme-toggle';

export const AuthLayout = () => (
  <Flex
    align="center"
    justify="center"
    style={{ minHeight: '100vh', padding: 16, boxSizing: 'border-box' }}
  >
    <Card style={{ width: '100%', maxWidth: 400 }}>
      <Flex vertical gap="large">
        <Flex align="center" justify="space-between" gap="small">
          <Typography.Text strong>{env.appName}</Typography.Text>
          <LanguageSwitcher />
        </Flex>
        <OfflineAlert />
        <Outlet />
      </Flex>
    </Card>
    <ThemeToggle />
  </Flex>
);
