import { Flex, Progress, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/money/money';
import type { InvestmentProgress as Progression } from '../../domain/investment.schema';

interface InvestmentProgressProps {
  name: string;
  targetAmount: string | null;
  progress: Progression | null;
}

export const InvestmentProgress = ({
  name,
  targetAmount,
  progress,
}: InvestmentProgressProps) => {
  const { t, i18n } = useTranslation();

  if (targetAmount === null || progress === null) {
    return (
      <Typography.Text type="secondary">
        {t('investments.noTarget')}
      </Typography.Text>
    );
  }

  return (
    <Flex vertical gap={0} style={{ minWidth: 160 }}>
      <Progress
        percent={Math.min(progress.percent, 100)}
        format={() => `${progress.percent}%`}
        status={progress.percent >= 100 ? 'success' : 'normal'}
        aria-label={t('investments.progressOf', { name })}
      />
      <Typography.Text type="secondary">
        {progress.percent >= 100
          ? t('investments.targetReached', {
              target: formatMoney(targetAmount, i18n.language),
            })
          : t('investments.targetRemaining', {
              remaining: formatMoney(progress.remaining, i18n.language),
              target: formatMoney(targetAmount, i18n.language),
            })}
      </Typography.Text>
    </Flex>
  );
};
