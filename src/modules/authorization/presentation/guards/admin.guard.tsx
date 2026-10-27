import { Outlet } from 'react-router';
import { ForbiddenPage } from '@/core/pages/forbidden.page';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { hasAdminRole } from '../../domain/role.schema';

export const AdminGuard = () => {
  const { data: user } = useSession();

  if (!user || !hasAdminRole(user.roles)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
};
