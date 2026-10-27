import { Drawer, Layout, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { SidebarNavigation } from './sidebar-navigation';

const SIDEBAR_WIDTH = 240;

type MainSidebarProps = {
  id: string;
  isSmallScreen: boolean;
  collapsed: boolean;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
};

export const MainSidebar = ({
  id,
  isSmallScreen,
  collapsed,
  drawerOpen,
  onCloseDrawer,
}: MainSidebarProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  if (isSmallScreen) {
    return (
      <Drawer
        id={id}
        aria-label={t('layout.navigation')}
        placement="left"
        size={SIDEBAR_WIDTH}
        closable={false}
        open={drawerOpen}
        onClose={onCloseDrawer}
        styles={{
          section: { background: token.colorBgContainer },
          body: { padding: 0 },
        }}
      >
        <SidebarNavigation collapsed={false} onNavigate={onCloseDrawer} />
      </Drawer>
    );
  }

  return (
    <Layout.Sider
      id={id}
      theme="light"
      width={SIDEBAR_WIDTH}
      collapsed={collapsed}
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <SidebarNavigation collapsed={collapsed} />
    </Layout.Sider>
  );
};
