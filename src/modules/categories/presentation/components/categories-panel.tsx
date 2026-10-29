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
  categoryFiltersShape,
  defaultCategoryFilters,
} from '../../domain/category-form.schemas';
import {
  type Category,
  isPersonalCategory,
} from '../../domain/category.schema';
import {
  useCategories,
  useDeleteCategory,
  useUpdateCategoryStatus,
} from '../../infra/categories.queries';
import { CategoriesFilters } from './categories-filters';
import { CategoryFormModal } from './category-form.modal';

type EditorState = { mode: 'create' } | { mode: 'edit'; category: Category };

export const CategoriesPanel = () => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const listParams = useListParams(
    categoryFiltersShape,
    defaultCategoryFilters,
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const { page, limit, filters } = listParams;
  const categoriesQuery = useCategories({ page, limit, ...filters });
  const statusMutation = useUpdateCategoryStatus();
  const deleteMutation = useDeleteCategory();

  const removeCategory = (uuid: string) => {
    const isLastRowOfPage = categoriesQuery.data?.data.length === 1 && page > 1;

    deleteMutation.mutate(uuid, {
      onSuccess: () => {
        if (isLastRowOfPage) {
          listParams.setPagination(page - 1, limit);
        }
      },
      onError: showError,
    });
  };

  const columns: TableColumnsType<Category> = [
    {
      title: t('categories.fields.name'),
      dataIndex: 'name',
      render: (_, { name, color }) => (
        <Badge color={color ?? undefined} text={name} />
      ),
    },
    {
      title: t('categories.fields.scope'),
      dataIndex: 'scopeLabel',
      render: (_, { scope, scopeLabel }) => (
        <Tag color={scope === 'PERSONAL' ? 'processing' : undefined}>
          {scopeLabel}
        </Tag>
      ),
    },
    {
      title: t('categories.fields.status'),
      dataIndex: 'status',
      render: (_, category) =>
        isPersonalCategory(category) ? (
          <Space>
            <Switch
              size="small"
              aria-label={t('categories.actions.toggleStatus', {
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
      title: t('categories.fields.actions'),
      key: 'actions',
      render: (_, category) =>
        isPersonalCategory(category) && (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              aria-label={t('categories.actions.edit', { name: category.name })}
              disabled={category.status === 'INACTIVE'}
              onClick={() => setEditor({ mode: 'edit', category })}
            />
            <Popconfirm
              title={t('categories.delete.title')}
              description={t('categories.delete.description', {
                name: category.name,
              })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeCategory(category.uuid)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('categories.actions.delete', {
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
      title={t('categories.title')}
      extra={
        <Button
          icon={<PlusOutlined />}
          onClick={() => setEditor({ mode: 'create' })}
        >
          {t('categories.create.title')}
        </Button>
      }
    >
      <Flex vertical gap="middle">
        <CategoriesFilters listParams={listParams} />
        <PaginatedTable
          query={categoriesQuery}
          listParams={listParams}
          rowKey="uuid"
          columns={columns}
        />
      </Flex>
      <CategoryFormModal
        open={editor !== null}
        category={editor?.mode === 'edit' ? editor.category : undefined}
        defaultKind={filters.kind ?? 'EXPENSE'}
        onClose={() => setEditor(null)}
      />
    </Card>
  );
};
