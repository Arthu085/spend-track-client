import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { type UseQueryResult, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Popconfirm,
  Space,
  Switch,
  type TableColumnsType,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { useSession } from '@/modules/auth/infra/auth.queries';
import {
  type Ability,
  hasAbility,
} from '@/modules/authorization/domain/ability.schema';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { RoleTags } from '@/modules/authorization/presentation/components/role-tags';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import type { userFiltersShape } from '../../domain/user-form.schemas';
import type { UserDetail, UserListItem } from '../../domain/user.schema';
import {
  useDeleteUser,
  userQuery,
  useUpdateUserStatus,
} from '../../infra/users.queries';

interface LoadingUser {
  uuid: string;
  purpose: 'details' | 'edit';
}

interface UsersTableProps {
  query: UseQueryResult<PaginatedResponse<UserListItem>>;
  listParams: ListParams<typeof userFiltersShape>;
  onView: (user: UserDetail) => void;
  onEdit: (user: UserDetail) => void;
}

export const UsersTable = ({
  query,
  listParams,
  onView,
  onEdit,
}: UsersTableProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const queryClient = useQueryClient();
  const { data: sessionUser } = useSession();
  const { data: abilities = [] } = useAbilities();
  const { page, limit, setPagination } = listParams;
  const statusMutation = useUpdateUserStatus();
  const deleteMutation = useDeleteUser();
  const [loadingUser, setLoadingUser] = useState<LoadingUser>();

  const canManageUsers = (action: Ability['action']) =>
    hasAbility(abilities, { action, subject: 'USER' });

  const openWithCurrentUser = (
    uuid: string,
    purpose: LoadingUser['purpose'],
    open: (user: UserDetail) => void,
  ) => {
    setLoadingUser({ uuid, purpose });
    queryClient
      .fetchQuery(userQuery(uuid))
      .then(open, showError)
      .finally(() => setLoadingUser(undefined));
  };

  const isLoadingUser = (uuid: string, purpose: LoadingUser['purpose']) =>
    loadingUser?.uuid === uuid && loadingUser.purpose === purpose;

  const removeUser = (uuid: string) => {
    const isLastRowOfPage = query.data?.data.length === 1 && page > 1;

    deleteMutation.mutate(uuid, {
      onSuccess: () => {
        if (isLastRowOfPage) {
          setPagination(page - 1, limit);
        }
      },
      onError: showError,
    });
  };

  const columns: TableColumnsType<UserListItem> = [
    {
      title: t('users.fields.name'),
      dataIndex: 'name',
      render: (_, { uuid, name }) => (
        <Space size="small">
          {name}
          {uuid === sessionUser?.uuid && (
            <Typography.Text type="secondary">
              {t('users.currentUser')}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: t('users.fields.roles'),
      dataIndex: 'roles',
      render: (_, { roles }) => <RoleTags roles={roles} />,
    },
    {
      title: t('users.fields.status'),
      dataIndex: 'status',
      render: (_, { uuid, name, status, statusLabel }) => (
        <Space>
          {canManageUsers('UPDATE') && (
            <Switch
              size="small"
              aria-label={t('users.actions.toggleStatus', { name })}
              checked={status === 'ACTIVE'}
              loading={
                statusMutation.isPending &&
                statusMutation.variables.uuid === uuid
              }
              onChange={(checked) => {
                statusMutation.mutate(
                  { uuid, status: checked ? 'ACTIVE' : 'INACTIVE' },
                  { onError: showError },
                );
              }}
            />
          )}
          {statusLabel}
        </Space>
      ),
    },
    {
      title: t('users.fields.actions'),
      key: 'actions',
      render: (_, { uuid, name, status }) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            aria-label={t('users.actions.details', { name })}
            disabled={status === 'INACTIVE'}
            loading={isLoadingUser(uuid, 'details')}
            onClick={() => openWithCurrentUser(uuid, 'details', onView)}
          />
          {canManageUsers('UPDATE') && (
            <Button
              size="small"
              icon={<EditOutlined />}
              aria-label={t('users.actions.edit', { name })}
              disabled={status === 'INACTIVE'}
              loading={isLoadingUser(uuid, 'edit')}
              onClick={() => openWithCurrentUser(uuid, 'edit', onEdit)}
            />
          )}
          {canManageUsers('DELETE') && (
            <Popconfirm
              title={t('users.delete.title')}
              description={t('users.delete.description', { name })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeUser(uuid)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('users.actions.delete', { name })}
                loading={
                  deleteMutation.isPending && deleteMutation.variables === uuid
                }
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PaginatedTable
      query={query}
      listParams={listParams}
      rowKey="uuid"
      columns={columns}
    />
  );
};
