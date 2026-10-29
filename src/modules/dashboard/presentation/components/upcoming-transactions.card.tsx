import { CheckOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Space,
  Table,
  type TableColumnsType,
  Tag,
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
import { TransactionAmount } from '@/modules/transactions/presentation/components/transaction-amount';
import { formatDateOnly } from '@/shared/date/date-only';
import type {
  DashboardPeriod,
  DashboardUpcoming,
} from '../../domain/dashboard.schema';

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
  const { t, i18n } = useTranslation();
  const [completing, setCompleting] = useState<CompletableTransaction | null>(
    null,
  );

  const columns: TableColumnsType<DashboardUpcoming> = [
    {
      title: t('transactions.fields.date'),
      dataIndex: 'date',
      render: (_, { date, overdue }) => (
        <Space size="small" wrap>
          {formatDateOnly(date, i18n.language)}
          {overdue && <Tag color="error">{t('transactions.overdue')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('transactions.fields.description'),
      dataIndex: 'description',
      render: (_, { description, category, account, destinationAccount }) => (
        <Flex vertical>
          {description}
          <Typography.Text type="secondary">
            {category ? (
              <Badge color={category.color ?? undefined} text={category.name} />
            ) : (
              destinationAccount &&
              t('transactions.transferRoute', {
                from: account.name,
                to: destinationAccount.name,
              })
            )}
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
      render: (_, { uuid, description }) => (
        <Button
          size="small"
          icon={<CheckOutlined />}
          aria-label={t('transactions.actions.complete', { description })}
          onClick={() => setCompleting({ uuid, description })}
        />
      ),
    },
  ];

  return (
    <Card
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
          <Typography.Text type="secondary">
            {t('dashboard.upcoming.hint')}
          </Typography.Text>
          <Table
            rowKey="uuid"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={upcoming}
            scroll={{ x: 'max-content' }}
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
        transaction={completing}
        onClose={() => setCompleting(null)}
      />
    </Card>
  );
};
