import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { TransactionCategoriesPanel } from '@/modules/transaction-categories/presentation/components/transaction-categories-panel';
import { PreferencesPanel } from '../components/preferences-panel';

export const FinancialSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2}>
        {t('financialSettings.title')}
      </Typography.Title>
      <PreferencesPanel />
      <TransactionCategoriesPanel />
    </Flex>
  );
};
