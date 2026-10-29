import { Alert, Card, Form, Radio, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import {
  defaultMonthSchema,
  type PreferencesPayload,
  spendingPerspectiveSchema,
} from '../../domain/preferences.schema';
import {
  usePreferences,
  useUpdatePreferences,
} from '../../infra/preferences.queries';

export const PreferencesPanel = () => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const { data: preferences, error } = usePreferences();
  const mutation = useUpdatePreferences();

  const save = (payload: PreferencesPayload) =>
    mutation.mutate(payload, { onError: showError });

  return (
    <Card title={t('preferences.title')}>
      {error && !preferences && (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      )}
      {!preferences && !error && <Skeleton active />}
      {preferences && (
        <Form layout="vertical" disabled={mutation.isPending}>
          <Form.Item
            label={t('preferences.fields.spendingPerspective')}
            extra={t('preferences.hints.spendingPerspective')}
          >
            <Radio.Group
              aria-label={t('preferences.fields.spendingPerspective')}
              value={preferences.spendingPerspective}
              onChange={({ target }) =>
                save({
                  spendingPerspective: spendingPerspectiveSchema.parse(
                    target.value,
                  ),
                })
              }
              options={spendingPerspectiveSchema.options.map((option) => ({
                value: option,
                label: t(`preferences.spendingPerspectives.${option}`),
              }))}
            />
          </Form.Item>
          <Form.Item
            label={t('preferences.fields.defaultMonth')}
            extra={t('preferences.hints.defaultMonth')}
            style={{ marginBottom: 0 }}
          >
            <Radio.Group
              aria-label={t('preferences.fields.defaultMonth')}
              value={preferences.defaultMonth}
              onChange={({ target }) =>
                save({ defaultMonth: defaultMonthSchema.parse(target.value) })
              }
              options={defaultMonthSchema.options.map((option) => ({
                value: option,
                label: t(`preferences.defaultMonths.${option}`),
              }))}
            />
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};
