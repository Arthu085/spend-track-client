import { Button, Flex, Form, Input, Result, Typography } from 'antd';
import type { FormRule } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type ResetPasswordForm,
  resetPasswordFormSchema,
} from '../../domain/auth.schemas';
import { useResetPassword } from '../../infra/auth.queries';

type ResetPasswordFormValues = ResetPasswordForm & { confirmPassword: string };

export const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPasswordMutation = useResetPassword();
  const { showErrorWithLink } = useFeedbackModal();
  const backToLogin = <Link to={AppRoutes.LOGIN}>{t('auth.backToLogin')}</Link>;

  if (!token) {
    return (
      <Result
        status="error"
        title={t('auth.resetPassword.missingTokenTitle')}
        subTitle={t('auth.resetPassword.missingTokenSubtitle')}
        extra={
          <Flex vertical gap="small" align="center">
            <Link to={AppRoutes.FORGOT_PASSWORD}>
              {t('auth.resetPassword.requestNewLink')}
            </Link>
            {backToLogin}
          </Flex>
        }
      />
    );
  }

  if (resetPasswordMutation.isSuccess) {
    return (
      <Result
        status="success"
        title={t('auth.resetPassword.successTitle')}
        subTitle={t('auth.resetPassword.successSubtitle')}
        extra={backToLogin}
      />
    );
  }

  const confirmPasswordRule: FormRule = ({ getFieldValue }) => ({
    validator: (_rule, value: unknown) =>
      value === getFieldValue('password')
        ? Promise.resolve()
        : Promise.reject(new Error(t('auth.resetPassword.passwordMismatch'))),
  });

  const handleFinish = ({ password }: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(
      { token, password },
      {
        onError: (error) => {
          showErrorWithLink(error, {
            to: AppRoutes.FORGOT_PASSWORD,
            label: t('auth.resetPassword.requestNewLink'),
          });
        },
      },
    );
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>
        {t('auth.resetPassword.title')}
      </Typography.Title>
      <Form<ResetPasswordFormValues>
        layout="vertical"
        requiredMark={false}
        disabled={resetPasswordMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="password"
          label={t('auth.fields.newPassword')}
          rules={[zodRule(resetPasswordFormSchema.shape.password)]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('auth.fields.confirmPassword')}
          dependencies={['password']}
          rules={[confirmPasswordRule]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={resetPasswordMutation.isPending}
        >
          {t('auth.resetPassword.submit')}
        </Button>
      </Form>
      {backToLogin}
    </Flex>
  );
};
