import { App, Flex, Typography } from 'antd';
import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { getApiErrorMessage } from '@/core/http/api-error';

export interface WarningConfirmation {
  title: ReactNode;
  content: ReactNode;
  okText: ReactNode;
  onOk: () => void;
}

export interface ErrorLink {
  to: string;
  state?: unknown;
  label: ReactNode;
}

export const useFeedbackModal = () => {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const showError = (error: unknown) => {
    modal.error({
      title: t('feedback.error'),
      content: getApiErrorMessage(error),
    });
  };

  const showErrorWithLink = (
    error: unknown,
    { to, state, label }: ErrorLink,
  ) => {
    const followLink = (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      dialog.destroy();
      Promise.resolve(navigate(to, { state })).catch(() => undefined);
    };

    const dialog = modal.error({
      title: t('feedback.error'),
      content: (
        <Flex vertical gap="small" align="start">
          {getApiErrorMessage(error)}
          <Typography.Link href={to} onClick={followLink}>
            {label}
          </Typography.Link>
        </Flex>
      ),
    });
  };

  const confirmWarning = ({
    title,
    content,
    okText,
    onOk,
  }: WarningConfirmation) => {
    modal.warning({
      title,
      content,
      okText,
      okCancel: true,
      cancelText: t('common.cancel'),
      onOk,
    });
  };

  return { showError, showErrorWithLink, confirmWarning };
};
