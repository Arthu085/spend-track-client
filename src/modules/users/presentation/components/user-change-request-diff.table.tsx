import { Flex, Table, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleTags } from '@/modules/authorization/presentation/components/role-tags';
import {
  isProfileFieldChanged,
  type UserChangeRequest,
  type UserProfileField,
  type UserProfileValues,
} from '../../domain/user-change-request.schema';

interface UserChangeRequestDiffTableProps {
  request: UserChangeRequest;
}

interface DiffRow {
  field: UserProfileField;
  changed: boolean;
  current: ReactNode;
  requested: ReactNode;
}

const PROFILE_FIELDS: UserProfileField[] = ['name', 'email', 'roles'];

const VALUE_COLUMN_WIDTH = '40%';

const renderValue = (values: UserProfileValues, field: UserProfileField) =>
  field === 'roles' ? <RoleTags roles={values.roles} /> : values[field];

export const UserChangeRequestDiffTable = ({
  request,
}: UserChangeRequestDiffTableProps) => {
  const { t } = useTranslation();

  const rows: DiffRow[] = PROFILE_FIELDS.map((field) => ({
    field,
    changed: isProfileFieldChanged(request, field),
    current: renderValue(request.current, field),
    requested: renderValue(request.requested, field),
  }));

  return (
    <Table<DiffRow>
      rowKey="field"
      size="small"
      pagination={false}
      scroll={{ x: true }}
      dataSource={rows}
      columns={[
        {
          key: 'field',
          title: t('changeRequests.columns.field'),
          render: (_, { field, changed }) => (
            <Flex gap="small" align="center">
              {t(`users.fields.${field}`)}
              {changed && <Tag>{t('changeRequests.changed')}</Tag>}
            </Flex>
          ),
        },
        {
          key: 'current',
          title: t('changeRequests.columns.current'),
          width: VALUE_COLUMN_WIDTH,
          render: (_, { current, changed }) => (
            <Typography.Text type={changed ? 'secondary' : undefined}>
              {current}
            </Typography.Text>
          ),
        },
        {
          key: 'requested',
          title: t('changeRequests.columns.requested'),
          width: VALUE_COLUMN_WIDTH,
          render: (_, { requested, changed }) => (
            <Typography.Text strong={changed}>{requested}</Typography.Text>
          ),
        },
      ]}
    />
  );
};
