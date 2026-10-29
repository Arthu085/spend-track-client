import { Navigate, Outlet } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { PageLoader } from '@/shared/components/page-loader';
import { useSession } from '../../infra/auth.queries';

export const GuestGuard = () => {
  const { data: user, isPending } = useSession();

  if (isPending) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to={AppRoutes.DASHBOARD} replace />;
  }

  return <Outlet />;
};
