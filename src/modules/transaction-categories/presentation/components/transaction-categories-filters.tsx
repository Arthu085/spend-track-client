import { Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import type { transactionCategoryFiltersShape } from '../../domain/transaction-category-form.schemas';
import { transactionCategoryKindSchema } from '../../domain/transaction-category.schema';

interface TransactionCategoriesFiltersProps {
  listParams: ListParams<typeof transactionCategoryFiltersShape>;
}

export const TransactionCategoriesFilters = ({
  listParams,
}: TransactionCategoriesFiltersProps) => {
  const { t } = useTranslation();

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="kind" label={t('transactionCategories.fields.kind')}>
        <Select
          options={transactionCategoryKindSchema.options.map((kind) => ({
            value: kind,
            label: t(`transactionCategories.kinds.${kind}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="status" label={t('transactionCategories.fields.status')}>
        <RecordStatusSelect />
      </Form.Item>
    </ListFiltersForm>
  );
};
