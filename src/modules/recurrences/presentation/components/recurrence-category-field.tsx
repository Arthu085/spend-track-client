import { Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TransactionCategoryKind } from '@/modules/transaction-categories/domain/transaction-category.schema';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';

interface RecurrenceCategoryFieldProps {
  kind: TransactionCategoryKind;
  retained?: Parameters<typeof toReferenceOptions>[1];
}

export const RecurrenceCategoryField = ({
  kind,
  retained,
}: RecurrenceCategoryFieldProps) => {
  const { t } = useTranslation();
  const { data: categories } = useTransactionCategories({
    kind,
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });

  return (
    <Form.Item
      name="categoryUuid"
      label={t('recurrences.fields.category')}
      rules={[zodRule(requiredUuidSchema)]}
    >
      <Select
        showSearch={{ optionFilterProp: 'label' }}
        options={toReferenceOptions(categories?.data ?? [], retained)}
      />
    </Form.Item>
  );
};
