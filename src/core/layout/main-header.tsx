import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Layout, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/core/i18n/language-switcher';
import { UserMenu } from './user-menu';

type MainHeaderProps = {
  sidebarId: string;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  gutter: number;
};

export const MainHeader = ({
  sidebarId,
  sidebarExpanded,
  onToggleSidebar,
  gutter,
}: MainHeaderProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <Layout.Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: token.marginSM,
        paddingInline: gutter,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Button
        type="text"
        icon={sidebarExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        aria-label={t('layout.toggleSidebar')}
        aria-expanded={sidebarExpanded}
        aria-controls={sidebarId}
        onClick={onToggleSidebar}
        style={{ marginInlineEnd: 'auto' }}
      />
      <LanguageSwitcher />
      <UserMenu />
    </Layout.Header>
  );
};
