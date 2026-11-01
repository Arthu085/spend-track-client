import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import { type ListParams, MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import {
  PURCHASE_DESCRIPTION_MAX_LENGTH,
  type creditCardPurchaseFiltersShape,
} from '../../domain/credit-card-form.schemas';
import { useCreditCards } from '../../infra/credit-cards.queries';

interface CreditCardPurchasesFiltersProps {
  listParams: ListParams<typeof creditCardPurchaseFiltersShape>;
}

export const CreditCardPurchasesFilters = ({
  listParams,
}: CreditCardPurchasesFiltersProps) => {
  const { t } = useTranslation();
  const { data: cards } = useCreditCards({ limit: MAX_PAGE_SIZE });
  const { data: categories } = useTransactionCategories({
    kind: 'EXPENSE',
    limit: MAX_PAGE_SIZE,
  });

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="cardUuid" label={t('creditCards.fields.card')}>
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(cards?.data ?? [])}
        />
      </Form.Item>
      <Form.Item name="categoryUuid" label={t('creditCards.fields.category')}>
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(categories?.data ?? [])}
        />
      </Form.Item>
      <Form.Item name="description" label={t('creditCards.fields.description')}>
        <Input maxLength={PURCHASE_DESCRIPTION_MAX_LENGTH} />
      </Form.Item>
    </ListFiltersForm>
  );
};
