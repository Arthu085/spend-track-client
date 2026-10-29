import { Grid, Layout, theme } from 'antd';
import { useId, useState } from 'react';
import { Outlet } from 'react-router';
import { OfflineAlert } from '@/core/pwa/offline-alert';
import { MainHeader } from './header/main-header';
import { MainSidebar } from './sidebar/main-sidebar';
import { useSidebarCollapsed } from './sidebar/use-sidebar-collapsed';

export const MainLayout = () => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const sidebarId = useId();
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSmallScreen = !screens.lg;
  const sidebarExpanded = isSmallScreen ? drawerOpen : !collapsed;
  const gutter = isSmallScreen ? token.padding : token.paddingLG;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <MainSidebar
        id={sidebarId}
        isSmallScreen={isSmallScreen}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />
      <Layout style={{ minWidth: 0 }}>
        <MainHeader
          sidebarId={sidebarId}
          sidebarExpanded={sidebarExpanded}
          onToggleSidebar={
            isSmallScreen ? () => setDrawerOpen(true) : toggleCollapsed
          }
          gutter={gutter}
        />
        <OfflineAlert />
        <Layout.Content style={{ padding: gutter }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};
