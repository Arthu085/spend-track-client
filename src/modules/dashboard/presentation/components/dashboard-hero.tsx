import { Card, Col, Flex, Row, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/shared/money/money-text';
import type {
  Dashboard,
  DashboardBudget,
  DashboardPeriod,
  DashboardSpendingGuidance,
} from '../../domain/dashboard.schema';
import { BudgetPace } from './budget-pace';
import { SpendingGuidanceFigures } from './spending-guidance-figures';

const BalanceOverview = ({ balances }: { balances: Dashboard['balances'] }) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const availableLabel = t('dashboard.balances.available');
  const secondary = [
    {
      key: 'actual',
      label: t('dashboard.balances.actual'),
      hint: t('dashboard.balances.actualHint'),
      amount: balances.actual,
    },
    {
      key: 'projected',
      label: t('dashboard.balances.projected'),
      hint: t('dashboard.balances.projectedHint'),
      amount: balances.projected,
    },
  ];

  return (
    <Flex
      vertical
      gap="middle"
      style={{
        height: '100%',
        padding: token.padding,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Flex vertical>
        <Typography.Text type="secondary">{availableLabel}</Typography.Text>
        <Typography.Title level={3} style={{ margin: '4px 0' }}>
          <MoneyText amount={balances.available} aria-label={availableLabel} />
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('dashboard.balances.availableHint')}
        </Typography.Text>
      </Flex>
      {secondary.map(({ key, label, hint, amount }) => (
        <Flex key={key} vertical>
          <Flex justify="space-between" gap="small" wrap>
            <Typography.Text>{label}</Typography.Text>
            <MoneyText amount={amount} strong aria-label={label} />
          </Flex>
          <Typography.Text
            type="secondary"
            style={{ fontSize: token.fontSizeSM }}
          >
            {hint}
          </Typography.Text>
        </Flex>
      ))}
    </Flex>
  );
};

interface DashboardHeroProps {
  balances: Dashboard['balances'];
  guidance: DashboardSpendingGuidance;
  budget: DashboardBudget | null;
  period: DashboardPeriod;
}

export const DashboardHero = ({
  balances,
  guidance,
  budget,
  period,
}: DashboardHeroProps) => (
  <Card>
    <Flex vertical gap="large">
      <Row gutter={[24, 24]}>
        <SpendingGuidanceFigures
          guidance={guidance}
          level={2}
          span={{ xs: 24, md: 12, xl: 8 }}
        />
        <Col xs={24} xl={8}>
          <BalanceOverview balances={balances} />
        </Col>
      </Row>
      {budget?.overall && (
        <BudgetPace overall={budget.overall} period={period} />
      )}
    </Flex>
  </Card>
);
