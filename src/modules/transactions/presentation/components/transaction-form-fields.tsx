import { Col, DatePicker, Form, Input, Radio, Row, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { dateInputFormat } from '@/shared/date/date-only';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import {
  creatableTransactionStateSchema,
  requiredUuidSchema,
  type TransactionForm,
  transactionFormSchema,
} from '../../domain/transaction-form.schemas';
import {
  type Transaction,
  type TransactionType,
  transactionTypeSchema,
} from '../../domain/transaction.schema';
import { toReferenceOptions } from './reference-options';

const HALF_WIDTH = { xs: 24, sm: 12 } as const;

interface TransactionFormFieldsProps {
  transaction?: Transaction;
}

export const TransactionFormFields = ({
  transaction,
}: TransactionFormFieldsProps) => {
  const { t, i18n } = useTranslation();
  const form = Form.useFormInstance<TransactionForm>();
  const type =
    Form.useWatch<TransactionType | undefined>('type') ??
    transaction?.type ??
    'EXPENSE';
  const state = Form.useWatch<TransactionForm['state'] | undefined>('state');
  const accountUuid = Form.useWatch<string | undefined>('accountUuid');
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: categories } = useTransactionCategories({
    kind: type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = transactionFormSchema;
  const isCreating = transaction === undefined;
  const isPlanned = isCreating || transaction.state === 'PLANNED';
  const defaultAccountUuid = accounts?.data.find(
    ({ isDefault }) => isDefault,
  )?.uuid;
  const activeAccounts = accounts?.data ?? [];
  const dateFormat = dateInputFormat(i18n.language);

  useEffect(() => {
    if (
      isCreating &&
      defaultAccountUuid &&
      !form.getFieldValue('accountUuid') &&
      !form.isFieldTouched('accountUuid')
    ) {
      form.setFieldValue('accountUuid', defaultAccountUuid);
    }
  }, [form, isCreating, defaultAccountUuid]);

  const changeType = () => {
    form.setFieldsValue({
      categoryUuid: undefined,
      destinationAccountUuid: undefined,
    });
  };

  return (
    <>
      <Form.Item
        name="type"
        label={t('transactions.fields.type')}
        rules={[zodRule(shape.type)]}
      >
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          disabled={!isCreating}
          onChange={changeType}
          options={transactionTypeSchema.options.map((option) => ({
            value: option,
            label: t(`transactions.types.${option}`),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="description"
        label={t('transactions.fields.description')}
        rules={[zodRule(shape.description)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="amount"
            label={t('transactions.fields.amount')}
            rules={[zodRule(shape.amount)]}
          >
            <MoneyInput disabled={!isPlanned} />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="date"
            label={t('transactions.fields.date')}
            extra={t('transactions.hints.date')}
            rules={[zodRule(shape.date)]}
          >
            <DatePicker
              format={dateFormat}
              disabled={!isPlanned}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="accountUuid"
            label={t(`transactions.accountLabels.${type}`)}
            rules={[zodRule(requiredUuidSchema)]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              disabled={!isPlanned}
              options={toReferenceOptions(activeAccounts, transaction?.account)}
            />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          {type === 'TRANSFER' ? (
            <Form.Item
              name="destinationAccountUuid"
              label={t('transactions.fields.destinationAccount')}
              dependencies={['accountUuid']}
              rules={[
                zodRule(requiredUuidSchema),
                ({ getFieldValue }) => ({
                  validator: (_rule, value: unknown) =>
                    value && value === getFieldValue('accountUuid')
                      ? Promise.reject(
                          new Error(t('transactions.validation.sameAccount')),
                        )
                      : Promise.resolve(),
                }),
              ]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                disabled={!isPlanned}
                options={toReferenceOptions(
                  activeAccounts.filter(({ uuid }) => uuid !== accountUuid),
                  transaction?.destinationAccount,
                )}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="categoryUuid"
              label={t('transactions.fields.category')}
              rules={[zodRule(requiredUuidSchema)]}
            >
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                options={toReferenceOptions(
                  categories?.data ?? [],
                  transaction?.category,
                )}
              />
            </Form.Item>
          )}
        </Col>
      </Row>
      <Row gutter={16}>
        {isCreating && (
          <Col {...HALF_WIDTH}>
            <Form.Item
              name="state"
              label={t('transactions.fields.state')}
              rules={[zodRule(shape.state)]}
            >
              <Radio.Group
                options={creatableTransactionStateSchema.options.map(
                  (option) => ({
                    value: option,
                    label: t(`transactions.states.${option}`),
                  }),
                )}
              />
            </Form.Item>
          </Col>
        )}
        {(isCreating ? state === 'COMPLETED' : transaction.completedOn) && (
          <Col {...HALF_WIDTH}>
            <Form.Item
              name="completedOn"
              label={t('transactions.fields.completedOn')}
              extra={
                isCreating ? t('transactions.hints.completedOn') : undefined
              }
            >
              <DatePicker
                format={dateFormat}
                disabled={!isCreating}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
      <Form.Item
        name="notes"
        label={t('transactions.fields.notes')}
        rules={[zodRule(shape.notes)]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
};
