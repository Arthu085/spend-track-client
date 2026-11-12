import { Col, type ColProps, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardSpendingGuidance } from '../../domain/dashboard.schema';

type FigureLevel = 2 | 3;

interface FigureProps {
  label: string;
  hint: string;
  level: FigureLevel;
  children: ReactNode;
}

const Figure = ({ label, hint, level, children }: FigureProps) => (
  <Flex vertical>
    <Typography.Text type="secondary">{label}</Typography.Text>
    <Typography.Title level={level} style={{ margin: '4px 0' }}>
      {children}
    </Typography.Title>
    <Typography.Text type="secondary">{hint}</Typography.Text>
  </Flex>
);

interface SpendingGuidanceFiguresProps {
  guidance: DashboardSpendingGuidance;
  level: FigureLevel;
  span: ColProps;
}

export const SpendingGuidanceFigures = ({
  guidance,
  level,
  span,
}: SpendingGuidanceFiguresProps) => {
  const { t } = useTranslation();
  const remainingLabel = t(`dashboard.budget.guidance.${guidance.basis}`);
  const dailyLabel = t('dashboard.budget.guidance.daily');

  return (
    <>
      <Col {...span}>
        <Figure
          label={remainingLabel}
          hint={t(`dashboard.budget.guidance.${guidance.basis}Hint`)}
          level={level}
        >
          <MoneyText amount={guidance.remaining} aria-label={remainingLabel} />
        </Figure>
      </Col>
      <Col {...span}>
        <Figure
          label={dailyLabel}
          hint={
            guidance.dailyAllowance === null
              ? t('dashboard.budget.guidance.noDaysLeft')
              : t('dashboard.budget.guidance.dailyHint')
          }
          level={level}
        >
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
        </Figure>
      </Col>
    </>
  );
};
