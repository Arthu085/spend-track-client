import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { OfflineAlert } from '@/core/pwa/offline-alert';

export const RouteErrorPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <OfflineAlert />
      <Result
        status="error"
        title={t('routeError.title')}
        subTitle={t('routeError.subtitle')}
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            {t('common.reload')}
          </Button>
        }
      />
    </>
  );
};
