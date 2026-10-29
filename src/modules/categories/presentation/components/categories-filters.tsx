import { Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import type { categoryFiltersShape } from '../../domain/category-form.schemas';
import { categoryKindSchema } from '../../domain/category.schema';

interface CategoriesFiltersProps {
  listParams: ListParams<typeof categoryFiltersShape>;
}

export const CategoriesFilters = ({ listParams }: CategoriesFiltersProps) => {
  const { t } = useTranslation();

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="kind" label={t('categories.fields.kind')}>
        <Select
          options={categoryKindSchema.options.map((kind) => ({
            value: kind,
            label: t(`categories.kinds.${kind}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="status" label={t('categories.fields.status')}>
        <RecordStatusSelect />
      </Form.Item>
    </ListFiltersForm>
  );
};
