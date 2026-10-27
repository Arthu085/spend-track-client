import { Button, Flex, Result, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { useConfirmEmail } from '../../infra/auth.queries';

export const ConfirmEmailPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const confirmEmailMutation = useConfirmEmail();
  const { showErrorWithLink } = useFeedbackModal();
  const requestNewLink = (
    <Link to={AppRoutes.RESEND_CONFIRMATION}>
      {t('auth.confirmEmail.requestNewLink')}
    </Link>
  );

  if (!token) {
    return (
      <Result
        status="error"
        title={t('auth.confirmEmail.missingTokenTitle')}
        subTitle={t('auth.confirmEmail.missingTokenSubtitle')}
        extra={requestNewLink}
      />
    );
  }

  if (confirmEmailMutation.isSuccess) {
    return (
      <Result
        status="success"
        title={t('auth.confirmEmail.successTitle')}
        subTitle={t('auth.confirmEmail.successSubtitle')}
        extra={<Link to={AppRoutes.LOGIN}>{t('auth.backToLogin')}</Link>}
      />
    );
  }

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>
        {t('auth.confirmEmail.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('auth.confirmEmail.subtitle')}
      </Typography.Text>
      <Button
        type="primary"
        block
        loading={confirmEmailMutation.isPending}
        onClick={() => {
          confirmEmailMutation.mutate(token, {
            onError: (error) => {
              showErrorWithLink(error, {
                to: AppRoutes.RESEND_CONFIRMATION,
                label: t('auth.confirmEmail.requestNewLink'),
              });
            },
          });
        }}
      >
        {t('auth.confirmEmail.submit')}
      </Button>
    </Flex>
  );
};
