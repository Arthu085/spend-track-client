import { LogoutOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLogout } from '@/modules/auth/infra/auth.queries';
import { SidebarActionButton } from './sidebar-action-button';

export const SidebarLogoutButton = ({ collapsed }: { collapsed: boolean }) => {
  const { t } = useTranslation();
  const logoutMutation = useLogout();

  return (
    <SidebarActionButton
      collapsed={collapsed}
      icon={<LogoutOutlined />}
      label={t('auth.logout')}
      text={t('auth.logout')}
      loading={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
    />
  );
};
