import { DatePicker, Form, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import { MoneyText } from '@/shared/money/money-text';
import {
  type CreditCardPaymentForm,
  creditCardPaymentFormSchema,
  toCreditCardPaymentPayload,
} from '../../domain/credit-card-form.schemas';
import type { CreditCardInvoice } from '../../domain/credit-card.schema';
import { usePayCreditCardInvoice } from '../../infra/credit-cards.queries';

interface PayInvoiceModalProps {
  open: boolean;
  invoice?: Pick<CreditCardInvoice, 'uuid' | 'outstanding'>;
  onClose: () => void;
}

export const PayInvoiceModal = ({
  open,
  invoice,
  onClose,
}: PayInvoiceModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = usePayCreditCardInvoice();
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = creditCardPaymentFormSchema;
  const defaultAccountUuid = accounts?.data.find(
    ({ isDefault }) => isDefault,
  )?.uuid;

  const submit = (values: CreditCardPaymentForm) => {
    if (!invoice) {
      return;
    }

    mutation.mutate(
      {
        invoiceUuid: invoice.uuid,
        ...toCreditCardPaymentPayload(
          creditCardPaymentFormSchema.parse(values),
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<CreditCardPaymentForm>
      open={open}
      title={t('creditCards.pay.title')}
      initialValues={{
        accountUuid: defaultAccountUuid,
        amount: invoice?.outstanding,
        paidOn: dayjs(todayDateOnly()),
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {invoice && (
        <Typography.Paragraph>
          {t('creditCards.pay.outstanding')}{' '}
          <MoneyText amount={invoice.outstanding} strong />
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t('creditCards.pay.hint')}
      </Typography.Paragraph>
      <Form.Item
        name="accountUuid"
        label={t('creditCards.fields.account')}
        rules={[zodRule(shape.accountUuid)]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(accounts?.data ?? [])}
        />
      </Form.Item>
      <Form.Item
        name="amount"
        label={t('creditCards.fields.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="paidOn"
        label={t('creditCards.fields.paidOn')}
        rules={[zodRule(shape.paidOn)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </FormModal>
  );
};
