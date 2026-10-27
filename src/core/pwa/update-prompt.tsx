import { App, Button } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_NOTIFICATION_KEY = 'pwa-update';

export const UpdatePrompt = () => {
  const { t } = useTranslation();
  const { notification } = App.useApp();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;

    notification.info({
      key: UPDATE_NOTIFICATION_KEY,
      title: t('pwa.update.title'),
      description: t('pwa.update.description'),
      duration: false,
      actions: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            updateServiceWorker().catch(() => undefined);
          }}
        >
          {t('pwa.update.reload')}
        </Button>
      ),
      onClose: () => setNeedRefresh(false),
    });
  }, [needRefresh, notification, setNeedRefresh, t, updateServiceWorker]);

  return null;
};
