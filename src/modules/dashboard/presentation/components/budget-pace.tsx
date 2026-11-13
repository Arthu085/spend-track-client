import { Flex, Progress, Tag, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { isPositiveMoney } from '@/shared/money/money';
import type {
  DashboardBudgetLimit,
  DashboardPeriod,
} from '../../domain/dashboard.schema';
import { displaySharePercent } from './share-percent';

type PaceStatus = 'onTrack' | 'ahead' | 'over';

const AHEAD_OF_PACE_TOLERANCE = 10;

const statusColors: Record<PaceStatus, string> = {
  onTrack: 'success',
  ahead: 'warning',
  over: 'error',
};

const monthElapsedPercent = ({
  timing,
  daysInMonth,
  remainingDays,
}: DashboardPeriod) =>
  timing === 'PAST'
    ? 100
    : Math.round(((daysInMonth - remainingDays) / daysInMonth) * 100);

const paceStatus = (
  overall: DashboardBudgetLimit,
  used: number,
  elapsed: number,
): PaceStatus => {
  if (isPositiveMoney(overall.overspent)) {
    return 'over';
  }

  return used > elapsed + AHEAD_OF_PACE_TOLERANCE ? 'ahead' : 'onTrack';
};

interface BudgetPaceProps {
  overall: DashboardBudgetLimit;
  period: DashboardPeriod;
}

export const BudgetPace = ({ overall, period }: BudgetPaceProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  if (period.timing === 'FUTURE') {
    return null;
  }

  const used = displaySharePercent(overall.total, overall.limit);
  const elapsed = monthElapsedPercent(period);
  const status = paceStatus(overall, used, elapsed);
  const strokeColors: Record<PaceStatus, string | undefined> = {
    onTrack: token.colorSuccess,
    ahead: token.colorWarning,
    over: undefined,
  };

  return (
    <Flex
      vertical
      gap="small"
      style={{
        paddingTop: token.paddingLG,
        borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      }}
    >
      <Flex justify="space-between" align="center" gap="small" wrap>
        <Typography.Text strong>{t('dashboard.pace.title')}</Typography.Text>
        <Tag color={statusColors[status]}>
          {t(`dashboard.pace.status.${status}`)}
        </Tag>
      </Flex>
      <Flex vertical>
        <Progress
          percent={used}
          showInfo={false}
          strokeColor={strokeColors[status]}
          status={status === 'over' ? 'exception' : 'normal'}
          aria-label={t('dashboard.pace.used')}
        />
        <Progress
          percent={elapsed}
          showInfo={false}
          size="small"
          strokeColor={token.colorTextQuaternary}
          status="normal"
          aria-label={t('dashboard.pace.elapsed')}
        />
      </Flex>
      <Typography.Text type="secondary">
        {t('dashboard.pace.summary', { used, elapsed })}
      </Typography.Text>
    </Flex>
  );
};
