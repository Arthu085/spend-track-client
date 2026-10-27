import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasAbility } from '@/modules/authorization/domain/ability.schema';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { useListParams } from '@/shared/list/use-list-params';
import {
  defaultUserFilters,
  userFiltersShape,
} from '../../domain/user-form.schemas';
import type { UserDetail } from '../../domain/user.schema';
import { useUsers } from '../../infra/users.queries';
import { CreateUserModal } from '../components/create-user.modal';
import { EditUserModal } from '../components/edit-user.modal';
import { UserDetailsModal } from '../components/user-details.modal';
import { UsersFilters } from '../components/users-filters';
import { UsersTable } from '../components/users-table';

export const UsersPage = () => {
  const { t } = useTranslation();
  const { data: abilities = [] } = useAbilities();
  const listParams = useListParams(userFiltersShape, defaultUserFilters);
  const { page, limit, filters } = listParams;
  const usersQuery = useUsers({ page, limit, ...filters });
  const [creating, setCreating] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserDetail | null>(null);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);

  const canCreateUsers = hasAbility(abilities, {
    action: 'CREATE',
    subject: 'USER',
  });

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('users.title')}
        </Typography.Title>
        {canCreateUsers && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            {t('users.create.title')}
          </Button>
        )}
      </Flex>
      <UsersFilters listParams={listParams} />
      <UsersTable
        query={usersQuery}
        listParams={listParams}
        onView={setViewingUser}
        onEdit={setEditingUser}
      />
      <CreateUserModal open={creating} onClose={() => setCreating(false)} />
      <UserDetailsModal
        user={viewingUser}
        onClose={() => setViewingUser(null)}
      />
      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
    </Flex>
  );
};
