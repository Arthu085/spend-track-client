import { DatePicker, Form, Input, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import { MoneyText } from '@/shared/money/money-text';
import {
  type CreditCardRefundForm,
  creditCardRefundFormSchema,
  toCreditCardRefundPayload,
} from '../../domain/credit-card-form.schemas';
import type { CreditCardPurchase } from '../../domain/credit-card.schema';
import { useCreateCreditCardRefund } from '../../infra/credit-cards.queries';

interface CreditCardRefundModalProps {
  open: boolean;
  purchase?: CreditCardPurchase;
  onClose: () => void;
}

export const CreditCardRefundModal = ({
  open,
  purchase,
  onClose,
}: CreditCardRefundModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateCreditCardRefund();
  const { shape } = creditCardRefundFormSchema;

  const submit = (values: CreditCardRefundForm) => {
    if (!purchase) {
      return;
    }

    mutation.mutate(
      {
        purchaseUuid: purchase.uuid,
        ...toCreditCardRefundPayload(creditCardRefundFormSchema.parse(values)),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<CreditCardRefundForm>
      open={open}
      title={t('creditCards.refund.title')}
      initialValues={{
        amount: purchase?.refundableAmount,
        date: dayjs(todayDateOnly()),
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {purchase && (
        <Typography.Paragraph>
          {t('creditCards.refund.description', {
            description: purchase.description,
          })}{' '}
          <MoneyText amount={purchase.refundableAmount} strong />
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t('creditCards.refund.hint')}
      </Typography.Paragraph>
      <Form.Item
        name="amount"
        label={t('creditCards.fields.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="date"
        label={t('creditCards.fields.refundDate')}
        rules={[zodRule(shape.date)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item
        name="notes"
        label={t('creditCards.fields.notes')}
        rules={[zodRule(shape.notes)]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </FormModal>
  );
};
