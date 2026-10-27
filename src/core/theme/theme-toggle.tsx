import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';
import { useTranslation } from 'react-i18next';
import { setThemeMode, useThemeMode } from './use-theme-mode';

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const isDark = useThemeMode() === 'dark';
  const label = t(isDark ? 'theme.switchToLight' : 'theme.switchToDark');

  return (
    <FloatButton
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      tooltip={label}
      aria-label={label}
      onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
    />
  );
};
