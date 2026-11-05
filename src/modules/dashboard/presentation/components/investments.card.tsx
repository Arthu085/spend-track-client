import { PlusCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd';
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

const ContributionBreakdownSummary = ({
  breakdown,
}: {
  breakdown: ContributionBreakdown;
}) => {
  const { t, i18n } = useTranslation();

  if (!Object.values(breakdown).some(isPositiveMoney)) {
    return null;
  }

  const amounts = (completed: string, planned: string) =>
    t('dashboard.investments.breakdown.amounts', {
      completed: formatMoney(completed, i18n.language),
      planned: formatMoney(planned, i18n.language),
    });

  return (
    <div role="group" aria-label={t('dashboard.investments.breakdown.label')}>
      <Descriptions
        size="small"
        column={{ xs: 1, md: 3 }}
        items={[
          {
            key: 'mandatory',
            label: t('dashboard.investments.breakdown.mandatory'),
            children: amounts(
              breakdown.mandatoryCompleted,
              breakdown.mandatoryPlanned,
            ),
          },
          {
            key: 'additional',
            label: t('dashboard.investments.breakdown.additional'),
            children: amounts(
              breakdown.additionalCompleted,
              breakdown.additionalPlanned,
            ),
          },
          {
            key: 'oneTime',
            label: t('dashboard.investments.breakdown.oneTime'),
            children: amounts(
              breakdown.oneTimeCompleted,
              breakdown.oneTimePlanned,
            ),
          },
        ]}
      />
    </div>
  );
};

export const InvestmentsCard = ({ investments }: InvestmentsCardProps) => {
  const { t, i18n } = useTranslation();
  const contributing = useModalTarget<{
    investment?: ContributionInvestment;
  }>();

  const movementSummary = (label: string, amounts: DashboardAmounts) => (
    <Typography.Text>
      {label} <MoneyText amount={amounts.completed} strong aria-label={label} />
      {isPositiveMoney(amounts.pending) && (
        <Typography.Text type="secondary">
          {' '}
          {t('dashboard.investments.pending', {
            amount: formatMoney(amounts.pending, i18n.language),
          })}
        </Typography.Text>
      )}
    </Typography.Text>
  );

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
        <Link to={AppRoutes.INVESTMENTS}>
          {t('dashboard.investments.manage')}
        </Link>
      }
    >
      <Flex vertical gap="small">
        <Flex justify="space-between" align="center" gap="middle" wrap>
          <Flex gap="large" wrap>
            <Typography.Text>
              {t('dashboard.investments.totalValue')}{' '}
              <MoneyText
                amount={investments.totalValue}
                strong
                aria-label={t('dashboard.investments.totalValue')}
              />
            </Typography.Text>
            {movementSummary(
              t('dashboard.investments.contributions'),
              investments.contributions,
            )}
            {movementSummary(
              t('dashboard.investments.withdrawals'),
              investments.withdrawals,
            )}
          </Flex>
          {investments.items.length > 0 && (
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={() => contributing.show({})}
            >
              {t('dashboard.investments.contribute')}
            </Button>
          )}
        </Flex>
        <ContributionBreakdownSummary
          breakdown={investments.contributionBreakdown}
        />
        <SavingPlansSection plans={investments.savingPlans} />
        {investments.items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.investments.empty')}
          />
        ) : (
          <Table
            rowKey="uuid"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={investments.items}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Flex>
      <InvestmentContributionModal
        open={contributing.open}
        investment={contributing.target?.investment}
        onClose={contributing.close}
      />
    </Card>
  );
};
