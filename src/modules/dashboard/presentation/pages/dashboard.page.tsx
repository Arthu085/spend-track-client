import {
  CreditCardOutlined,
  PlusOutlined,
  TransactionOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Dropdown,
  Flex,
  Grid,
  type MenuProps,
  Row,
  theme,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { CreditCardPurchaseFormModal } from '@/modules/credit-cards/presentation/components/credit-card-purchase-form.modal';
import { usePreferences } from '@/modules/preferences/infra/preferences.queries';
import { TransactionFormModal } from '@/modules/transactions/presentation/components/transaction-form.modal';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useDashboard } from '../../infra/dashboard.queries';
import { AccountBalancesCard } from '../components/account-balances.card';
import { AttentionStrip } from '../components/attention-strip';
import { BudgetCard } from '../components/budget.card';
import { CashFlowSummary } from '../components/cash-flow-summary';
import {
  CollapsedCardsContext,
  useCollapsedCards,
} from '../components/collapsed-cards';
import { CreditCardInvoicesCard } from '../components/credit-card-invoices.card';
import { DashboardHero } from '../components/dashboard-hero';
import { DashboardLoadError } from '../components/dashboard-load-error';
import {
  DashboardControlsSkeleton,
  DashboardSkeleton,
} from '../components/dashboard-skeleton';
import { ExpensesByCategoryCard } from '../components/expenses-by-category.card';
import { InvestmentsCard } from '../components/investments.card';
import { budgetOfMonth } from '../components/month-links';
import { PeriodNavigator } from '../components/period-navigator';
import { PerspectiveSwitch } from '../components/perspective-switch';
import { UpcomingTransactionsCard } from '../components/upcoming-transactions.card';

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { sm, md } = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const { data: user } = useSession();
  const [month, changeMonth] = useMonthParam();
  const {
    data: dashboard,
    error,
    isPending,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useDashboard(month);
  const { data: preferences, isPending: preferencesPending } = usePreferences();
  const collapsedCards = useCollapsedCards(
    preferences?.collapsedDashboardCards ?? [],
  );
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [creatingPurchase, setCreatingPurchase] = useState(false);

  const loadingCards = isPending || (Boolean(dashboard) && preferencesPending);

  const retry = () => {
    refetch().catch(() => undefined);
  };

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
        {!isPending && (
          <Flex
            vertical={!md}
            justify="space-between"
            align={md ? 'center' : 'start'}
            gap="middle"
          >
            <PeriodNavigator
              month={month}
              period={dashboard?.period}
              loading={isPlaceholderData}
              onChange={changeMonth}
            />
            {dashboard && <PerspectiveSwitch value={dashboard.perspective} />}
          </Flex>
        )}
        {isPending && <DashboardControlsSkeleton />}
      </Flex>
      {error && (
        <DashboardLoadError
          error={error}
          showingStaleData={Boolean(dashboard)}
          retrying={isFetching}
          onRetry={retry}
        />
      )}
      {loadingCards && <DashboardSkeleton />}
      {dashboard && !preferencesPending && (
        <CollapsedCardsContext value={collapsedCards}>
          <Flex
            vertical
            gap="large"
            aria-busy={isPlaceholderData}
            style={{
              opacity: isPlaceholderData ? token.opacityLoading : 1,
              transition: `opacity ${token.motionDurationMid}`,
            }}
          >
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
          </Flex>
        </CollapsedCardsContext>
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
