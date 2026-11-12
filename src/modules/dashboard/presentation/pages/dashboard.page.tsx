import {
  CreditCardOutlined,
  PlusOutlined,
  TransactionOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Dropdown,
  Flex,
  Grid,
  type MenuProps,
  Row,
  Skeleton,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { CreditCardPurchaseFormModal } from '@/modules/credit-cards/presentation/components/credit-card-purchase-form.modal';
import { TransactionFormModal } from '@/modules/transactions/presentation/components/transaction-form.modal';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useDashboard } from '../../infra/dashboard.queries';
import { AccountBalancesCard } from '../components/account-balances.card';
import { AttentionStrip } from '../components/attention-strip';
import { BudgetCard } from '../components/budget.card';
import { CashFlowSummary } from '../components/cash-flow-summary';
import { CreditCardInvoicesCard } from '../components/credit-card-invoices.card';
import { DashboardHero } from '../components/dashboard-hero';
import { ExpensesByCategoryCard } from '../components/expenses-by-category.card';
import { InvestmentsCard } from '../components/investments.card';
import { budgetOfMonth } from '../components/month-links';
import { PeriodNavigator } from '../components/period-navigator';
import { PerspectiveSwitch } from '../components/perspective-switch';
import { UpcomingTransactionsCard } from '../components/upcoming-transactions.card';

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { sm, md } = Grid.useBreakpoint();
  const { data: user } = useSession();
  const [month, changeMonth] = useMonthParam();
  const { data: dashboard, error, isPending } = useDashboard(month);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [creatingPurchase, setCreatingPurchase] = useState(false);

  const createItems: MenuProps['items'] = [
    {
      key: 'transaction',
      icon: <TransactionOutlined />,
      label: t('dashboard.actions.transaction'),
      onClick: () => setCreatingTransaction(true),
    },
    {
      key: 'purchase',
      icon: <CreditCardOutlined />,
      label: t('dashboard.actions.purchase'),
      onClick: () => setCreatingPurchase(true),
    },
  ];

  return (
    <Flex vertical gap="large">
      <Flex vertical gap="middle">
        <Flex
          vertical={!sm}
          justify="space-between"
          align={sm ? 'start' : 'stretch'}
          gap="middle"
        >
          <div>
            <Typography.Title level={2}>
              {t('dashboard.greeting', { name: user?.name })}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('dashboard.description')}
            </Typography.Text>
          </div>
          <Dropdown menu={{ items: createItems }} trigger={['click']}>
            <Button type="primary" icon={<PlusOutlined />}>
              {t('dashboard.actions.create')}
            </Button>
          </Dropdown>
        </Flex>
        {dashboard && (
          <Flex
            vertical={!md}
            justify="space-between"
            align={md ? 'center' : 'start'}
            gap="middle"
          >
            <PeriodNavigator period={dashboard.period} onChange={changeMonth} />
            <PerspectiveSwitch value={dashboard.perspective} />
          </Flex>
        )}
      </Flex>
      {error && !dashboard && (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      )}
      {isPending && <Skeleton active />}
      {dashboard && (
        <>
          {dashboard.accounts.length === 0 && (
            <AccountBalancesCard accounts={dashboard.accounts} />
          )}
          <DashboardHero
            balances={dashboard.balances}
            guidance={dashboard.spendingGuidance}
            budget={dashboard.budget}
            period={dashboard.period}
          />
          <AttentionStrip dashboard={dashboard} />
          <CashFlowSummary
            income={dashboard.income}
            expenses={dashboard.expenses}
          />
          <BudgetCard
            budget={dashboard.budget}
            extra={
              <Link to={budgetOfMonth(dashboard.period)}>
                {t('dashboard.budget.manage')}
              </Link>
            }
          />
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} xl={14}>
              <UpcomingTransactionsCard
                period={dashboard.period}
                upcoming={dashboard.upcoming}
                upcomingCount={dashboard.upcomingCount}
              />
            </Col>
            <Col xs={24} xl={10}>
              <ExpensesByCategoryCard
                categories={dashboard.expensesByCategory}
                expenses={dashboard.expenses}
              />
            </Col>
          </Row>
          <CreditCardInvoicesCard creditCards={dashboard.creditCards} />
          <InvestmentsCard investments={dashboard.investments} />
          {dashboard.accounts.length > 0 && (
            <AccountBalancesCard accounts={dashboard.accounts} />
          )}
        </>
      )}
      <TransactionFormModal
        open={creatingTransaction}
        onClose={() => setCreatingTransaction(false)}
      />
      <CreditCardPurchaseFormModal
        open={creatingPurchase}
        onClose={() => setCreatingPurchase(false)}
      />
    </Flex>
  );
};
