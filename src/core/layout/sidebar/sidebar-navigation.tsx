import { Flex, Menu, type MenuProps, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { env } from '@/core/config/env.config';
import { AppRoutes } from '@/core/router/app-routes';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { navigationSections, visibleNavigationSections } from './navigation';
import { SidebarLogoutButton } from './sidebar-logout-button';
import { SidebarThemeToggle } from './sidebar-theme-toggle';
import { useOpenSections } from './use-open-sections';

type MenuItem = NonNullable<MenuProps['items']>[number];

type SidebarNavigationProps = {
  collapsed: boolean;
  onNavigate?: () => void;
};

export const SidebarNavigation = ({
  collapsed,
  onNavigate,
}: SidebarNavigationProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { pathname } = useLocation();
  const { data: abilities = [] } = useAbilities();

  const sections = visibleNavigationSections(navigationSections, abilities);
  const activeSectionKey = sections.find(({ items }) =>
    items.some(({ path }) => path === pathname),
  )?.labelKey;
  const { openKeys, setOpenKeys } = useOpenSections(activeSectionKey);

  const menuItems = sections.flatMap<MenuItem>(({ labelKey, items }, index) => {
    const children = items.map(({ path, labelKey, icon: Icon }) => ({
      key: path,
      icon: <Icon />,
      label: <Link to={path}>{t(labelKey)}</Link>,
    }));

    if (collapsed) {
      return index === 0
        ? children
        : [{ type: 'divider', key: `${labelKey}-divider` }, ...children];
    }

    return [{ key: labelKey, label: t(labelKey), children }];
  });

  return (
    <Flex vertical style={{ height: '100%' }}>
      <Flex
        align="center"
        justify={collapsed ? 'center' : 'flex-start'}
        style={{
          height: 64,
          flexShrink: 0,
          paddingInline: collapsed ? 0 : 24,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <Link
          to={AppRoutes.HOME}
          aria-label={collapsed ? env.appName : undefined}
          onClick={onNavigate}
        >
          <Typography.Text strong>
            {collapsed ? env.appMark : env.appName}
          </Typography.Text>
        </Link>
      </Flex>
      <nav
        className="sidebar-navigation"
        aria-label={t('layout.navigation')}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={onNavigate}
          style={{ borderInlineEnd: 'none' }}
        />
      </nav>
      <Flex
        vertical
        gap={token.paddingXXS}
        style={{
          padding: token.paddingXS,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <SidebarThemeToggle collapsed={collapsed} />
        <SidebarLogoutButton collapsed={collapsed} />
      </Flex>
    </Flex>
  );
};
