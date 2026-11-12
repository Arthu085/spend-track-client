import { Col, Flex, Progress, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { EqualHeightCard } from '@/shared/components/equal-height-card';
import {
  isNegativeMoney,
  isPositiveMoney,
  subtractMoney,
} from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardAmounts } from '../../domain/dashboard.schema';
import { displaySharePercent, sharePercent } from './share-percent';

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
          type={kind === 'income' ? 'success' : undefined}
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

const formatSignedPercent = (percent: number, language: string) =>
  new Intl.NumberFormat(language, {
    style: 'percent',
    signDisplay: 'exceptZero',
  }).format(percent / 100);

const percentType = (percent: number) => {
  if (percent < 0) {
    return 'danger';
  }

  return percent > 0 ? 'success' : undefined;
};

const SavingsRate = ({ net, income }: { net: string; income: string }) => {
  const { t, i18n } = useTranslation();
  const label = t('dashboard.net.savingsRate');
  const percent = sharePercent(net, income);

  return percent === null ? (
    <Typography.Text type="secondary" aria-label={label}>
      —
    </Typography.Text>
  ) : (
    <Typography.Text type={percentType(percent)} aria-label={label}>
      {formatSignedPercent(percent, i18n.language)}
    </Typography.Text>
  );
};

const NetResultCard = ({ income, expenses }: CashFlowSummaryProps) => {
  const { t } = useTranslation();
  const net = subtractMoney(income.total, expenses.total);

  return (
    <EqualHeightCard>
      <Typography.Text type="secondary">
        {t('dashboard.net.title')}
      </Typography.Text>
      <Typography.Title level={3} style={{ margin: '4px 0' }}>
        <MoneyText amount={net} signed aria-label={t('dashboard.net.title')} />
      </Typography.Title>
      <Flex vertical gap="small">
        <Flex justify="space-between" gap="middle">
          <Typography.Text type="secondary">
            {t('dashboard.net.savingsRate')}
          </Typography.Text>
          <SavingsRate net={net} income={income.total} />
        </Flex>
        <Flex justify="space-between" gap="middle">
          <Typography.Text type="secondary">
            {t('dashboard.net.completed')}
          </Typography.Text>
          <MoneyText
            amount={subtractMoney(income.completed, expenses.completed)}
            signed
            aria-label={t('dashboard.net.completed')}
          />
        </Flex>
      </Flex>
    </EqualHeightCard>
  );
};

export const CashFlowSummary = ({ income, expenses }: CashFlowSummaryProps) => (
  <Row gutter={[16, 16]} align="stretch">
    <Col xs={24} sm={12} lg={8}>
      <CashFlowCard kind="income" amounts={income} />
    </Col>
    <Col xs={24} sm={12} lg={8}>
      <CashFlowCard kind="expenses" amounts={expenses} />
    </Col>
    <Col xs={24} lg={8}>
      <NetResultCard income={income} expenses={expenses} />
    </Col>
  </Row>
);
