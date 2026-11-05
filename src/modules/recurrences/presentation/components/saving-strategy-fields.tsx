import { Col, Form, Row, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import { nonNegativeMoneyInputSchema } from '@/shared/money/money';
import { savingStrategyFormShape } from '../../domain/recurrence-form.schemas';
import { additionalContributionStrategySchema } from '../../domain/recurrence.schema';

const HALF_WIDTH = { xs: 24, sm: 12 } as const;

export const SavingStrategyFields = () => {
  const { t } = useTranslation();
  const enabled = Form.useWatch<boolean | undefined>('useSavingStrategy');

  return (
    <>
      <Form.Item
        name="useSavingStrategy"
        label={t('recurrences.fields.savingStrategy')}
        extra={t('recurrences.hints.savingStrategy')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      {enabled && (
        <Row gutter={16}>
          <Col {...HALF_WIDTH}>
            <Form.Item
              name="minimumRetainedBalance"
              label={t('recurrences.fields.minimumRetainedBalance')}
              extra={t('recurrences.hints.minimumRetainedBalance')}
              rules={[zodRule(nonNegativeMoneyInputSchema)]}
            >
              <MoneyInput />
            </Form.Item>
          </Col>
          <Col {...HALF_WIDTH}>
            <Form.Item
              name="additionalContribution"
              label={t('recurrences.fields.additionalContribution')}
              initialValue="REMAINING_SURPLUS"
              rules={[zodRule(savingStrategyFormShape.additionalContribution)]}
            >
              <Select
                options={additionalContributionStrategySchema.options.map(
                  (option) => ({
                    value: option,
                    label: t(`recurrences.additionalContributions.${option}`),
                  }),
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
    </>
  );
};
