import { PlusOutlined } from '@ant-design/icons';
import { Empty, Flex, type TableColumnsType, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardAccount } from '../../domain/dashboard.schema';
import { CollapsibleCard } from './collapsible-card';
import { ResponsiveTable } from './responsive-table';

interface AccountBalancesCardProps {
  accounts: DashboardAccount[];
}

interface BalanceLineProps {
  label: string;
  amount: string;
}

const BalanceLine = ({ label, amount }: BalanceLineProps) => (
  <Flex justify="space-between" gap="small" wrap>
    <Typography.Text type="secondary">{label}</Typography.Text>
    <MoneyText amount={amount} />
  </Flex>
);

export const AccountBalancesCard = ({ accounts }: AccountBalancesCardProps) => {
  const { t } = useTranslation();

  const accountName = ({ name, isDefault }: DashboardAccount) => (
    <>
      {name} {isDefault && <Tag color="blue">{t('accounts.default')}</Tag>}
    </>
  );

  const columns: TableColumnsType<DashboardAccount> = [
    {
      title: t('accounts.fields.name'),
      dataIndex: 'name',
      render: (_, account) => accountName(account),
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
    <CollapsibleCard
      card="ACCOUNT_BALANCES"
      title={t('dashboard.accounts.title')}
    >
      {accounts.length === 0 ? (
        <Empty description={t('dashboard.accounts.empty')}>
          <Link to={AppRoutes.ACCOUNTS}>
            <PlusOutlined /> {t('dashboard.accounts.add')}
          </Link>
        </Empty>
      ) : (
        <ResponsiveTable
          columns={columns}
          dataSource={accounts}
          compactRow={(account) => ({
            title: <span>{accountName(account)}</span>,
            description: account.typeLabel,
            extra: (
              <Flex vertical>
                <BalanceLine
                  label={t('dashboard.balances.actual')}
                  amount={account.actualBalance}
                />
                <BalanceLine
                  label={t('dashboard.balances.projected')}
                  amount={account.projectedBalance}
                />
              </Flex>
            ),
          })}
        />
      )}
    </CollapsibleCard>
  );
};
