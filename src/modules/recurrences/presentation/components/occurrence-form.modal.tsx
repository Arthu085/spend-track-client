import { DatePicker, Form, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type OccurrenceForm,
  occurrenceFormSchema,
  toOccurrencePayload,
} from '../../domain/recurrence-form.schemas';
import {
  isCardRecurrence,
  type Recurrence,
  type RecurrenceOccurrence,
} from '../../domain/recurrence.schema';
import {
  useConfirmRecurrenceOccurrence,
  useUpdateRecurrenceOccurrence,
} from '../../infra/recurrences.queries';

export type OccurrenceAction = 'confirm' | 'edit';

export interface OccurrenceTarget {
  action: OccurrenceAction;
  occurrence: RecurrenceOccurrence;
}

interface OccurrenceFormModalProps {
  open: boolean;
  recurrence: Recurrence;
  target?: OccurrenceTarget;
  onClose: () => void;
}

const dateLabelKey = (action: OccurrenceAction, chargesCard: boolean) => {
  if (action === 'edit') {
    return 'recurrences.fields.date';
  }

  return chargesCard
    ? 'creditCards.fields.purchaseDate'
    : 'transactions.fields.completedOn';
};

const descriptionKey = (action: OccurrenceAction, chargesCard: boolean) => {
  if (action === 'edit') {
    return 'recurrences.editOccurrence.description';
  }

  return chargesCard
    ? 'recurrences.confirm.cardDescription'
    : 'recurrences.confirm.accountDescription';
};

const initialDateOf = (
  { action, occurrence }: OccurrenceTarget,
  chargesCard: boolean,
) =>
  dayjs(
    action === 'confirm' && !chargesCard ? todayDateOnly() : occurrence.date,
  );

export const OccurrenceFormModal = ({
  open,
  recurrence,
  target,
  onClose,
}: OccurrenceFormModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const confirmMutation = useConfirmRecurrenceOccurrence();
  const updateMutation = useUpdateRecurrenceOccurrence();
  const chargesCard = isCardRecurrence(recurrence);
  const action = target?.action ?? 'confirm';
  const { shape } = occurrenceFormSchema;

  const submit = (values: OccurrenceForm) => {
    if (!target) {
      return;
    }

    const variables = {
      recurrenceUuid: recurrence.uuid,
      occurrenceUuid: target.occurrence.uuid,
      ...toOccurrencePayload(occurrenceFormSchema.parse(values)),
    };
    const options = { onSuccess: onClose, onError: showError };

    if (target.action === 'confirm') {
      confirmMutation.mutate(variables, options);
    } else {
      updateMutation.mutate(variables, options);
    }
  };

  return (
    <FormModal<OccurrenceForm>
      open={open}
      title={t(
        action === 'confirm'
          ? 'recurrences.confirm.title'
          : 'recurrences.editOccurrence.title',
      )}
      initialValues={
        target && {
          amount: target.occurrence.amount,
          date: initialDateOf(target, chargesCard),
        }
      }
      submitting={confirmMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Typography.Paragraph>
        {t(descriptionKey(action, chargesCard), {
          description: recurrence.description,
        })}
      </Typography.Paragraph>
      <Form.Item
        name="amount"
        label={t('recurrences.fields.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="date"
        label={t(dateLabelKey(action, chargesCard))}
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
