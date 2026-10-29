import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { setThemeMode, useThemeMode } from '@/core/theme/use-theme-mode';
import { SidebarActionButton } from './sidebar-action-button';

export const SidebarThemeToggle = ({ collapsed }: { collapsed: boolean }) => {
  const { t } = useTranslation();
  const isDark = useThemeMode() === 'dark';

  return (
    <SidebarActionButton
      collapsed={collapsed}
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      label={t(isDark ? 'theme.switchToLight' : 'theme.switchToDark')}
      text={t(isDark ? 'theme.light' : 'theme.dark')}
      onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
    />
  );
};
