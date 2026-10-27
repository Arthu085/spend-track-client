import { Button, Flex, Form, Input, Result, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type ForgotPasswordForm,
  forgotPasswordFormSchema,
} from '../../domain/auth.schemas';
import { useForgotPassword } from '../../infra/auth.queries';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const forgotPasswordMutation = useForgotPassword();
  const { showError } = useFeedbackModal();
  const backToLogin = <Link to={AppRoutes.LOGIN}>{t('auth.backToLogin')}</Link>;

  if (forgotPasswordMutation.isSuccess) {
    return (
      <Result
        status="success"
        title={t('auth.forgotPassword.sentTitle')}
        subTitle={t('auth.forgotPassword.sentSubtitle')}
        extra={backToLogin}
      />
    );
  }

  const handleFinish = (values: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(forgotPasswordFormSchema.parse(values), {
      onError: showError,
    });
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>
        {t('auth.forgotPassword.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.forgotPassword.subtitle')}
      </Typography.Text>
      <Form<ForgotPasswordForm>
        layout="vertical"
        requiredMark={false}
        disabled={forgotPasswordMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={[zodRule(forgotPasswordFormSchema.shape.email)]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={forgotPasswordMutation.isPending}
        >
          {t('auth.forgotPassword.submit')}
        </Button>
      </Form>
      {backToLogin}
    </Flex>
  );
};
