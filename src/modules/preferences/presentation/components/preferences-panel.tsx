import {
  Alert,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Flex,
  Form,
  Radio,
  Row,
  Skeleton,
  theme,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { dashboardCardTitles } from '@/modules/dashboard/presentation/components/dashboard-card-titles';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import {
  type DashboardCard,
  dashboardCardSchema,
  defaultMonthSchema,
  type PreferencesPayload,
  spendingPerspectiveSchema,
} from '../../domain/preferences.schema';
import {
  usePreferences,
  useUpdatePreferences,
} from '../../infra/preferences.queries';

const withCardCollapsed = (
  collapsedCards: readonly DashboardCard[],
  card: DashboardCard,
  collapsed: boolean,
) =>
  dashboardCardSchema.options.filter((option) =>
    option === card ? collapsed : collapsedCards.includes(option),
  );

export const PreferencesPanel = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
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
        <ConfigProvider
          theme={{ components: { Form: { labelFontSize: token.fontSizeLG } } }}
        >
          <Form layout="vertical" disabled={mutation.isPending}>
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
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
                    options={spendingPerspectiveSchema.options.map(
                      (option) => ({
                        value: option,
                        label: t(`preferences.spendingPerspectives.${option}`),
                      }),
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={t('preferences.fields.defaultMonth')}
                  extra={t('preferences.hints.defaultMonth')}
                >
                  <Radio.Group
                    aria-label={t('preferences.fields.defaultMonth')}
                    value={preferences.defaultMonth}
                    onChange={({ target }) =>
                      save({
                        defaultMonth: defaultMonthSchema.parse(target.value),
                      })
                    }
                    options={defaultMonthSchema.options.map((option) => ({
                      value: option,
                      label: t(`preferences.defaultMonths.${option}`),
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ marginTop: 0 }} />
            <Form.Item
              label={t('preferences.fields.collapsedDashboardCards')}
              style={{ marginBottom: 0 }}
            >
              <Flex vertical gap="small">
                {dashboardCardSchema.options.map((card) => {
                  const title = t(dashboardCardTitles[card]);

                  return (
                    <Flex
                      key={card}
                      justify="space-between"
                      align="center"
                      gap="small"
                      wrap
                    >
                      <Typography.Text>{title}</Typography.Text>
                      <Radio.Group
                        aria-label={title}
                        value={preferences.collapsedDashboardCards.includes(
                          card,
                        )}
                        onChange={({ target }) =>
                          save({
                            collapsedDashboardCards: withCardCollapsed(
                              preferences.collapsedDashboardCards,
                              card,
                              target.value === true,
                            ),
                          })
                        }
                        options={[
                          {
                            value: false,
                            label: t('preferences.dashboardCardStates.visible'),
                          },
                          {
                            value: true,
                            label: t('preferences.dashboardCardStates.hidden'),
                          },
                        ]}
                      />
                    </Flex>
                  );
                })}
              </Flex>
            </Form.Item>
          </Form>
        </ConfigProvider>
      )}
    </Card>
  );
};
