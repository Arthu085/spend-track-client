import { DatePicker, Form, Typography } from 'antd';
import dayjs from 'dayjs';
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
  type CompleteTransactionForm,
  completeTransactionFormSchema,
} from '../../domain/transaction-form.schemas';
import type { Transaction } from '../../domain/transaction.schema';
import { useUpdateTransactionState } from '../../infra/transactions.queries';

export type CompletableTransaction = Pick<Transaction, 'uuid' | 'description'>;

interface CompleteTransactionModalProps {
  transaction: CompletableTransaction | null;
  onClose: () => void;
}

export const CompleteTransactionModal = ({
  transaction,
  onClose,
}: CompleteTransactionModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useUpdateTransactionState();

  const submit = (values: CompleteTransactionForm) => {
    if (!transaction) {
      return;
    }

    const { completedOn } = completeTransactionFormSchema.parse(values);

    mutation.mutate(
      {
        uuid: transaction.uuid,
        state: 'COMPLETED',
        completedOn: completedOn.format(DATE_ONLY_FORMAT),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<CompleteTransactionForm>
      open={transaction !== null}
      title={t('transactions.complete.title')}
      initialValues={{ completedOn: dayjs(todayDateOnly()) }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {t('transactions.complete.description', {
          description: transaction?.description,
        })}
      </Typography.Paragraph>
      <Form.Item
        name="completedOn"
        label={t('transactions.fields.completedOn')}
        rules={[zodRule(completeTransactionFormSchema.shape.completedOn)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </FormModal>
  );
};
