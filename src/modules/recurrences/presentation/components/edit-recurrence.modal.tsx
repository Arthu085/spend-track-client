import { Alert, Col, DatePicker, Form, Input, Radio, Row, Select } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { requiredUuidSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type EditRecurrenceForm,
  editRecurrenceFormSchema,
  requiredDateSchema,
  type RecurrenceUpdateScope,
  recurrenceUpdateScopeSchema,
  toUpdateRecurrencePayload,
} from '../../domain/recurrence-form.schemas';
import type { Recurrence } from '../../domain/recurrence.schema';
import { useUpdateRecurrence } from '../../infra/recurrences.queries';

interface EditRecurrenceModalProps {
  open: boolean;
  recurrence?: Recurrence;
  onClose: () => void;
}

const HALF_WIDTH = { xs: 24, sm: 12 } as const;
const MODAL_WIDTH = 720;

const initialValuesOf = (
  recurrence?: Recurrence,
): Partial<EditRecurrenceForm> => ({
  scope: 'FUTURE',
  from: dayjs(todayDateOnly()),
  description: recurrence?.description,
  amount: recurrence?.amount,
  accountUuid: recurrence?.account?.uuid,
  categoryUuid: recurrence?.category.uuid,
  notes: recurrence?.notes ?? undefined,
});

const EditRecurrenceFields = ({ recurrence }: { recurrence: Recurrence }) => {
  const { t, i18n } = useTranslation();
  const scope = Form.useWatch<RecurrenceUpdateScope | undefined>('scope');
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: categories } = useTransactionCategories({
    kind: recurrence.type,
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = editRecurrenceFormSchema;

  return (
    <>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="scope"
            label={t('recurrences.fields.scope')}
            rules={[zodRule(shape.scope)]}
          >
            <Radio.Group
              options={recurrenceUpdateScopeSchema.options.map((option) => ({
                value: option,
                label: t(`recurrences.scopes.${option}`),
              }))}
            />
          </Form.Item>
        </Col>
        {scope !== 'ALL' && (
          <Col {...HALF_WIDTH}>
            <Form.Item
              name="from"
              label={t('recurrences.fields.from')}
              rules={[zodRule(requiredDateSchema)]}
            >
              <DatePicker
                format={dateInputFormat(i18n.language)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
      <Form.Item
        name="description"
        label={t('recurrences.fields.description')}
        rules={[zodRule(shape.description)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="amount"
            label={t('recurrences.fields.amount')}
            rules={[zodRule(shape.amount)]}
          >
            <MoneyInput />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="categoryUuid"
            label={t('recurrences.fields.category')}
            rules={[zodRule(shape.categoryUuid)]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={toReferenceOptions(
                categories?.data ?? [],
                recurrence.category,
              )}
            />
          </Form.Item>
        </Col>
      </Row>
      {recurrence.account && (
        <Form.Item
          name="accountUuid"
          label={t(`transactions.accountLabels.${recurrence.type}`)}
          rules={[zodRule(requiredUuidSchema)]}
        >
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            options={toReferenceOptions(
              accounts?.data ?? [],
              recurrence.account,
            )}
          />
        </Form.Item>
      )}
      <Form.Item
        name="notes"
        label={t('recurrences.fields.notes')}
        rules={[zodRule(shape.notes)]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
};

export const EditRecurrenceModal = ({
  open,
  recurrence,
  onClose,
}: EditRecurrenceModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useUpdateRecurrence();

  const submit = (values: EditRecurrenceForm) => {
    if (!recurrence) {
      return;
    }

    mutation.mutate(
      {
        uuid: recurrence.uuid,
        ...toUpdateRecurrencePayload(
          editRecurrenceFormSchema.parse(values),
          recurrence,
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<EditRecurrenceForm>
      open={open}
      title={t('recurrences.edit.title')}
      initialValues={initialValuesOf(recurrence)}
      submitting={mutation.isPending}
      width={MODAL_WIDTH}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Alert
        type="info"
        showIcon
        title={t('recurrences.hints.editLocked')}
        style={{ marginBottom: 16 }}
      />
      {recurrence && <EditRecurrenceFields recurrence={recurrence} />}
    </FormModal>
  );
};
