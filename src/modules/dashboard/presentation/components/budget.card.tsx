import { WarningOutlined } from '@ant-design/icons';
import { Badge, Card, Col, Empty, Flex, Progress, Row, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type {
  DashboardBudget,
  DashboardBudgetLimit,
  DashboardSpendingGuidance,
} from '../../domain/dashboard.schema';
import { displaySharePercent } from './share-percent';

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

interface SpendingGuidanceSummaryProps {
  guidance: DashboardSpendingGuidance;
}

const SpendingGuidanceSummary = ({
  guidance,
}: SpendingGuidanceSummaryProps) => {
  const { t } = useTranslation();
  const remainingLabel = t(`dashboard.budget.guidance.${guidance.basis}`);
  const dailyLabel = t('dashboard.budget.guidance.daily');

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12}>
        <Typography.Text type="secondary">{remainingLabel}</Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0' }}>
          <MoneyText amount={guidance.remaining} aria-label={remainingLabel} />
        </Typography.Title>
        <Typography.Text type="secondary">
          {t(`dashboard.budget.guidance.${guidance.basis}Hint`)}
        </Typography.Text>
      </Col>
      <Col xs={24} sm={12}>
        <Typography.Text type="secondary">{dailyLabel}</Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0' }}>
          {guidance.dailyAllowance === null ? (
            <Typography.Text type="secondary" aria-label={dailyLabel}>
              —
            </Typography.Text>
          ) : (
            <MoneyText
              amount={guidance.dailyAllowance}
              aria-label={dailyLabel}
            />
          )}
        </Typography.Title>
        <Typography.Text type="secondary">
          {guidance.dailyAllowance === null
            ? t('dashboard.budget.guidance.noDaysLeft')
            : t('dashboard.budget.guidance.dailyHint')}
        </Typography.Text>
      </Col>
    </Row>
  );
};

interface BudgetCardProps {
  budget: DashboardBudget | null;
  guidance: DashboardSpendingGuidance;
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
    <Card title={t('dashboard.budget.title')} extra={extra}>
      <Flex vertical gap="large">
        <SpendingGuidanceSummary guidance={guidance} />
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
    </Card>
  );
};
