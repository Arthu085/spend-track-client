import { Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateOnly } from '@/shared/date/date-only';

interface PlannedDateProps {
  date: string;
  overdue: boolean;
}

export const PlannedDate = ({ date, overdue }: PlannedDateProps) => {
  const { t, i18n } = useTranslation();

  return (
    <Space size="small" wrap>
      {formatDateOnly(date, i18n.language)}
      {overdue && <Tag color="error">{t('transactions.overdue')}</Tag>}
    </Space>
  );
};
