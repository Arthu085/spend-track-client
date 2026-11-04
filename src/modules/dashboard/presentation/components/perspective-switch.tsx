import { Flex, Radio, Typography } from 'antd';
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

  const selected =
    (mutation.isPending ? mutation.variables.spendingPerspective : undefined) ??
    value;

  return (
    <Flex vertical gap="small" align="end">
      <Radio.Group
        aria-label={t('preferences.fields.spendingPerspective')}
        optionType="button"
        buttonStyle="solid"
        value={selected}
        disabled={mutation.isPending}
        onChange={({ target }) =>
          mutation.mutate(
            {
              spendingPerspective: spendingPerspectiveSchema.parse(
                target.value,
              ),
            },
            { onError: showError },
          )
        }
        options={spendingPerspectiveSchema.options.map((option) => ({
          value: option,
          label: t(`preferences.spendingPerspectives.${option}`),
        }))}
      />
      <Typography.Text type="secondary">
        {t(`dashboard.perspective.${selected}`)}
      </Typography.Text>
    </Flex>
  );
};
