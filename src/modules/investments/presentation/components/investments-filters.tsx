import { Form, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import type { investmentFiltersShape } from '../../domain/investment-form.schemas';
import { investmentTypeSchema } from '../../domain/investment.schema';

interface InvestmentsFiltersProps {
  listParams: ListParams<typeof investmentFiltersShape>;
}

export const InvestmentsFilters = ({ listParams }: InvestmentsFiltersProps) => {
  const { t } = useTranslation();

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="type" label={t('investments.fields.type')}>
        <Select
          allowClear
          options={investmentTypeSchema.options.map((type) => ({
            value: type,
            label: t(`investments.types.${type}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="status" label={t('investments.fields.status')}>
        <RecordStatusSelect />
      </Form.Item>
    </ListFiltersForm>
  );
};
