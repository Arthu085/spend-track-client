import { PlusCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  Table,
  type TableColumnsType,
  theme,
  Typography,
} from 'antd';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import {
  type ContributionInvestment,
  InvestmentContributionModal,
} from '@/modules/investments/presentation/components/investment-contribution.modal';
import { InvestmentProgress } from '@/modules/investments/presentation/components/investment-progress';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { formatMoney, isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type {
  ContributionBreakdown,
  DashboardAmounts,
  DashboardInvestments,
} from '../../domain/dashboard.schema';
import { SavingPlansSection } from './saving-plans.section';

type DashboardInvestment = DashboardInvestments['items'][number];

interface InvestmentsCardProps {
  investments: DashboardInvestments;
}

interface KpiProps {
  label: string;
  amount: string;
  children?: ReactNode;
}

const Kpi = ({ label, amount, children }: KpiProps) => (
  <Flex vertical>
    <Typography.Text type="secondary">{label}</Typography.Text>
    <Typography.Title level={3} style={{ margin: '4px 0' }}>
      <MoneyText amount={amount} aria-label={label} />
    </Typography.Title>
    {children}
  </Flex>
);

const PendingAmount = ({ amounts }: { amounts: DashboardAmounts }) => {
  const { t, i18n } = useTranslation();

  if (!isPositiveMoney(amounts.pending)) {
    return null;
  }

  return (
    <Typography.Text type="secondary">
      {t('dashboard.investments.pending', {
        amount: formatMoney(amounts.pending, i18n.language),
      })}
    </Typography.Text>
  );
};

const ContributionBreakdownSummary = ({
  breakdown,
}: {
  breakdown: ContributionBreakdown;
}) => {
  const { t, i18n } = useTranslation();

  if (!Object.values(breakdown).some(isPositiveMoney)) {
    return null;
  }

  const kinds = [
    {
      key: 'mandatory',
      completed: breakdown.mandatoryCompleted,
      planned: breakdown.mandatoryPlanned,
    },
    {
      key: 'additional',
      completed: breakdown.additionalCompleted,
      planned: breakdown.additionalPlanned,
    },
    {
      key: 'oneTime',
      completed: breakdown.oneTimeCompleted,
      planned: breakdown.oneTimePlanned,
    },
  ] as const;

  return (
    <Flex
      vertical
      role="group"
      aria-label={t('dashboard.investments.breakdown.label')}
      gap="small"
    >
      <Divider titlePlacement="start" plain style={{ margin: 0 }}>
        {t('dashboard.investments.breakdown.label')}
      </Divider>
      <Flex gap="large" wrap>
        {kinds.map(({ key, completed, planned }) => (
          <Flex key={key} vertical>
            <Typography.Text type="secondary">
              {t(`dashboard.investments.breakdown.${key}`)}
            </Typography.Text>
            <Typography.Text>
              {t('dashboard.investments.breakdown.amounts', {
                completed: formatMoney(completed, i18n.language),
                planned: formatMoney(planned, i18n.language),
              })}
            </Typography.Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};

const InvestmentsSummary = ({ investments }: InvestmentsCardProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { md } = Grid.useBreakpoint();

  const kpis = [
    {
      key: 'totalValue',
      label: t('dashboard.investments.totalValue'),
      amount: investments.totalValue,
    },
    {
      key: 'contributions',
      label: t('dashboard.investments.contributions'),
      amount: investments.contributions.completed,
      pending: investments.contributions,
    },
    {
      key: 'withdrawals',
      label: t('dashboard.investments.withdrawals'),
      amount: investments.withdrawals.completed,
      pending: investments.withdrawals,
    },
  ];

  return (
    <Flex
      vertical
      gap="middle"
      style={{
        padding: token.padding,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Flex vertical={!md} gap={md ? 'large' : 'middle'}>
        {kpis.map(({ key, label, amount, pending }, index) => (
          <Fragment key={key}>
            {md && index > 0 && (
              <Divider vertical style={{ height: 'auto', margin: 0 }} />
            )}
            <Kpi label={label} amount={amount}>
              {pending && <PendingAmount amounts={pending} />}
            </Kpi>
          </Fragment>
        ))}
      </Flex>
      <ContributionBreakdownSummary
        breakdown={investments.contributionBreakdown}
      />
    </Flex>
  );
};

export const InvestmentsCard = ({ investments }: InvestmentsCardProps) => {
  const { t } = useTranslation();
  const contributing = useModalTarget<{
    investment?: ContributionInvestment;
  }>();
  const hasInvestments = investments.items.length > 0;

  const columns: TableColumnsType<DashboardInvestment> = [
    {
      title: t('investments.fields.name'),
      key: 'name',
      render: (_, { name, typeLabel }) => (
        <Flex vertical>
          {name}
          <Typography.Text type="secondary">{typeLabel}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('investments.fields.currentValue'),
      dataIndex: 'currentValue',
      align: 'right',
      render: (_, { currentValue }) => (
        <MoneyText amount={currentValue} strong />
      ),
    },
    {
      title: t('investments.fields.progress'),
      key: 'progress',
      render: (_, { name, targetAmount, progress }) => (
        <InvestmentProgress
          name={name}
          targetAmount={targetAmount}
          progress={progress}
        />
      ),
    },
    {
      title: t('investments.fields.actions'),
      key: 'actions',
      render: (_, { uuid, name }) => (
        <IconActionButton
          size="small"
          icon={<PlusCircleOutlined />}
          label={t('investments.actions.contribute', { name })}
          onClick={() => contributing.show({ investment: { uuid, name } })}
        />
      ),
    },
  ];

  return (
    <Card
      title={t('dashboard.investments.title')}
      extra={
        hasInvestments && (
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={() => contributing.show({})}
          >
            {t('dashboard.investments.contribute')}
          </Button>
        )
      }
    >
      <Flex vertical gap="large">
        <InvestmentsSummary investments={investments} />
        <Flex vertical gap="small">
          <Flex justify="space-between" align="center" gap="middle" wrap>
            <Typography.Text strong>
              {t('dashboard.investments.portfolio')}
            </Typography.Text>
            <Link to={AppRoutes.INVESTMENTS}>
              {t('dashboard.investments.manage')}
            </Link>
          </Flex>
          {hasInvestments ? (
            <Table
              rowKey="uuid"
              size="small"
              pagination={false}
              columns={columns}
              dataSource={investments.items}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('dashboard.investments.empty')}
            />
          )}
        </Flex>
        <SavingPlansSection plans={investments.savingPlans} />
      </Flex>
      <InvestmentContributionModal
        open={contributing.open}
        investment={contributing.target?.investment}
        onClose={contributing.close}
      />
    </Card>
  );
};
