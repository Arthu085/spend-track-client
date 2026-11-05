import { Alert, DatePicker, Form, Radio, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  DATE_ONLY_FORMAT,
  dateInputFormat,
  todayDateOnly,
} from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  formatMoney,
  isPositiveMoney,
  MONEY_DECIMAL_PATTERN,
  moneyToCents,
} from '@/shared/money/money';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type AdditionalContributionForm,
  additionalContributionFormSchema,
  toAdditionalContributionPayload,
} from '../../domain/recurrence-form.schemas';
import type { SavingPlan } from '../../domain/saving-plan.schema';
import { useAcceptAdditionalContribution } from '../../infra/recurrences.queries';

interface AcceptAdditionalContributionModalProps {
  open: boolean;
  plan?: SavingPlan;
  onClose: () => void;
}

const MONTH_FORMAT = 'YYYY-MM';

const isAfterToday = (date: Dayjs) =>
  date.format(DATE_ONLY_FORMAT) > todayDateOnly();

const isInMonth = (date: Dayjs, month: string) =>
  date.format(MONTH_FORMAT) === dayjs(month).format(MONTH_FORMAT);

const initialValuesOf = (
  plan?: SavingPlan,
): Partial<AdditionalContributionForm> => {
  if (!plan) {
    return {};
  }

  const today = dayjs(todayDateOnly());
  const date = isInMonth(today, plan.month) ? today : dayjs(plan.month);

  return {
    amount: isPositiveMoney(plan.suggestedAdditional)
      ? plan.suggestedAdditional
      : undefined,
    date,
    state: isAfterToday(date) ? 'PLANNED' : 'COMPLETED',
  };
};

const AdditionalContributionFields = ({ plan }: { plan: SavingPlan }) => {
  const { t, i18n } = useTranslation();
  const form = Form.useFormInstance<AdditionalContributionForm>();
  const amount = Form.useWatch<string | undefined>('amount');
  const date = Form.useWatch<Dayjs | null | undefined>('date');
  const { shape } = additionalContributionFormSchema;
  const suggested = plan.suggestedAdditional;
  const suggestedLabel = formatMoney(suggested, i18n.language);
  const hasSuggestion = isPositiveMoney(suggested);
  const exceedsSuggestion =
    hasSuggestion &&
    amount !== undefined &&
    MONEY_DECIMAL_PATTERN.test(amount) &&
    moneyToCents(amount) > moneyToCents(suggested);
  const onlyPlanned = dayjs.isDayjs(date) && isAfterToday(date);

  return (
    <>
      <Typography.Paragraph>
        {t('recurrences.additional.description', {
          description: plan.recurrence.description,
          investment: plan.investment.name,
        })}
      </Typography.Paragraph>
      <Alert
        type={hasSuggestion ? 'info' : 'warning'}
        showIcon
        title={
          hasSuggestion
            ? t('recurrences.additional.suggested', { amount: suggestedLabel })
            : t('recurrences.additional.noSuggestion')
        }
        style={{ marginBottom: 16 }}
      />
      <Form.Item
        name="amount"
        label={t('recurrences.additional.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      {exceedsSuggestion && (
        <Alert
          type="warning"
          showIcon
          title={t('recurrences.additional.exceedsSuggestion', {
            amount: suggestedLabel,
          })}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item
        name="date"
        label={t('recurrences.additional.date')}
        rules={[
          zodRule(shape.date),
          {
            validator: (_rule, value: unknown) =>
              dayjs.isDayjs(value) && !isInMonth(value, plan.month)
                ? Promise.reject(
                    new Error(t('recurrences.additional.dateOutsideMonth')),
                  )
                : Promise.resolve(),
          },
        ]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
          allowClear={false}
          disabledDate={(candidate) => !isInMonth(candidate, plan.month)}
          onChange={(next: Dayjs | null) => {
            if (next && isAfterToday(next)) {
              form.setFieldValue('state', 'PLANNED');
            }
          }}
        />
      </Form.Item>
      <Form.Item
        name="state"
        label={t('recurrences.additional.state')}
        extra={
          onlyPlanned ? t('recurrences.additional.futureOnlyPlanned') : null
        }
        rules={[zodRule(shape.state)]}
      >
        <Radio.Group
          options={shape.state.options.map((option) => ({
            value: option,
            label: t(`recurrences.additional.states.${option}`),
            disabled: option === 'COMPLETED' && onlyPlanned,
          }))}
        />
      </Form.Item>
    </>
  );
};

export const AcceptAdditionalContributionModal = ({
  open,
  plan,
  onClose,
}: AcceptAdditionalContributionModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useAcceptAdditionalContribution();

  const submit = (values: AdditionalContributionForm) => {
    if (!plan) {
      return;
    }

    mutation.mutate(
      {
        recurrenceUuid: plan.recurrence.uuid,
        ...toAdditionalContributionPayload(
          additionalContributionFormSchema.parse(values),
          plan.month,
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<AdditionalContributionForm>
      open={open}
      title={t('recurrences.additional.title')}
      initialValues={initialValuesOf(plan)}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {plan && <AdditionalContributionFields plan={plan} />}
    </FormModal>
  );
};
