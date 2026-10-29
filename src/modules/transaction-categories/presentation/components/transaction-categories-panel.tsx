import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Flex,
  Popconfirm,
  Space,
  Switch,
  type TableColumnsType,
  Tag,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import { useListParams } from '@/shared/list/use-list-params';
import {
  transactionCategoryFiltersShape,
  defaultTransactionCategoryFilters,
} from '../../domain/transaction-category-form.schemas';
import {
  type TransactionCategory,
  isPersonalTransactionCategory,
} from '../../domain/transaction-category.schema';
import {
  useTransactionCategories,
  useDeleteTransactionCategory,
  useUpdateTransactionCategoryStatus,
} from '../../infra/transaction-categories.queries';
import { TransactionCategoriesFilters } from './transaction-categories-filters';
import { TransactionCategoryFormModal } from './transaction-category-form.modal';

type EditorState =
  { mode: 'create' } | { mode: 'edit'; category: TransactionCategory };

export const TransactionCategoriesPanel = () => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const listParams = useListParams(
    transactionCategoryFiltersShape,
    defaultTransactionCategoryFilters,
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const { page, limit, filters } = listParams;
  const transactionCategoriesQuery = useTransactionCategories({
    page,
    limit,
    ...filters,
  });
  const statusMutation = useUpdateTransactionCategoryStatus();
  const deleteMutation = useDeleteTransactionCategory();

  const removeTransactionCategory = (uuid: string) => {
    const isLastRowOfPage =
      transactionCategoriesQuery.data?.data.length === 1 && page > 1;

    deleteMutation.mutate(uuid, {
      onSuccess: () => {
        if (isLastRowOfPage) {
          listParams.setPagination(page - 1, limit);
        }
      },
      onError: showError,
    });
  };

  const columns: TableColumnsType<TransactionCategory> = [
    {
      title: t('transactionCategories.fields.name'),
      dataIndex: 'name',
      render: (_, { name, color }) => (
        <Badge color={color ?? undefined} text={name} />
      ),
    },
    {
      title: t('transactionCategories.fields.scope'),
      dataIndex: 'scopeLabel',
      render: (_, { scope, scopeLabel }) => (
        <Tag color={scope === 'PERSONAL' ? 'processing' : undefined}>
          {scopeLabel}
        </Tag>
      ),
    },
    {
      title: t('transactionCategories.fields.status'),
      dataIndex: 'status',
      render: (_, category) =>
        isPersonalTransactionCategory(category) ? (
          <Space>
            <Switch
              size="small"
              aria-label={t('transactionCategories.actions.toggleStatus', {
                name: category.name,
              })}
              checked={category.status === 'ACTIVE'}
              loading={
                statusMutation.isPending &&
                statusMutation.variables.uuid === category.uuid
              }
              onChange={(checked) => {
                statusMutation.mutate(
                  {
                    uuid: category.uuid,
                    status: checked ? 'ACTIVE' : 'INACTIVE',
                  },
                  { onError: showError },
                );
              }}
            />
            {category.statusLabel}
          </Space>
        ) : (
          category.statusLabel
        ),
    },
    {
      title: t('transactionCategories.fields.actions'),
      key: 'actions',
      render: (_, category) =>
        isPersonalTransactionCategory(category) && (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              aria-label={t('transactionCategories.actions.edit', {
                name: category.name,
              })}
              disabled={category.status === 'INACTIVE'}
              onClick={() => setEditor({ mode: 'edit', category })}
            />
            <Popconfirm
              title={t('transactionCategories.delete.title')}
              description={t('transactionCategories.delete.description', {
                name: category.name,
              })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeTransactionCategory(category.uuid)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('transactionCategories.actions.delete', {
                  name: category.name,
                })}
                loading={
                  deleteMutation.isPending &&
                  deleteMutation.variables === category.uuid
                }
              />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Card
      title={t('transactionCategories.title')}
      extra={
        <Button
          icon={<PlusOutlined />}
          onClick={() => setEditor({ mode: 'create' })}
        >
          {t('transactionCategories.create.title')}
        </Button>
      }
    >
      <Flex vertical gap="middle">
        <TransactionCategoriesFilters listParams={listParams} />
        <PaginatedTable
          query={transactionCategoriesQuery}
          listParams={listParams}
          rowKey="uuid"
          columns={columns}
        />
      </Flex>
      <TransactionCategoryFormModal
        open={editor !== null}
        category={editor?.mode === 'edit' ? editor.category : undefined}
        defaultKind={filters.kind ?? 'EXPENSE'}
        onClose={() => setEditor(null)}
      />
    </Card>
  );
};
