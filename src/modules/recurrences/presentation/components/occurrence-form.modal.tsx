import { DatePicker, Form, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  dateInputFormat,
  formatDateOnly,
  todayDateOnly,
} from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type OccurrenceForm,
  isMovedPastRecurrenceEnd,
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
    return 'recurrences.fields.expectedDate';
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
  const endDate =
    recurrence.endDate && formatDateOnly(recurrence.endDate, i18n.language);

  const dateExtra = () => {
    if (action === 'confirm') {
      return t('recurrences.confirm.dateHint');
    }

    return endDate
      ? t('recurrences.editOccurrence.endDateLimit', { date: endDate })
      : undefined;
  };

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
        extra={dateExtra()}
        rules={[
          zodRule(shape.date),
          {
            validator: (_rule, value: unknown) =>
              action === 'edit' &&
              target &&
              dayjs.isDayjs(value) &&
              isMovedPastRecurrenceEnd(value, target.occurrence, recurrence)
                ? Promise.reject(
                    new Error(
                      t('recurrences.validation.occurrenceAfterEnd', {
                        date: endDate,
                      }),
                    ),
                  )
                : Promise.resolve(),
          },
        ]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </FormModal>
  );
};
