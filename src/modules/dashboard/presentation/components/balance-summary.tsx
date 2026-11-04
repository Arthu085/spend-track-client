import { Alert, Card, Col, Flex, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatMoney, isNegativeMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type { Dashboard } from '../../domain/dashboard.schema';

interface BalanceSummaryProps {
  balances: Dashboard['balances'];
}

export const BalanceSummary = ({ balances }: BalanceSummaryProps) => {
  const { t, i18n } = useTranslation();

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
      {isNegativeMoney(balances.available) && (
        <Alert
          type="warning"
          showIcon
          title={t('dashboard.balances.shortfall', {
            amount: formatMoney(
              balances.available.replace('-', ''),
              i18n.language,
            ),
          })}
        />
      )}
      <Row gutter={[16, 16]}>
        {items.map(({ key, label, hint, amount }) => (
          <Col key={key} xs={24} md={8}>
            <Card>
              <Typography.Text type="secondary">{label}</Typography.Text>
              <Typography.Title level={3} style={{ margin: '4px 0' }}>
                <MoneyText amount={amount} aria-label={label} />
              </Typography.Title>
              <Typography.Text type="secondary">{hint}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Flex>
  );
};
