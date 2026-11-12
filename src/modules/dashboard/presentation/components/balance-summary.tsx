import { Col, Flex, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { EqualHeightCard } from '@/shared/components/equal-height-card';
import { MoneyText } from '@/shared/money/money-text';
import type { Dashboard } from '../../domain/dashboard.schema';

interface BalanceSummaryProps {
  balances: Dashboard['balances'];
}

export const BalanceSummary = ({ balances }: BalanceSummaryProps) => {
  const { t } = useTranslation();

  const items = [
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
    {
      key: 'available',
      label: t('dashboard.balances.available'),
      hint: t('dashboard.balances.availableHint'),
      amount: balances.available,
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Row gutter={[16, 16]} align="stretch">
        {items.map(({ key, label, hint, amount }) => (
          <Col key={key} xs={24} md={8}>
            <EqualHeightCard>
              <Typography.Text type="secondary">{label}</Typography.Text>
              <Typography.Title level={3} style={{ margin: '4px 0' }}>
                <MoneyText amount={amount} aria-label={label} />
              </Typography.Title>
              <Typography.Text type="secondary">{hint}</Typography.Text>
            </EqualHeightCard>
          </Col>
        ))}
      </Row>
    </Flex>
  );
};
