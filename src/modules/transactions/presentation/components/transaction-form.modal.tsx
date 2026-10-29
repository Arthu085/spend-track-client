import { Alert } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import {
  toCreateTransactionPayload,
  toUpdateTransactionPayload,
  type TransactionForm,
  transactionFormSchema,
} from '../../domain/transaction-form.schemas';
import type { Transaction } from '../../domain/transaction.schema';
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '../../infra/transactions.queries';
import { TransactionFormFields } from './transaction-form-fields';

interface TransactionFormModalProps {
  open: boolean;
  transaction?: Transaction;
  onClose: () => void;
}

const titleKeys = {
  create: 'transactions.create.title',
  PLANNED: 'transactions.edit.title',
  COMPLETED: 'transactions.edit.title',
  CANCELED: 'transactions.view.title',
} as const;

const lockedHintKeys = {
  COMPLETED: 'transactions.hints.completedLocked',
  CANCELED: 'transactions.hints.canceledLocked',
} as const;

const initialValuesOf = (
  transaction?: Transaction,
): Partial<TransactionForm> =>
  transaction
    ? {
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        date: dayjs(transaction.date),
        completedOn: transaction.completedOn
          ? dayjs(transaction.completedOn)
          : undefined,
        accountUuid: transaction.account.uuid,
        destinationAccountUuid: transaction.destinationAccount?.uuid,
        categoryUuid: transaction.category?.uuid,
        notes: transaction.notes ?? undefined,
      }
    : { type: 'EXPENSE', state: 'PLANNED', date: dayjs(todayDateOnly()) };

const editFormSchema = transactionFormSchema.omit({ state: true });

export const TransactionFormModal = ({
  open,
  transaction,
  onClose,
}: TransactionFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const lockedHintKey =
    transaction && transaction.state !== 'PLANNED'
      ? lockedHintKeys[transaction.state]
      : undefined;

  const submit = (values: TransactionForm) => {
    const options = { onSuccess: onClose, onError: showError };

    if (transaction) {
      const payload = toUpdateTransactionPayload(
        editFormSchema.parse(values),
        transaction,
      );

      updateMutation.mutate({ uuid: transaction.uuid, ...payload }, options);
    } else {
      createMutation.mutate(
        toCreateTransactionPayload(transactionFormSchema.parse(values)),
        options,
      );
    }
  };

  return (
    <FormModal<TransactionForm>
      open={open}
      title={t(titleKeys[transaction?.state ?? 'create'])}
      initialValues={initialValuesOf(transaction)}
      submitting={createMutation.isPending || updateMutation.isPending}
      readOnly={transaction?.state === 'CANCELED'}
      onSubmit={submit}
      onCancel={onClose}
    >
      {lockedHintKey && (
        <Alert
          type="info"
          showIcon
          title={t(lockedHintKey)}
          style={{ marginBottom: 16 }}
        />
      )}
      <TransactionFormFields transaction={transaction} />
    </FormModal>
  );
};
