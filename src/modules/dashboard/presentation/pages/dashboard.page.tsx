import { SettingOutlined, WalletOutlined } from '@ant-design/icons';
import { Alert, Card, Flex, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getApiErrorMessage } from '@/core/http/api-error';
import { AppRoutes } from '@/core/router/app-routes';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useDashboard } from '../../infra/dashboard.queries';
import { AccountBalancesCard } from '../components/account-balances.card';
import { BalanceSummary } from '../components/balance-summary';
import { PeriodNavigator } from '../components/period-navigator';
import { PerspectiveSwitch } from '../components/perspective-switch';

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const [month, changeMonth] = useMonthParam();
  const { data: dashboard, error, isPending } = useDashboard(month);

  return (
    <Flex vertical gap="large">
      <Flex justify="space-between" align="start" gap="middle" wrap>
        <div>
          <Typography.Title level={2}>
            {t('dashboard.greeting', { name: user?.name })}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('dashboard.description')}
          </Typography.Text>
        </div>
        <Flex gap="middle" wrap>
          <Link to={AppRoutes.ACCOUNTS}>
            <WalletOutlined /> {t('dashboard.actions.accounts')}
          </Link>
          <Link to={AppRoutes.FINANCIAL_SETTINGS}>
            <SettingOutlined /> {t('dashboard.actions.settings')}
          </Link>
        </Flex>
      </Flex>
      {error && !dashboard && (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      )}
      {isPending && <Skeleton active />}
      {dashboard && (
        <>
          <Card>
            <Flex justify="space-between" align="center" gap="middle" wrap>
              <PeriodNavigator
                period={dashboard.period}
                onChange={changeMonth}
              />
              <PerspectiveSwitch value={dashboard.perspective} />
            </Flex>
          </Card>
          <BalanceSummary balances={dashboard.balances} />
          <AccountBalancesCard accounts={dashboard.accounts} />
        </>
      )}
    </Flex>
  );
};
