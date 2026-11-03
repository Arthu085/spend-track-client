import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import {
  RECURRENCE_DESCRIPTION_MAX_LENGTH,
  type recurrenceFiltersShape,
} from '../../domain/recurrence-form.schemas';
import {
  recurrenceStateSchema,
  recurrenceTypeSchema,
} from '../../domain/recurrence.schema';

interface RecurrencesFiltersProps {
  listParams: ListParams<typeof recurrenceFiltersShape>;
}

export const RecurrencesFilters = ({ listParams }: RecurrencesFiltersProps) => {
  const { t } = useTranslation();

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="state" label={t('recurrences.fields.state')}>
        <Select
          allowClear
          options={recurrenceStateSchema.options.map((option) => ({
            value: option,
            label: t(`recurrences.states.${option}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="type" label={t('recurrences.fields.type')}>
        <Select
          allowClear
          options={recurrenceTypeSchema.options.map((option) => ({
            value: option,
            label: t(`transactions.types.${option}`),
          }))}
        />
      </Form.Item>
      <Form.Item name="description" label={t('recurrences.fields.description')}>
        <Input maxLength={RECURRENCE_DESCRIPTION_MAX_LENGTH} />
      </Form.Item>
    </ListFiltersForm>
  );
};
