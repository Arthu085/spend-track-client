import { Col, Divider, Flex, Grid, Row, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/shared/money/money-text';
import type {
  Dashboard,
  DashboardBudget,
  DashboardPeriod,
  DashboardSpendingGuidance,
} from '../../domain/dashboard.schema';
import { BudgetPace } from './budget-pace';
import { HeroBalancePanel, HeroCard } from './hero-card';
import { heroLayout } from './hero-layout';
import { SpendingGuidanceFigures } from './spending-guidance-figures';

const tabularNumbers = { fontVariantNumeric: 'tabular-nums' } as const;

const BalanceOverview = ({ balances }: { balances: Dashboard['balances'] }) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { sm, md, xl } = Grid.useBreakpoint();
  const sideBySide = md && !xl;
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
    <HeroBalancePanel>
      <Row gutter={[24, 0]}>
        <Col xs={24} md={12} xl={24}>
          <Flex vertical>
            <Typography.Text type="secondary">{availableLabel}</Typography.Text>
            <Typography.Title
              level={2}
              style={{
                margin: '4px 0',
                fontSize: sm ? token.fontSizeHeading1 : token.fontSizeHeading2,
                lineHeight: sm
                  ? token.lineHeightHeading1
                  : token.lineHeightHeading2,
                ...tabularNumbers,
              }}
            >
              <MoneyText
                amount={balances.available}
                aria-label={availableLabel}
              />
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('dashboard.balances.availableHint')}
            </Typography.Text>
          </Flex>
        </Col>
        <Col xs={24} md={12} xl={24}>
          {!sideBySide && <Divider style={{ margin: `${token.margin}px 0` }} />}
          <Flex vertical gap="middle">
            {secondary.map(({ key, label, hint, amount }) => (
              <Flex key={key} vertical>
                <Flex justify="space-between" gap="small" wrap>
                  <Typography.Text>{label}</Typography.Text>
                  <MoneyText
                    amount={amount}
                    strong
                    aria-label={label}
                    style={tabularNumbers}
                  />
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
        </Col>
      </Row>
    </HeroBalancePanel>
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
  <HeroCard>
    <Row gutter={[32, 24]}>
      <Col {...heroLayout.balances}>
        <BalanceOverview balances={balances} />
      </Col>
      <Col {...heroLayout.guidance}>
        <Flex vertical gap="large" style={{ height: '100%' }}>
          <Row gutter={[24, 24]}>
            <SpendingGuidanceFigures
              guidance={guidance}
              level={3}
              span={heroLayout.figure}
            />
          </Row>
          {budget?.overall && (
            <BudgetPace overall={budget.overall} period={period} />
          )}
        </Flex>
      </Col>
    </Row>
  </HeroCard>
);
