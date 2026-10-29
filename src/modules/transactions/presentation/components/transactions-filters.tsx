import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import { type ListParams, MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  type transactionFiltersShape,
} from '../../domain/transaction-form.schemas';
import {
  transactionStateSchema,
  transactionTypeSchema,
} from '../../domain/transaction.schema';
import { toReferenceOptions } from './reference-options';

interface TransactionsFiltersProps {
  listParams: ListParams<typeof transactionFiltersShape>;
}

export const TransactionsFilters = ({
  listParams,
}: TransactionsFiltersProps) => {
  const { t } = useTranslation();
  const { type } = listParams.filters;
  const { data: accounts } = useAccounts({ limit: MAX_PAGE_SIZE });
  const { data: categories } = useTransactionCategories({
    kind: type === 'INCOME' || type === 'EXPENSE' ? type : undefined,
    limit: MAX_PAGE_SIZE,
  });

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="type" label={t('transactions.fields.type')}>
        <Select
          allowClear
          options={transactionTypeSchema.options.map((option) => ({
            value: option,
            label: t(`transactions.types.${option}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="state" label={t('transactions.fields.state')}>
        <Select
          allowClear
          options={transactionStateSchema.options.map((option) => ({
            value: option,
            label: t(`transactions.states.${option}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="accountUuid" label={t('transactions.fields.account')}>
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(accounts?.data ?? [])}
        />
      </Form.Item>
      <Form.Item name="categoryUuid" label={t('transactions.fields.category')}>
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(categories?.data ?? [])}
        />
      </Form.Item>
      <Form.Item
        name="description"
        label={t('transactions.fields.description')}
      >
        <Input maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH} />
      </Form.Item>
    </ListFiltersForm>
  );
};
