import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { CategoriesPanel } from '@/modules/categories/presentation/components/categories-panel';
import { PreferencesPanel } from '../components/preferences-panel';

export const FinancialSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2}>
        {t('financialSettings.title')}
      </Typography.Title>
      <PreferencesPanel />
      <CategoriesPanel />
    </Flex>
  );
};
