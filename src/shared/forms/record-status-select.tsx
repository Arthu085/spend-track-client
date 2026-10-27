import { Select, type SelectProps } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  type RecordStatus,
  recordStatusSchema,
} from '@/shared/domain/record-status.schema';

export const RecordStatusSelect = (
  props: Omit<SelectProps<RecordStatus>, 'options'>,
) => {
  const { t } = useTranslation();

  return (
    <Select<RecordStatus>
      {...props}
      options={recordStatusSchema.options.map((status) => ({
        value: status,
        label: t(`recordStatus.${status}`),
      }))}
    />
  );
};
