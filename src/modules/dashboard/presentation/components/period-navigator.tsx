import { Spin, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { todayDateOnly } from '@/shared/date/date-only';
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
  month: MonthRef | undefined;
  period: DashboardPeriod | undefined;
  loading: boolean;
  onChange: (month: MonthRef) => void;
}

export const PeriodNavigator = ({
  month,
  period,
  loading,
  onChange,
}: PeriodNavigatorProps) => {
  const { t } = useTranslation();
  const current = monthRefOfDate(period?.today ?? todayDateOnly());
  const shownPeriod = loading ? undefined : period;
  const value =
    month ??
    (shownPeriod
      ? { year: shownPeriod.year, month: shownPeriod.month }
      : current);

  return (
    <MonthNavigator value={value} current={current} onChange={onChange}>
      {shownPeriod && (
        <Tag color={timingColors[shownPeriod.timing]}>
          {t(`dashboard.period.timing.${shownPeriod.timing}`)}
        </Tag>
      )}
      {shownPeriod && shownPeriod.remainingDays > 0 && (
        <Typography.Text type="secondary">
          {t('dashboard.period.remainingDays', {
            count: shownPeriod.remainingDays,
          })}
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
