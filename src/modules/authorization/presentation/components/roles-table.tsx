import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button, Flex, Table, type TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import type { Role } from '../../domain/role.schema';

interface RolesTableProps {
  query: UseQueryResult<Role[]>;
  onOpenAbilities: (role: Role) => void;
}

export const RolesTable = ({ query, onOpenAbilities }: RolesTableProps) => {
  const { t } = useTranslation();

  const columns: TableColumnsType<Role> = [
    {
      title: t('roles.fields.role'),
      dataIndex: 'roleLabel',
    },
    {
      title: t('roles.fields.status'),
      dataIndex: 'statusLabel',
    },
    {
      title: t('roles.fields.actions'),
      key: 'actions',
      render: (_, role) => (
        <Button
          size="small"
          icon={<SafetyCertificateOutlined />}
          aria-label={t('roles.actions.abilities', { role: role.roleLabel })}
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
        loading={query.isPending}
        columns={columns}
        dataSource={query.data}
      />
    </Flex>
  );
};
