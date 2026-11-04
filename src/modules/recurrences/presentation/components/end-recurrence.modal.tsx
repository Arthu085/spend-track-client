import { DatePicker, Form, Radio, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type EndRecurrenceForm,
  endRecurrenceFormSchema,
  type RecurrenceEndMode,
  requiredDateSchema,
  toEndRecurrencePayload,
} from '../../domain/recurrence-form.schemas';
import {
  isCardRecurrence,
  type Recurrence,
} from '../../domain/recurrence.schema';
import { useEndRecurrence } from '../../infra/recurrences.queries';

interface EndRecurrenceModalProps {
  open: boolean;
  recurrence?: Recurrence;
  onClose: () => void;
}

const MONTH_INPUT_FORMAT = 'MM/YYYY';

const endModesOf = (recurrence?: Recurrence): RecurrenceEndMode[] =>
  recurrence && isCardRecurrence(recurrence)
    ? ['FROM_INVOICE_MONTH', 'ENTIRE']
    : ['FROM_DATE', 'ENTIRE'];

const EndRecurrenceFields = ({ modes }: { modes: RecurrenceEndMode[] }) => {
  const { t, i18n } = useTranslation();
  const mode = Form.useWatch<RecurrenceEndMode | undefined>('mode');

  return (
    <>
      <Form.Item
        name="mode"
        label={t('recurrences.fields.endMode')}
        rules={[zodRule(endRecurrenceFormSchema.shape.mode)]}
      >
        <Radio.Group
          options={modes.map((option) => ({
            value: option,
            label: t(`recurrences.endModes.${option}`),
          }))}
        />
      </Form.Item>
      {mode === 'FROM_DATE' && (
        <Form.Item
          name="from"
          label={t('recurrences.fields.endFrom')}
          extra={t('recurrences.hints.endFrom')}
          rules={[zodRule(requiredDateSchema)]}
        >
          <DatePicker
            format={dateInputFormat(i18n.language)}
            style={{ width: '100%' }}
          />
        </Form.Item>
      )}
      {mode === 'FROM_INVOICE_MONTH' && (
        <Form.Item
          name="fromInvoiceMonth"
          label={t('recurrences.fields.endFromInvoiceMonth')}
          extra={t('recurrences.hints.endFromInvoiceMonth')}
          rules={[zodRule(requiredDateSchema)]}
        >
          <DatePicker
            picker="month"
            format={MONTH_INPUT_FORMAT}
            style={{ width: '100%' }}
          />
        </Form.Item>
      )}
      {mode === 'ENTIRE' && (
        <Typography.Paragraph>
          {t('recurrences.hints.endEntire')}
        </Typography.Paragraph>
      )}
    </>
  );
};

export const EndRecurrenceModal = ({
  open,
  recurrence,
  onClose,
}: EndRecurrenceModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useEndRecurrence();
  const modes = endModesOf(recurrence);
  const today = dayjs(todayDateOnly());

  const submit = (values: EndRecurrenceForm) => {
    if (!recurrence) {
      return;
    }

    mutation.mutate(
      {
        uuid: recurrence.uuid,
        payload: toEndRecurrencePayload(endRecurrenceFormSchema.parse(values)),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<EndRecurrenceForm>
      open={open}
      title={t('recurrences.end.title')}
      initialValues={{
        mode: modes[0],
        from: today,
        fromInvoiceMonth: today.startOf('month'),
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {recurrence && (
        <Typography.Paragraph>
          {t('recurrences.end.description', {
            description: recurrence.description,
          })}
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t('recurrences.end.history')}
      </Typography.Paragraph>
      <EndRecurrenceFields modes={modes} />
    </FormModal>
  );
};
