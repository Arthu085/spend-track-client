import { Button, Flex, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ApiResponse } from '@/core/http/api-envelope';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type ChangeOwnPasswordForm as ChangeOwnPasswordValues,
  changeOwnPasswordFormSchema,
  confirmNewPasswordSchema,
} from '../../domain/user-form.schemas';
import { useChangeOwnPassword } from '../../infra/users.queries';
import { useSessionsEndedNotification } from '../use-sessions-ended-notification';
import { AccountSectionTitle } from './account-section-title';

type ChangeOwnPasswordFormValues = ChangeOwnPasswordValues & {
  confirmNewPassword: string;
};

export const ChangeOwnPasswordForm = () => {
  const { t } = useTranslation();
  const notifySessionsEnded = useSessionsEndedNotification();
  const { showError } = useFeedbackModal();
  const changePasswordMutation = useChangeOwnPassword();
  const { shape } = changeOwnPasswordFormSchema;

  const notifyPasswordChanged = ({ meta }: ApiResponse<null>) => {
    notifySessionsEnded({
      title: meta.message ?? t('account.password.changed'),
    });
  };

  const handleFinish = (values: ChangeOwnPasswordFormValues) => {
    changePasswordMutation.mutate(changeOwnPasswordFormSchema.parse(values), {
      onSuccess: notifyPasswordChanged,
      onError: showError,
    });
  };

  return (
    <Flex vertical gap="middle">
      <AccountSectionTitle>{t('account.password.title')}</AccountSectionTitle>
      <Typography.Text type="secondary">
        {t('account.password.description')}
      </Typography.Text>
      <Form<ChangeOwnPasswordFormValues>
        name="change-own-password"
        aria-label={t('account.password.title')}
        layout="vertical"
        requiredMark={false}
        disabled={changePasswordMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="currentPassword"
          label={t('account.fields.currentPassword')}
          rules={[zodRule(shape.currentPassword)]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('account.fields.newPassword')}
          rules={[zodRule(shape.newPassword)]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmNewPassword"
          label={t('account.fields.confirmNewPassword')}
          dependencies={['newPassword']}
          rules={[
            ({ getFieldValue }) =>
              zodRule(confirmNewPasswordSchema(getFieldValue('newPassword'))),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={changePasswordMutation.isPending}
        >
          {t('account.password.submit')}
        </Button>
      </Form>
    </Flex>
  );
};
