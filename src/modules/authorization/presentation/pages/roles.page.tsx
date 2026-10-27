import { Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Role } from '../../domain/role.schema';
import { useRoles } from '../../infra/roles.queries';
import { RoleAbilitiesModal } from '../components/role-abilities.modal';
import { RolesTable } from '../components/roles-table';

export const RolesPage = () => {
  const { t } = useTranslation();
  const rolesQuery = useRoles();
  const [openRole, setOpenRole] = useState<Role | null>(null);

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2} style={{ margin: 0 }}>
        {t('roles.title')}
      </Typography.Title>
      <RolesTable query={rolesQuery} onOpenAbilities={setOpenRole} />
      <RoleAbilitiesModal role={openRole} onClose={() => setOpenRole(null)} />
    </Flex>
  );
};
