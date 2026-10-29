import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Segmented,
  Space,
  Switch,
  Table,
  type TableColumnsType,
  Tag,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import type { RecordStatus } from '@/shared/domain/record-status.schema';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import {
  type Category,
  type CategoryKind,
  categoryKindSchema,
  isPersonalCategory,
  sortCategoriesByName,
} from '../../domain/category.schema';
import {
  useCategories,
  useUpdateCategoryStatus,
} from '../../infra/categories.queries';
import { CategoryFormModal } from './category-form.modal';

type EditorState = { mode: 'create' } | { mode: 'edit'; category: Category };

export const CategoriesPanel = () => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [status, setStatus] = useState<RecordStatus>('ACTIVE');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const categoriesQuery = useCategories({ kind, status });
  const statusMutation = useUpdateCategoryStatus();

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
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label={t('categories.actions.edit', { name: category.name })}
            disabled={category.status === 'INACTIVE'}
            onClick={() => setEditor({ mode: 'edit', category })}
          />
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
        <Flex gap="middle" wrap>
          <Segmented<CategoryKind>
            aria-label={t('categories.fields.kind')}
            value={kind}
            onChange={setKind}
            options={categoryKindSchema.options.map((value) => ({
              value,
              label: t(`categories.kinds.${value}`),
            }))}
          />
          <Segmented<RecordStatus>
            aria-label={t('categories.fields.status')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: t('categories.filters.active') },
              { value: 'INACTIVE', label: t('categories.filters.archived') },
            ]}
          />
        </Flex>
        {categoriesQuery.isError && (
          <Alert
            type="error"
            showIcon
            title={getApiErrorMessage(categoriesQuery.error)}
          />
        )}
        <Table<Category>
          rowKey="uuid"
          columns={columns}
          dataSource={sortCategoriesByName(
            categoriesQuery.data ?? [],
            i18n.language,
          )}
          loading={categoriesQuery.isFetching}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Flex>
      <CategoryFormModal
        open={editor !== null}
        category={editor?.mode === 'edit' ? editor.category : undefined}
        defaultKind={kind}
        onClose={() => setEditor(null)}
      />
    </Card>
  );
};
