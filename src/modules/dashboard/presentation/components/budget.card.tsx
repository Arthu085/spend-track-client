import { WarningOutlined } from '@ant-design/icons';
import { Badge, Empty, Flex, Progress, Row, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, isPositiveMoney } from '@/shared/money/money';
import type {
  DashboardBudget,
  DashboardBudgetLimit,
  DashboardSpendingGuidance,
} from '../../domain/dashboard.schema';
import { CollapsibleCard } from './collapsible-card';
import { displaySharePercent } from './share-percent';
import { SpendingGuidanceFigures } from './spending-guidance-figures';

interface LimitProgressProps {
  label: ReactNode;
  name: string;
  color?: string;
  entry: DashboardBudgetLimit;
}

const LimitProgress = ({ label, name, color, entry }: LimitProgressProps) => {
  const { t, i18n } = useTranslation();
  const money = (amount: string) => formatMoney(amount, i18n.language);
  const overspent = isPositiveMoney(entry.overspent);

  return (
    <Flex vertical>
      <Flex justify="space-between" gap="middle" wrap>
        {label}
        <Typography.Text>
          {t('dashboard.budget.spentOf', {
            spent: money(entry.total),
            limit: money(entry.limit),
          })}
        </Typography.Text>
      </Flex>
      <Progress
        percent={displaySharePercent(entry.total, entry.limit)}
        strokeColor={overspent ? undefined : color}
        status={overspent ? 'exception' : 'normal'}
        aria-label={name}
      />
      <Flex justify="space-between" gap="middle" wrap>
        <Typography.Text type="secondary">
          {t('dashboard.expensesByCategory.breakdown', {
            completed: money(entry.completed),
            pending: money(entry.pending),
          })}
        </Typography.Text>
        {overspent ? (
          <Typography.Text type="danger">
            <WarningOutlined />{' '}
            {t('dashboard.budget.overspent', {
              amount: money(entry.overspent),
            })}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">
            {t('dashboard.budget.remaining', {
              amount: money(entry.remaining),
            })}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
};

interface BudgetCardProps {
  budget: DashboardBudget | null;
  guidance?: DashboardSpendingGuidance;
  extra?: ReactNode;
  emptyAction?: ReactNode;
}

export const BudgetCard = ({
  budget,
  guidance,
  extra,
  emptyAction,
}: BudgetCardProps) => {
  const { t } = useTranslation();
  const overallName = t('dashboard.budget.overall');

  return (
    <CollapsibleCard
      card="BUDGET"
      title={t(
        guidance ? 'dashboard.budget.title' : 'dashboard.budget.limitsTitle',
      )}
      extra={extra}
    >
      <Flex vertical gap="large">
        {guidance && (
          <Row gutter={[16, 16]}>
            <SpendingGuidanceFigures
              guidance={guidance}
              level={3}
              span={{ xs: 24, sm: 12 }}
            />
          </Row>
        )}
        {budget ? (
          <Flex vertical gap="middle">
            {budget.overall && (
              <LimitProgress
                label={<Typography.Text strong>{overallName}</Typography.Text>}
                name={overallName}
                entry={budget.overall}
              />
            )}
            {budget.categories.map((entry) => (
              <LimitProgress
                key={entry.category.uuid}
                label={
                  <Badge
                    color={entry.category.color ?? undefined}
                    text={entry.category.name}
                  />
                }
                name={entry.category.name}
                color={entry.category.color ?? undefined}
                entry={entry}
              />
            ))}
            <Typography.Text type="secondary">
              {t('dashboard.budget.neverBlocks')}
            </Typography.Text>
          </Flex>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.budget.empty')}
          >
            {emptyAction}
          </Empty>
        )}
      </Flex>
    </CollapsibleCard>
  );
};
