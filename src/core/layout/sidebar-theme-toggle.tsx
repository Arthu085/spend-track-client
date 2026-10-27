import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button, theme, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { setThemeMode, useThemeMode } from '@/core/theme/use-theme-mode';

export const SidebarThemeToggle = ({ collapsed }: { collapsed: boolean }) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const isDark = useThemeMode() === 'dark';
  const label = t(isDark ? 'theme.switchToLight' : 'theme.switchToDark');

  return (
    <div
      style={{
        padding: token.paddingXS,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Tooltip title={collapsed ? label : undefined} placement="right">
        <Button
          type="text"
          block
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          aria-label={label}
          onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingInline: collapsed ? 0 : token.padding,
          }}
        >
          {collapsed ? null : t(isDark ? 'theme.light' : 'theme.dark')}
        </Button>
      </Tooltip>
    </div>
  );
};
