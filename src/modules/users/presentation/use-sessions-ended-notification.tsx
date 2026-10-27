import { App, Flex } from 'antd';
import { useTranslation } from 'react-i18next';

interface SessionsEndedNotification {
  title: string;
  confirmNewEmail?: boolean;
}

export const useSessionsEndedNotification = () => {
  const { notification } = App.useApp();
  const { t } = useTranslation();

  return ({ title, confirmNewEmail = false }: SessionsEndedNotification) => {
    const sessionsEnded = t('account.updated.description');

    notification.info({
      title,
      description: confirmNewEmail ? (
        <Flex vertical>
          <span>{sessionsEnded}</span>
          <span>{t('account.updated.confirmNewEmail')}</span>
        </Flex>
      ) : (
        sessionsEnded
      ),
      duration: false,
    });
  };
};
