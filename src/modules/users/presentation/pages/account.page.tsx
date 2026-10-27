import { Alert, Col, Flex, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { useOwnChangeRequests } from '../../infra/user-change-requests.queries';
import { AccountAccessPanel } from '../components/account-access.panel';
import { ChangeOwnPasswordForm } from '../components/change-own-password.form';
import { OwnProfileForm } from '../components/own-profile.form';

export const AccountPage = () => {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const { data: changeRequests = [] } = useOwnChangeRequests();

  if (!user) {
    return null;
  }

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2}>{t('account.title')}</Typography.Title>
      {changeRequests.length > 0 && (
        <Alert
          type="info"
          showIcon
          title={t('changeRequests.pending', { count: changeRequests.length })}
          action={
            <Link to={AppRoutes.CHANGE_REQUESTS}>
              {t('changeRequests.review')}
            </Link>
          }
        />
      )}
      <Row gutter={[48, 24]}>
        <Col xs={24} lg={10}>
          <Flex vertical gap="large">
            <OwnProfileForm user={user} />
            <ChangeOwnPasswordForm />
          </Flex>
        </Col>
        <Col xs={24} lg={14}>
          <AccountAccessPanel user={user} />
        </Col>
      </Row>
    </Flex>
  );
};
