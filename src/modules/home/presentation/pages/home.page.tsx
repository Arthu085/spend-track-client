import { Badge, Card, Col, Flex, Row, Skeleton, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { hasAdminRole } from '@/modules/authorization/domain/role.schema';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { useOwnChangeRequests } from '@/modules/users/infra/user-change-requests.queries';
import { homeShortcuts, visibleHomeShortcuts } from '../home-shortcuts';

export const HomePage = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { data: user } = useSession();
  const { data: abilities = [], isPending: abilitiesPending } = useAbilities();
  const { data: changeRequests = [] } = useOwnChangeRequests();

  const shortcuts = visibleHomeShortcuts(homeShortcuts, {
    abilities,
    isAdmin: user ? hasAdminRole(user.roles) : false,
  });

  return (
    <Flex vertical gap="large">
      <div>
        <Typography.Title level={2}>
          {t('home.greeting', { name: user?.name })}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('home.description')}
        </Typography.Text>
      </div>
      {abilitiesPending ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {shortcuts.map(({ path, labelKey, descriptionKey, icon: Icon }) => (
            <Col key={path} xs={24} md={12} xl={8}>
              <Link to={path} style={{ display: 'block', height: '100%' }}>
                <Card hoverable style={{ height: '100%' }}>
                  <Card.Meta
                    styles={{ title: { whiteSpace: 'normal' } }}
                    avatar={
                      <span style={{ fontSize: token.fontSizeHeading3 }}>
                        <Icon />
                      </span>
                    }
                    title={
                      <Flex justify="space-between" align="center" gap="small">
                        {t(labelKey)}
                        {path === AppRoutes.CHANGE_REQUESTS && (
                          <Badge count={changeRequests.length} />
                        )}
                      </Flex>
                    }
                    description={t(descriptionKey)}
                  />
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </Flex>
  );
};
