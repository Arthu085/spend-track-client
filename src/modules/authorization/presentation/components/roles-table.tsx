import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Flex, Table, type TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { IconActionButton } from '@/shared/components/icon-action-button';
import type { ListSorting } from '@/shared/list/use-list-sorting';
import type { z } from 'zod';
import type { Role, roleSortBySchema } from '../../domain/role.schema';

interface RolesTableProps {
  query: UseQueryResult<Role[]>;
  listSorting: ListSorting<z.infer<typeof roleSortBySchema>>;
  onOpenAbilities: (role: Role) => void;
}

export const RolesTable = ({
  query,
  listSorting,
  onOpenAbilities,
}: RolesTableProps) => {
  const { t } = useTranslation();

  const columns: TableColumnsType<Role> = [
    {
      title: t('roles.fields.role'),
      dataIndex: 'roleLabel',
      ...listSorting.columnSorting('role'),
    },
    {
      title: t('roles.fields.status'),
      dataIndex: 'statusLabel',
      ...listSorting.columnSorting('status'),
    },
    {
      title: t('roles.fields.actions'),
      key: 'actions',
      render: (_, role) => (
        <IconActionButton
          size="small"
          icon={<SafetyCertificateOutlined />}
          label={t('roles.actions.abilities', { role: role.roleLabel })}
          disabled={role.status === 'INACTIVE'}
          onClick={() => onOpenAbilities(role)}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap="middle">
      {query.isError && (
        <Alert type="error" showIcon title={getApiErrorMessage(query.error)} />
      )}
      <Table
        rowKey="uuid"
        pagination={false}
        scroll={{ x: 'max-content' }}
        loading={query.isFetching}
        columns={columns}
        dataSource={query.data}
        onChange={(_pagination, _filters, sorter, extra) => {
          if (extra.action === 'sort' && !Array.isArray(sorter)) {
            listSorting.setSorting(sorter.columnKey, sorter.order);
          }
        }}
      />
    </Flex>
  );
};
