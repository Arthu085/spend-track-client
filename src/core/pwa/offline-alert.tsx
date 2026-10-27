import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from './use-online-status';

export const OfflineAlert = () => {
  const { t } = useTranslation();
  const online = useOnlineStatus();

  if (online) return null;

  return <Alert type="warning" banner title={t('pwa.offline')} />;
};
