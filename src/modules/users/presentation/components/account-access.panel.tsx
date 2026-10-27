import { Alert, Flex, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { AbilitySummary } from '@/modules/authorization/presentation/components/ability-summary';
import { RoleTags } from '@/modules/authorization/presentation/components/role-tags';
import type { UserDetail } from '../../domain/user.schema';
import { AccountSectionTitle } from './account-section-title';

interface AccountAccessPanelProps {
  user: UserDetail;
}

export const AccountAccessPanel = ({ user }: AccountAccessPanelProps) => {
  const { t } = useTranslation();
  const abilitiesQuery = useAbilities();

  return (
    <Flex vertical gap="middle">
      <AccountSectionTitle>{t('account.access.title')}</AccountSectionTitle>
      <Typography.Text strong>{t('users.fields.roles')}</Typography.Text>
      <RoleTags roles={user.roles} />
      <Typography.Text strong>
        {t('account.access.permissions')}
      </Typography.Text>
      {abilitiesQuery.isPending && (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      )}
      {abilitiesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={getApiErrorMessage(abilitiesQuery.error)}
        />
      )}
      {abilitiesQuery.isSuccess && (
        <AbilitySummary abilities={abilitiesQuery.data} />
      )}
    </Flex>
  );
};
