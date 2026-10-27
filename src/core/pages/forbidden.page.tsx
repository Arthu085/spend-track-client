import { Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';

export const ForbiddenPage = () => {
  const { t } = useTranslation();

  return (
    <Result
      status="403"
      title={t('forbidden.title')}
      subTitle={t('forbidden.subtitle')}
      extra={<Link to={AppRoutes.HOME}>{t('common.backToHome')}</Link>}
    />
  );
};
