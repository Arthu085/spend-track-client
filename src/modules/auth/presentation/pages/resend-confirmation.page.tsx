import { Button, Flex, Form, Input, Result, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { z } from 'zod';
import { AppRoutes } from '@/core/router/app-routes';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type ResendConfirmationForm,
  resendConfirmationFormSchema,
} from '../../domain/auth.schemas';
import { useResendConfirmation } from '../../infra/auth.queries';

const resendConfirmationStateSchema = z.object({ email: z.string() });

export const ResendConfirmationPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const resendConfirmationMutation = useResendConfirmation();
  const { showError } = useFeedbackModal();
  const initialEmail = resendConfirmationStateSchema.safeParse(location.state)
    .data?.email;
  const backToLogin = <Link to={AppRoutes.LOGIN}>{t('auth.backToLogin')}</Link>;

  if (resendConfirmationMutation.isSuccess) {
    return (
      <Result
        status="success"
        title={t('auth.resendConfirmation.sentTitle')}
        subTitle={t('auth.resendConfirmation.sentSubtitle')}
        extra={backToLogin}
      />
    );
  }

  const handleFinish = (values: ResendConfirmationForm) => {
    resendConfirmationMutation.mutate(
      resendConfirmationFormSchema.parse(values),
      { onError: showError },
    );
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>
        {t('auth.resendConfirmation.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.resendConfirmation.subtitle')}
      </Typography.Text>
      <Form<ResendConfirmationForm>
        layout="vertical"
        requiredMark={false}
        initialValues={{ email: initialEmail }}
        disabled={resendConfirmationMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="email"
          label={t('auth.fields.email')}
          rules={[zodRule(resendConfirmationFormSchema.shape.email)]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={resendConfirmationMutation.isPending}
        >
          {t('auth.resendConfirmation.submit')}
        </Button>
      </Form>
      {backToLogin}
    </Flex>
  );
};
