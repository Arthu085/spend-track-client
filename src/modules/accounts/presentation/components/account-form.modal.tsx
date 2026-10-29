import { Checkbox, DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { dateInputFormat } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type AccountForm,
  accountFormSchema,
  toAccountPayload,
} from '../../domain/account-form.schemas';
import { type Account, accountTypeSchema } from '../../domain/account.schema';
import {
  useCreateAccount,
  useUpdateAccount,
} from '../../infra/accounts.queries';

interface AccountFormModalProps {
  open: boolean;
  account?: Account;
  onClose: () => void;
}

const initialValuesOf = (account?: Account): Partial<AccountForm> =>
  account
    ? {
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        openingBalanceDate: dayjs(account.openingBalanceDate),
        isDefault: account.isDefault,
      }
    : { openingBalance: '0', openingBalanceDate: dayjs(), isDefault: false };

export const AccountFormModal = ({
  open,
  account,
  onClose,
}: AccountFormModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const { shape } = accountFormSchema;

  const submit = (values: AccountForm) => {
    const payload = toAccountPayload(accountFormSchema.parse(values));
    const options = { onSuccess: onClose, onError: showError };

    if (account) {
      updateMutation.mutate({ uuid: account.uuid, ...payload }, options);
    } else {
      createMutation.mutate(payload, options);
    }
  };

  return (
    <FormModal<AccountForm>
      open={open}
      title={t(account ? 'accounts.edit.title' : 'accounts.create.title')}
      initialValues={initialValuesOf(account)}
      submitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Form.Item
        name="name"
        label={t('accounts.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="type"
        label={t('accounts.fields.type')}
        rules={[zodRule(shape.type)]}
      >
        <Select
          options={accountTypeSchema.options.map((type) => ({
            value: type,
            label: t(`accounts.types.${type}`),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="openingBalance"
        label={t('accounts.fields.openingBalance')}
        extra={t('accounts.hints.openingBalance')}
        rules={[zodRule(shape.openingBalance)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="openingBalanceDate"
        label={t('accounts.fields.openingBalanceDate')}
        rules={[zodRule(shape.openingBalanceDate)]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item name="isDefault" valuePropName="checked">
        <Checkbox>{t('accounts.fields.isDefault')}</Checkbox>
      </Form.Item>
    </FormModal>
  );
};
