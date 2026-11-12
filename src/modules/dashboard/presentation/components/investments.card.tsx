import { PlusCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  Progress,
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
import { DetailsCollapse, DetailsLabel } from './details-collapse';
import { ResponsiveTable } from './responsive-table';
import { SavingPlansLabel, SavingPlansSection } from './saving-plans.section';
import { displaySharePercent } from './share-percent';

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
  <Flex vertical flex={1} style={{ minWidth: 0 }}>
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
      gap="large"
      wrap
      role="group"
      aria-label={t('dashboard.investments.breakdown.label')}
    >
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
  );
};

const hasAnyAmount = (amounts: ContributionBreakdown | DashboardAmounts) =>
  Object.values(amounts).some(isPositiveMoney);

const ContributionsProgress = ({ amounts }: { amounts: DashboardAmounts }) => {
  const { t } = useTranslation();

  if (!isPositiveMoney(amounts.total)) {
    return null;
  }

  return (
    <Progress
      percent={displaySharePercent(amounts.completed, amounts.total)}
      status="normal"
      aria-label={t('dashboard.investments.contributionsShare')}
    />
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
      details: (
        <>
          <ContributionsProgress amounts={investments.contributions} />
          <PendingAmount amounts={investments.contributions} />
        </>
      ),
    },
    hasAnyAmount(investments.withdrawals) && {
      key: 'withdrawals',
      label: t('dashboard.investments.withdrawals'),
      amount: investments.withdrawals.completed,
      details: <PendingAmount amounts={investments.withdrawals} />,
    },
  ].filter((kpi) => kpi !== false);

  return (
    <Flex
      vertical={!md}
      gap={md ? 'large' : 'middle'}
      style={{
        padding: token.padding,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
      }}
    >
      {kpis.map(({ key, label, amount, details }, index) => (
        <Fragment key={key}>
          {md && index > 0 && (
            <Divider vertical style={{ height: 'auto', margin: 0 }} />
          )}
          <Kpi label={label} amount={amount}>
            {details}
          </Kpi>
        </Fragment>
      ))}
    </Flex>
  );
};

const GOALS_SHOWN = 3;

const GoalsOverview = ({ items }: { items: DashboardInvestment[] }) => {
  const { t } = useTranslation();
  const goals = items.filter(
    ({ targetAmount, progress }) => targetAmount !== null && progress !== null,
  );
  const shown = goals.slice(0, GOALS_SHOWN);

  return (
    <Flex vertical gap="small">
      <Flex
        justify={shown.length > 0 ? 'space-between' : 'end'}
        align="center"
        gap="middle"
        wrap
      >
        {shown.length > 0 && (
          <Typography.Text strong>
            {t('dashboard.investments.goals')}
          </Typography.Text>
        )}
        <Link to={AppRoutes.INVESTMENTS}>
          {t('dashboard.investments.manage')}
        </Link>
      </Flex>
      {shown.length > 0 && (
        <Flex
          gap="middle"
          wrap
          role="group"
          aria-label={t('dashboard.investments.goals')}
        >
          {shown.map(({ uuid, name, targetAmount, progress }) => (
            <Flex
              key={uuid}
              vertical
              style={{ flex: '1 1 220px', minWidth: 0 }}
            >
              <Typography.Text ellipsis={{ tooltip: name }}>
                {name}
              </Typography.Text>
              <InvestmentProgress
                name={name}
                targetAmount={targetAmount}
                progress={progress}
              />
            </Flex>
          ))}
        </Flex>
      )}
      {goals.length > shown.length && (
        <Typography.Text type="secondary">
          {t('dashboard.upcoming.partial', {
            shown: shown.length,
            count: goals.length,
          })}
        </Typography.Text>
      )}
    </Flex>
  );
};

export const InvestmentsCard = ({ investments }: InvestmentsCardProps) => {
  const { t } = useTranslation();
  const contributing = useModalTarget<{
    investment?: ContributionInvestment;
  }>();
  const hasInvestments = investments.items.length > 0;

  const contributeAction = ({ uuid, name }: DashboardInvestment) => (
    <IconActionButton
      size="small"
      icon={<PlusCircleOutlined />}
      label={t('investments.actions.contribute', { name })}
      onClick={() => contributing.show({ investment: { uuid, name } })}
    />
  );

  const progressOf = ({
    name,
    targetAmount,
    progress,
  }: DashboardInvestment) => (
    <InvestmentProgress
      name={name}
      targetAmount={targetAmount}
      progress={progress}
    />
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
      render: (_, investment) => progressOf(investment),
    },
    {
      title: t('investments.fields.actions'),
      key: 'actions',
      render: (_, investment) => contributeAction(investment),
    },
  ];

  const detailItems = [
    hasAnyAmount(investments.contributionBreakdown) && {
      key: 'breakdown',
      label: (
        <DetailsLabel title={t('dashboard.investments.breakdown.label')} />
      ),
      children: (
        <ContributionBreakdownSummary
          breakdown={investments.contributionBreakdown}
        />
      ),
    },
    hasInvestments && {
      key: 'portfolio',
      label: (
        <DetailsLabel
          title={t('dashboard.investments.portfolio')}
          counts={[
            {
              key: 'count',
              label: t('dashboard.investments.portfolioCount', {
                count: investments.items.length,
              }),
            },
          ]}
        />
      ),
      children: (
        <ResponsiveTable
          columns={columns}
          dataSource={investments.items}
          compactRow={(investment) => ({
            title: investment.name,
            description: investment.typeLabel,
            amount: <MoneyText amount={investment.currentValue} strong />,
            action: contributeAction(investment),
            extra: progressOf(investment),
          })}
        />
      ),
    },
    investments.savingPlans.length > 0 && {
      key: 'savingPlans',
      label: <SavingPlansLabel plans={investments.savingPlans} />,
      children: <SavingPlansSection plans={investments.savingPlans} />,
    },
  ].filter((item) => item !== false);

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
      <Flex vertical gap="middle">
        <InvestmentsSummary investments={investments} />
        <GoalsOverview items={investments.items} />
        {!hasInvestments && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.investments.empty')}
          />
        )}
        <DetailsCollapse items={detailItems} />
      </Flex>
      <InvestmentContributionModal
        open={contributing.open}
        investment={contributing.target?.investment}
        onClose={contributing.close}
      />
    </Card>
  );
};
