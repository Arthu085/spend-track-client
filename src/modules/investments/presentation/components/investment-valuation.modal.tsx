import { DatePicker, Form, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import { MoneyText } from '@/shared/money/money-text';
import {
  type InvestmentValuationForm,
  investmentValuationFormSchema,
  toInvestmentValuationPayload,
} from '../../domain/investment-form.schemas';
import type { Investment } from '../../domain/investment.schema';
import { useCreateInvestmentValuation } from '../../infra/investments.queries';

interface InvestmentValuationModalProps {
  open: boolean;
  investment?: Pick<Investment, 'uuid' | 'name' | 'currentValue'>;
  onClose: () => void;
}

export const InvestmentValuationModal = ({
  open,
  investment,
  onClose,
}: InvestmentValuationModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateInvestmentValuation();
  const { shape } = investmentValuationFormSchema;

  const submit = (values: InvestmentValuationForm) => {
    if (!investment) {
      return;
    }

    mutation.mutate(
      {
        investmentUuid: investment.uuid,
        ...toInvestmentValuationPayload(
          investmentValuationFormSchema.parse(values),
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<InvestmentValuationForm>
      open={open}
      title={t('investments.valuation.title', { name: investment?.name })}
      initialValues={{
        value: investment?.currentValue,
        date: dayjs(todayDateOnly()),
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {investment && (
        <Typography.Paragraph>
          {t('investments.fields.currentValue')}:{' '}
          <MoneyText amount={investment.currentValue} strong />
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t('investments.valuation.hint')}
      </Typography.Paragraph>
      <Form.Item
        name="value"
        label={t('investments.fields.newValue')}
        rules={[zodRule(shape.value)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="date"
        label={t('investments.fields.date')}
        rules={[zodRule(shape.date)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </FormModal>
  );
};
