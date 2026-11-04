import {
  PlusOutlined,
  SettingOutlined,
  TransactionOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Row,
  Skeleton,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getApiErrorMessage } from '@/core/http/api-error';
import { AppRoutes } from '@/core/router/app-routes';
import {
  creditCardPurchasesPage,
  recurrencesPage,
} from '@/core/router/page-metadata';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { TransactionFormModal } from '@/modules/transactions/presentation/components/transaction-form.modal';
import { useMonthParam } from '@/shared/date/use-month-param';
import type { DashboardPeriod } from '../../domain/dashboard.schema';
import { useDashboard } from '../../infra/dashboard.queries';
import { AccountBalancesCard } from '../components/account-balances.card';
import { BalanceSummary } from '../components/balance-summary';
import { BudgetCard } from '../components/budget.card';
import { CashFlowSummary } from '../components/cash-flow-summary';
import { CreditCardInvoicesCard } from '../components/credit-card-invoices.card';
import { ExpensesByCategoryCard } from '../components/expenses-by-category.card';
import { InvestmentsCard } from '../components/investments.card';
import { PeriodNavigator } from '../components/period-navigator';
import { PerspectiveSwitch } from '../components/perspective-switch';
import { UpcomingTransactionsCard } from '../components/upcoming-transactions.card';

const pageShortcuts = [recurrencesPage, creditCardPurchasesPage];

const budgetOfMonth = ({ year, month }: DashboardPeriod) =>
  `${AppRoutes.BUDGETS}?${new URLSearchParams({
    year: String(year),
    month: String(month),
  }).toString()}`;

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { data: user } = useSession();
  const [month, changeMonth] = useMonthParam();
  const { data: dashboard, error, isPending } = useDashboard(month);
  const [creatingTransaction, setCreatingTransaction] = useState(false);

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
        <Flex gap="middle" align="center" wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreatingTransaction(true)}
          >
            {t('dashboard.actions.addTransaction')}
          </Button>
          <Link to={AppRoutes.TRANSACTIONS}>
            <TransactionOutlined /> {t('dashboard.actions.transactions')}
          </Link>
          {pageShortcuts.map(({ path, labelKey, icon: Icon }) => (
            <Link key={path} to={path}>
              <Icon /> {t(labelKey)}
            </Link>
          ))}
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
          {dashboard.accounts.length === 0 && (
            <AccountBalancesCard accounts={dashboard.accounts} />
          )}
          <BalanceSummary balances={dashboard.balances} />
          <CashFlowSummary
            income={dashboard.income}
            expenses={dashboard.expenses}
          />
          <BudgetCard
            budget={dashboard.budget}
            guidance={dashboard.spendingGuidance}
            extra={
              <Link to={budgetOfMonth(dashboard.period)}>
                {t('dashboard.budget.manage')}
              </Link>
            }
          />
          <Row gutter={[16, 16]}>
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
    </Flex>
  );
};
