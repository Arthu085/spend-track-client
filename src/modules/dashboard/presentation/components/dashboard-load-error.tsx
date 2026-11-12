import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';

interface DashboardLoadErrorProps {
  error: unknown;
  showingStaleData: boolean;
  retrying: boolean;
  onRetry: () => void;
}

export const DashboardLoadError = ({
  error,
  showingStaleData,
  retrying,
  onRetry,
}: DashboardLoadErrorProps) => {
  const { t } = useTranslation();
  const message = getApiErrorMessage(error);

  return (
    <Alert
      type={showingStaleData ? 'warning' : 'error'}
      showIcon
      title={showingStaleData ? t('dashboard.refreshFailed') : message}
      description={showingStaleData ? message : undefined}
      action={
        <Button size="small" loading={retrying} onClick={onRetry}>
          {t('dashboard.retry')}
        </Button>
      }
    />
  );
};
