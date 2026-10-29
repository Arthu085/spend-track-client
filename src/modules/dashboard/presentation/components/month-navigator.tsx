import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Flex, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type {
  DashboardPeriod,
  PeriodTiming,
} from '../../domain/dashboard.schema';
import {
  formatMonthLabel,
  type MonthRef,
  shiftMonth,
} from '../../domain/month-ref';

const timingColors: Record<PeriodTiming, string | undefined> = {
  PAST: undefined,
  CURRENT: 'processing',
  FUTURE: 'purple',
};

interface MonthNavigatorProps {
  period: DashboardPeriod;
  onChange: (month: MonthRef) => void;
}

export const MonthNavigator = ({ period, onChange }: MonthNavigatorProps) => {
  const { t, i18n } = useTranslation();
  const current = { year: period.year, month: period.month };
  const [todayYear, todayMonth] = period.today.split('-').map(Number);

  return (
    <Flex align="center" gap="small" wrap>
      <Button
        icon={<LeftOutlined />}
        aria-label={t('dashboard.period.previous')}
        onClick={() => onChange(shiftMonth(current, -1))}
      />
      <Typography.Title
        level={4}
        style={{ margin: 0, minWidth: 180, textAlign: 'center' }}
      >
        {formatMonthLabel(current, i18n.language)}
      </Typography.Title>
      <Button
        icon={<RightOutlined />}
        aria-label={t('dashboard.period.next')}
        onClick={() => onChange(shiftMonth(current, 1))}
      />
      <Tag color={timingColors[period.timing]}>
        {t(`dashboard.period.timing.${period.timing}`)}
      </Tag>
      {period.remainingDays > 0 && (
        <Typography.Text type="secondary">
          {t('dashboard.period.remainingDays', { count: period.remainingDays })}
        </Typography.Text>
      )}
      {period.timing !== 'CURRENT' && (
        <Button
          type="link"
          onClick={() => onChange({ year: todayYear, month: todayMonth })}
        >
          {t('dashboard.period.current')}
        </Button>
      )}
    </Flex>
  );
};
