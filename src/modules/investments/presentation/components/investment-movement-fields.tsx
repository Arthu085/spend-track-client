import { DatePicker, Form, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { creatableTransactionStateSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { dateInputFormat } from '@/shared/date/date-only';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type InvestmentMovementForm,
  investmentMovementFormSchema,
} from '../../domain/investment-form.schemas';
import type { TransferMovementType } from '../../domain/investment.schema';

interface InvestmentMovementFieldsProps {
  type: TransferMovementType;
}

export const InvestmentMovementFields = ({
  type,
}: InvestmentMovementFieldsProps) => {
  const { t, i18n } = useTranslation();
  const form = Form.useFormInstance<InvestmentMovementForm>();
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = investmentMovementFormSchema;
  const defaultAccountUuid = accounts?.data.find(
    ({ isDefault }) => isDefault,
  )?.uuid;

  useEffect(() => {
    if (defaultAccountUuid && !form.isFieldTouched('accountUuid')) {
      form.setFieldValue('accountUuid', defaultAccountUuid);
    }
  }, [form, defaultAccountUuid]);

  return (
    <>
      <Form.Item
        name="accountUuid"
        label={t(`investments.movement.account.${type}`)}
        rules={[zodRule(shape.accountUuid)]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          options={toReferenceOptions(accounts?.data ?? [])}
        />
      </Form.Item>
      <Form.Item
        name="amount"
        label={t('investments.fields.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="date"
        label={t('investments.fields.date')}
        rules={[zodRule(shape.date)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item
        name="state"
        label={t('investments.fields.state')}
        extra={t('investments.hints.state')}
        rules={[zodRule(shape.state)]}
      >
        <Select
          options={creatableTransactionStateSchema.options.map((state) => ({
            value: state,
            label: t(`transactions.states.${state}`),
          }))}
        />
      </Form.Item>
    </>
  );
};
