import { Spin, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { MonthNavigator } from '@/shared/date/month-navigator';
import { type MonthRef, monthRefOfDate } from '@/shared/date/month-ref';
import type {
  DashboardPeriod,
  PeriodTiming,
} from '../../domain/dashboard.schema';

const timingColors: Record<PeriodTiming, string | undefined> = {
  PAST: undefined,
  CURRENT: 'processing',
  FUTURE: 'purple',
};

interface PeriodNavigatorProps {
  period: DashboardPeriod;
  loading: boolean;
  onChange: (month: MonthRef) => void;
}

export const PeriodNavigator = ({
  period,
  loading,
  onChange,
}: PeriodNavigatorProps) => {
  const { t } = useTranslation();

  return (
    <MonthNavigator
      value={{ year: period.year, month: period.month }}
      current={monthRefOfDate(period.today)}
      onChange={onChange}
    >
      <Tag color={timingColors[period.timing]}>
        {t(`dashboard.period.timing.${period.timing}`)}
      </Tag>
      {period.remainingDays > 0 && (
        <Typography.Text type="secondary">
          {t('dashboard.period.remainingDays', { count: period.remainingDays })}
        </Typography.Text>
      )}
      {loading && (
        <span role="status" aria-label={t('dashboard.period.loading')}>
          <Spin size="small" />
        </span>
      )}
    </MonthNavigator>
  );
};
