import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  type SpendingPerspective,
  spendingPerspectiveSchema,
} from '@/modules/preferences/domain/preferences.schema';
import { useUpdatePreferences } from '@/modules/preferences/infra/preferences.queries';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';

interface PerspectiveSwitchProps {
  value: SpendingPerspective;
}

export const PerspectiveSwitch = ({ value }: PerspectiveSwitchProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useUpdatePreferences();

  return (
    <Segmented<SpendingPerspective>
      aria-label={t('preferences.fields.spendingPerspective')}
      value={
        mutation.isPending ? mutation.variables.spendingPerspective : value
      }
      disabled={mutation.isPending}
      onChange={(spendingPerspective) =>
        mutation.mutate({ spendingPerspective }, { onError: showError })
      }
      options={spendingPerspectiveSchema.options.map((option) => ({
        value: option,
        label: t(`preferences.spendingPerspectives.${option}`),
      }))}
    />
  );
};
