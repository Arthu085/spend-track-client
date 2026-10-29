import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Button,
  Flex,
  Popconfirm,
  Space,
  Switch,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateOnly } from '@/shared/date/date-only';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import type { accountFiltersShape } from '../../domain/account-form.schemas';
import type { Account } from '../../domain/account.schema';
import {
  useDeleteAccount,
  useUpdateAccountStatus,
} from '../../infra/accounts.queries';

interface AccountsTableProps {
  query: UseQueryResult<PaginatedResponse<Account>>;
  listParams: ListParams<typeof accountFiltersShape>;
  onEdit: (account: Account) => void;
}

export const AccountsTable = ({
  query,
  listParams,
  onEdit,
}: AccountsTableProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const { page, limit, setPagination } = listParams;
  const statusMutation = useUpdateAccountStatus();
  const deleteMutation = useDeleteAccount();

  const removeAccount = (uuid: string) => {
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

  const columns: TableColumnsType<Account> = [
    {
      title: t('accounts.fields.name'),
      dataIndex: 'name',
      render: (_, { name, isDefault }) => (
        <Space size="small" wrap>
          {name}
          {isDefault && <Tag>{t('accounts.default')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('accounts.fields.type'),
      dataIndex: 'typeLabel',
    },
    {
      title: t('accounts.fields.currentBalance'),
      dataIndex: 'currentBalance',
      align: 'right',
      render: (_, { currentBalance }) => <MoneyText amount={currentBalance} />,
    },
    {
      title: t('accounts.fields.openingBalance'),
      dataIndex: 'openingBalance',
      align: 'right',
      render: (_, { openingBalance, openingBalanceDate }) => (
        <Flex vertical align="end">
          <MoneyText amount={openingBalance} />
          <Typography.Text type="secondary">
            {t('accounts.openingBalanceOn', {
              date: formatDateOnly(openingBalanceDate, i18n.language),
            })}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('accounts.fields.status'),
      dataIndex: 'status',
      render: (_, { uuid, name, status, statusLabel }) => (
        <Space>
          <Switch
            size="small"
            aria-label={t('accounts.actions.toggleStatus', { name })}
            checked={status === 'ACTIVE'}
            loading={
              statusMutation.isPending && statusMutation.variables.uuid === uuid
            }
            onChange={(checked) => {
              statusMutation.mutate(
                { uuid, status: checked ? 'ACTIVE' : 'INACTIVE' },
                { onError: showError },
              );
            }}
          />
          {statusLabel}
        </Space>
      ),
    },
    {
      title: t('accounts.fields.actions'),
      key: 'actions',
      render: (_, account) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label={t('accounts.actions.edit', { name: account.name })}
            disabled={account.status === 'INACTIVE'}
            onClick={() => onEdit(account)}
          />
          <Popconfirm
            title={t('accounts.delete.title')}
            description={t('accounts.delete.description', {
              name: account.name,
            })}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => removeAccount(account.uuid)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={t('accounts.actions.delete', { name: account.name })}
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === account.uuid
              }
            />
          </Popconfirm>
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
      locale={{ emptyText: t('accounts.empty') }}
    />
  );
};
