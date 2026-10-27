import { Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <Result
      status="404"
      title={t('notFound.title')}
      subTitle={t('notFound.subtitle')}
      extra={<Link to={AppRoutes.HOME}>{t('common.backToHome')}</Link>}
    />
  );
};
