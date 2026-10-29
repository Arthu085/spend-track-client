import { PlusOutlined } from '@ant-design/icons';
import { Card, Empty, Table, type TableColumnsType, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardAccount } from '../../domain/dashboard.schema';

interface AccountBalancesCardProps {
  accounts: DashboardAccount[];
}

export const AccountBalancesCard = ({ accounts }: AccountBalancesCardProps) => {
  const { t } = useTranslation();

  const columns: TableColumnsType<DashboardAccount> = [
    {
      title: t('accounts.fields.name'),
      dataIndex: 'name',
      render: (_, { name, isDefault }) => (
        <>
          {name} {isDefault && <Tag color="blue">{t('accounts.default')}</Tag>}
        </>
      ),
    },
    { title: t('accounts.fields.type'), dataIndex: 'typeLabel' },
    {
      title: t('dashboard.balances.actual'),
      dataIndex: 'actualBalance',
      align: 'right',
      render: (amount: string) => <MoneyText amount={amount} />,
    },
    {
      title: t('dashboard.balances.projected'),
      dataIndex: 'projectedBalance',
      align: 'right',
      render: (amount: string) => <MoneyText amount={amount} />,
    },
  ];

  return (
    <Card title={t('dashboard.accounts.title')}>
      {accounts.length === 0 ? (
        <Empty description={t('dashboard.accounts.empty')}>
          <Link to={AppRoutes.ACCOUNTS}>
            <PlusOutlined /> {t('dashboard.accounts.add')}
          </Link>
        </Empty>
      ) : (
        <Table
          rowKey="uuid"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={accounts}
          scroll={{ x: 'max-content' }}
        />
      )}
    </Card>
  );
};
