import { Col, Flex, Progress, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { EqualHeightCard } from '@/shared/components/equal-height-card';
import { isNegativeMoney, isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardAmounts } from '../../domain/dashboard.schema';
import { displaySharePercent } from './share-percent';

type CashFlowKind = 'income' | 'expenses';

const hasAmount = (amount: string) =>
  isPositiveMoney(amount) || isNegativeMoney(amount);

interface CashFlowCardProps {
  kind: CashFlowKind;
  amounts: DashboardAmounts;
}

const CashFlowCard = ({ kind, amounts }: CashFlowCardProps) => {
  const { t } = useTranslation();
  const lines = [
    { key: 'completed', amount: amounts.completed },
    { key: 'pending', amount: amounts.pending },
  ] as const;

  return (
    <EqualHeightCard>
      <Typography.Text type="secondary">
        {t(`dashboard.${kind}.title`)}
      </Typography.Text>
      <Typography.Title level={3} style={{ margin: '4px 0' }}>
        <MoneyText
          amount={amounts.total}
          aria-label={t(`dashboard.${kind}.title`)}
        />
      </Typography.Title>
      {lines.some(({ amount }) => hasAmount(amount)) ? (
        <Flex vertical gap="small">
          <Progress
            percent={displaySharePercent(amounts.completed, amounts.total)}
            status="normal"
            aria-label={t(`dashboard.${kind}.completedShare`)}
          />
          {lines.map(({ key, amount }) => (
            <Flex key={key} justify="space-between" gap="middle">
              <Typography.Text type="secondary">
                {t(`dashboard.${kind}.${key}`)}
              </Typography.Text>
              <MoneyText
                amount={amount}
                aria-label={t(`dashboard.${kind}.${key}`)}
              />
            </Flex>
          ))}
        </Flex>
      ) : (
        <Typography.Text type="secondary">
          {t(`dashboard.${kind}.empty`)}
        </Typography.Text>
      )}
    </EqualHeightCard>
  );
};

interface CashFlowSummaryProps {
  income: DashboardAmounts;
  expenses: DashboardAmounts;
}

export const CashFlowSummary = ({ income, expenses }: CashFlowSummaryProps) => (
  <Row gutter={[16, 16]} align="stretch">
    <Col xs={24} md={12}>
      <CashFlowCard kind="income" amounts={income} />
    </Col>
    <Col xs={24} md={12}>
      <CashFlowCard kind="expenses" amounts={expenses} />
    </Col>
  </Row>
);
