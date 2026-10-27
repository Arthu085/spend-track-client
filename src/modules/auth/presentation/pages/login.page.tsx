import { Button, Flex, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getHttpStatus } from '@/core/http/api-error';
import { AppRoutes } from '@/core/router/app-routes';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { type LoginForm, loginFormSchema } from '../../domain/auth.schemas';
import { useLogin } from '../../infra/auth.queries';

const EMAIL_NOT_CONFIRMED_STATUS = 403;

export const LoginPage = () => {
  const { t } = useTranslation();
  const loginMutation = useLogin();
  const { showError, showErrorWithLink } = useFeedbackModal();

  const handleLoginError = (error: unknown, { email }: LoginForm) => {
    if (getHttpStatus(error) !== EMAIL_NOT_CONFIRMED_STATUS) {
      showError(error);
      return;
    }

    showErrorWithLink(error, {
      to: AppRoutes.RESEND_CONFIRMATION,
      state: { email },
      label: t('auth.login.resendConfirmation'),
    });
  };

  const handleFinish = (values: LoginForm) => {
    loginMutation.mutate(loginFormSchema.parse(values), {
      onError: handleLoginError,
    });
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>{t('auth.login.title')}</Typography.Title>
      <Form<LoginForm>
        layout="vertical"
        requiredMark={false}
        disabled={loginMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={[zodRule(loginFormSchema.shape.email)]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('auth.fields.password')}
          rules={[zodRule(loginFormSchema.shape.password)]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loginMutation.isPending}
        >
          {t('auth.login.submit')}
        </Button>
      </Form>
      <Link to={AppRoutes.FORGOT_PASSWORD}>
        {t('auth.login.forgotPassword')}
      </Link>
    </Flex>
  );
};
