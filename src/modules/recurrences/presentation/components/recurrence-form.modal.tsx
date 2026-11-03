import { Alert, Col, DatePicker, Form, Input, Radio, Row, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { useCreditCards } from '@/modules/credit-cards/infra/credit-cards.queries';
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
  type RecurrenceForm,
  recurrenceFormSchema,
  type RecurrenceTarget,
  recurrenceTargetSchema,
  toCreateRecurrencePayload,
} from '../../domain/recurrence-form.schemas';
import {
  recurrenceFrequencySchema,
  type RecurrenceType,
  recurrenceTypeSchema,
} from '../../domain/recurrence.schema';
import { useCreateRecurrence } from '../../infra/recurrences.queries';

interface RecurrenceFormModalProps {
  open: boolean;
  onClose: () => void;
}

const HALF_WIDTH = { xs: 24, sm: 12 } as const;
const MODAL_WIDTH = 720;

const useDefaultReference = (
  field: 'accountUuid' | 'creditCardUuid',
  defaultUuid: string | undefined,
) => {
  const form = Form.useFormInstance<RecurrenceForm>();

  useEffect(() => {
    if (
      defaultUuid &&
      !form.getFieldValue(field) &&
      !form.isFieldTouched(field)
    ) {
      form.setFieldValue(field, defaultUuid);
    }
  }, [form, field, defaultUuid]);
};

const RecurrenceFields = () => {
  const { t, i18n } = useTranslation();
  const form = Form.useFormInstance<RecurrenceForm>();
  const type = Form.useWatch<RecurrenceType | undefined>('type') ?? 'EXPENSE';
  const target =
    Form.useWatch<RecurrenceTarget | undefined>('target') ?? 'ACCOUNT';
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: cards } = useCreditCards({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: categories } = useTransactionCategories({
    kind: type,
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = recurrenceFormSchema;
  const dateFormat = dateInputFormat(i18n.language);
  const chargesCard = type === 'EXPENSE' && target === 'CREDIT_CARD';

  useDefaultReference(
    'accountUuid',
    accounts?.data.find(({ isDefault }) => isDefault)?.uuid,
  );
  useDefaultReference(
    'creditCardUuid',
    cards?.data.find(({ isDefault }) => isDefault)?.uuid,
  );

  const changeType = () => {
    form.setFieldsValue({ categoryUuid: undefined, target: 'ACCOUNT' });
  };

  return (
    <>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="type"
            label={t('recurrences.fields.type')}
            rules={[zodRule(shape.type)]}
          >
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              onChange={changeType}
              options={recurrenceTypeSchema.options.map((option) => ({
                value: option,
                label: t(`transactions.types.${option}`),
              }))}
            />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="target"
            label={t('recurrences.fields.target')}
            extra={
              type === 'INCOME' ? t('recurrences.hints.cardOnlyExpense') : null
            }
            rules={[zodRule(shape.target)]}
          >
            <Radio.Group
              options={recurrenceTargetSchema.options.map((option) => ({
                value: option,
                label: t(`recurrences.targets.${option}`),
                disabled: option === 'CREDIT_CARD' && type === 'INCOME',
              }))}
            />
          </Form.Item>
        </Col>
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
            name="frequency"
            label={t('recurrences.fields.frequency')}
            rules={[zodRule(shape.frequency)]}
          >
            <Select
              options={recurrenceFrequencySchema.options.map((option) => ({
                value: option,
                label: t(`recurrences.frequencies.${option}`),
              }))}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="startDate"
            label={t('recurrences.fields.startDate')}
            extra={t('recurrences.hints.startDate')}
            rules={[zodRule(shape.startDate)]}
          >
            <DatePicker format={dateFormat} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="endDate"
            label={t('recurrences.fields.endDate')}
            extra={t('recurrences.hints.endDate')}
            dependencies={['startDate']}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_rule, value: unknown) => {
                  const startDate: unknown = getFieldValue('startDate');

                  return dayjs.isDayjs(value) &&
                    dayjs.isDayjs(startDate) &&
                    value.isBefore(startDate, 'day')
                    ? Promise.reject(
                        new Error(t('recurrences.validation.endBeforeStart')),
                      )
                    : Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker format={dateFormat} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          {chargesCard ? (
            <Form.Item
              name="creditCardUuid"
              label={t('recurrences.fields.creditCard')}
              extra={t('recurrences.hints.cardCharges')}
              rules={[zodRule(requiredUuidSchema)]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                options={toReferenceOptions(cards?.data ?? [])}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="accountUuid"
              label={t(`transactions.accountLabels.${type}`)}
              rules={[zodRule(requiredUuidSchema)]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                options={toReferenceOptions(accounts?.data ?? [])}
              />
            </Form.Item>
          )}
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="categoryUuid"
            label={t('recurrences.fields.category')}
            rules={[zodRule(shape.categoryUuid)]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={toReferenceOptions(categories?.data ?? [])}
            />
          </Form.Item>
        </Col>
      </Row>
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

export const RecurrenceFormModal = ({
  open,
  onClose,
}: RecurrenceFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateRecurrence();

  const submit = (values: RecurrenceForm) => {
    mutation.mutate(
      toCreateRecurrencePayload(recurrenceFormSchema.parse(values)),
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<RecurrenceForm>
      open={open}
      title={t('recurrences.create.title')}
      initialValues={{
        type: 'EXPENSE',
        target: 'ACCOUNT',
        frequency: 'MONTHLY',
        startDate: dayjs(todayDateOnly()),
      }}
      submitting={mutation.isPending}
      width={MODAL_WIDTH}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Alert
        type="info"
        showIcon
        title={t('recurrences.hints.planned')}
        style={{ marginBottom: 16 }}
      />
      <RecurrenceFields />
    </FormModal>
  );
};
