import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import type { accountFiltersShape } from '../../domain/account-form.schemas';

interface AccountsFiltersProps {
  listParams: ListParams<typeof accountFiltersShape>;
}

export const AccountsFilters = ({ listParams }: AccountsFiltersProps) => {
  const { t } = useTranslation();

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="status" label={t('accounts.fields.status')}>
        <RecordStatusSelect />
      </Form.Item>
    </ListFiltersForm>
  );
};
