import { CheckOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Empty,
  Flex,
  type TableColumnsType,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import {
  type CompletableTransaction,
  CompleteTransactionModal,
} from '@/modules/transactions/presentation/components/complete-transaction.modal';
import { ConfirmPendingTransactionsModal } from '@/modules/transactions/presentation/components/confirm-pending-transactions.modal';
import { TransactionAmount } from '@/modules/transactions/presentation/components/transaction-amount';
import { EqualHeightCard } from '@/shared/components/equal-height-card';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import type {
  DashboardPeriod,
  DashboardUpcoming,
} from '../../domain/dashboard.schema';
import { PlannedDate } from './planned-date';
import { ResponsiveTable } from './responsive-table';

interface UpcomingTransactionsCardProps {
  period: DashboardPeriod;
  upcoming: DashboardUpcoming[];
  upcomingCount: number;
}

const transactionsOfMonth = ({ year, month }: DashboardPeriod) =>
  `${AppRoutes.TRANSACTIONS}?${new URLSearchParams({
    year: String(year),
    month: String(month),
  }).toString()}`;

export const UpcomingTransactionsCard = ({
  period,
  upcoming,
  upcomingCount,
}: UpcomingTransactionsCardProps) => {
  const { t } = useTranslation();
  const completing = useModalTarget<CompletableTransaction>();
  const [confirmingPending, setConfirmingPending] = useState(false);

  const route = ({
    category,
    account,
    destinationAccount,
  }: DashboardUpcoming) =>
    category ? (
      <Badge color={category.color ?? undefined} text={category.name} />
    ) : (
      destinationAccount &&
      t('transactions.transferRoute', {
        from: account.name,
        to: destinationAccount.name,
      })
    );

  const completeAction = ({ uuid, description }: DashboardUpcoming) => (
    <IconActionButton
      size="small"
      icon={<CheckOutlined />}
      label={t('transactions.actions.complete', { description })}
      onClick={() => completing.show({ uuid, description })}
    />
  );

  const columns: TableColumnsType<DashboardUpcoming> = [
    {
      title: t('transactions.fields.date'),
      dataIndex: 'date',
      render: (_, { date, overdue }) => (
        <PlannedDate date={date} overdue={overdue} />
      ),
    },
    {
      title: t('transactions.fields.description'),
      dataIndex: 'description',
      render: (_, transaction) => (
        <Flex vertical>
          {transaction.description}
          <Typography.Text type="secondary">
            {route(transaction)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('transactions.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, transaction) => (
        <TransactionAmount transaction={transaction} />
      ),
    },
    {
      title: t('transactions.fields.actions'),
      key: 'actions',
      render: (_, transaction) => completeAction(transaction),
    },
  ];

  return (
    <EqualHeightCard
      title={t('dashboard.upcoming.title')}
      extra={
        <Link to={transactionsOfMonth(period)}>
          {t('dashboard.upcoming.viewAll')}
        </Link>
      }
    >
      {upcoming.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('dashboard.upcoming.empty')}
        />
      ) : (
        <Flex vertical gap="small">
          <Flex justify="space-between" align="center" gap="small" wrap>
            <Typography.Text type="secondary">
              {t('dashboard.upcoming.hint')}
            </Typography.Text>
            <Button
              icon={<CheckOutlined />}
              onClick={() => {
                setConfirmingPending(true);
              }}
            >
              {t('transactions.confirmPending.open')}
            </Button>
          </Flex>
          <ResponsiveTable
            columns={columns}
            dataSource={upcoming}
            compactRow={(transaction) => ({
              title: transaction.description,
              description: route(transaction),
              amount: <TransactionAmount transaction={transaction} />,
              action: completeAction(transaction),
              extra: (
                <PlannedDate
                  date={transaction.date}
                  overdue={transaction.overdue}
                />
              ),
            })}
          />
          {upcomingCount > upcoming.length && (
            <Typography.Text type="secondary">
              {t('dashboard.upcoming.partial', {
                shown: upcoming.length,
                count: upcomingCount,
              })}
            </Typography.Text>
          )}
        </Flex>
      )}
      <CompleteTransactionModal
        open={completing.open}
        transaction={completing.target}
        onClose={completing.close}
      />
      <ConfirmPendingTransactionsModal
        open={confirmingPending}
        until={period.endDate}
        onClose={() => {
          setConfirmingPending(false);
        }}
      />
    </EqualHeightCard>
  );
};
