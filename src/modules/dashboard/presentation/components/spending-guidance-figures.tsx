import { Col, type ColProps, Flex, Grid, theme, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardSpendingGuidance } from '../../domain/dashboard.schema';

type FigureLevel = 2 | 3;

interface FigureProps {
  label: string;
  hint: string;
  level: FigureLevel;
  prominent: boolean;
  children: ReactNode;
}

const useProminentValueStyle = () => {
  const { token } = theme.useToken();
  const { sm } = Grid.useBreakpoint();

  return {
    fontSize: sm ? token.fontSizeHeading1 : token.fontSizeHeading2,
    lineHeight: sm ? token.lineHeightHeading1 : token.lineHeightHeading2,
    fontVariantNumeric: 'tabular-nums',
  } as const;
};

const Figure = ({ label, hint, level, prominent, children }: FigureProps) => {
  const prominentValueStyle = useProminentValueStyle();

  return (
    <Flex vertical>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Title
        level={level}
        style={{ margin: '4px 0', ...(prominent && prominentValueStyle) }}
      >
        {children}
      </Typography.Title>
      <Typography.Text type="secondary">{hint}</Typography.Text>
    </Flex>
  );
};

interface SpendingGuidanceFiguresProps {
  guidance: DashboardSpendingGuidance;
  level: FigureLevel;
  span: ColProps;
  prominent?: boolean;
}

export const SpendingGuidanceFigures = ({
  guidance,
  level,
  span,
  prominent = false,
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
          prominent={prominent}
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
          prominent={prominent}
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
