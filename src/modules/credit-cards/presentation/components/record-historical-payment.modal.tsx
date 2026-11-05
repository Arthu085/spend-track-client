import { DatePicker, Form, Select, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { Account } from '@/modules/accounts/domain/account.schema';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import {
  DATE_ONLY_FORMAT,
  dateInputFormat,
  formatDateOnly,
  todayDateOnly,
} from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import { MoneyText } from '@/shared/money/money-text';
import {
  type CreditCardPaymentForm,
  creditCardPaymentFormSchema,
  toCreditCardPaymentPayload,
} from '../../domain/credit-card-form.schemas';
import type { CreditCardInvoice } from '../../domain/credit-card.schema';
import { useRecordHistoricalSettlement } from '../../infra/credit-cards.queries';

const useOwnAccounts = (): Account[] => {
  const { data: active } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: archived } = useAccounts({
    status: 'INACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const accounts = [...(active?.data ?? []), ...(archived?.data ?? [])];

  return accounts.filter(
    ({ uuid }, index) =>
      accounts.findIndex((account) => account.uuid === uuid) === index,
  );
};

interface HistoricalPaymentFieldsProps {
  accounts: Account[];
}

const HistoricalPaymentFields = ({
  accounts,
}: HistoricalPaymentFieldsProps) => {
  const { t, i18n } = useTranslation();
  const { shape } = creditCardPaymentFormSchema;
  const selectedUuid = Form.useWatch<string | undefined>('accountUuid');
  const openingOf = (uuid: unknown) =>
    accounts.find((account) => account.uuid === uuid)?.openingBalanceDate;
  const selectedOpening = openingOf(selectedUuid);

  return (
    <>
      <Form.Item
        name="accountUuid"
        label={t('creditCards.fields.account')}
        extra={t('creditCards.historical.accountHint')}
        rules={[zodRule(shape.accountUuid)]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          options={accounts.map(({ uuid, name, status }) => ({
            value: uuid,
            label:
              status === 'ACTIVE'
                ? name
                : t('creditCards.historical.archivedAccount', { name }),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="amount"
        label={t('creditCards.fields.amount')}
        rules={[zodRule(shape.amount)]}
      >
        <MoneyInput />
      </Form.Item>
      <Form.Item
        name="paidOn"
        label={t('creditCards.fields.paidOn')}
        dependencies={['accountUuid']}
        extra={
          selectedOpening &&
          t('creditCards.historical.openingDate', {
            date: formatDateOnly(selectedOpening, i18n.language),
          })
        }
        rules={[
          zodRule(shape.paidOn),
          ({ getFieldValue }) => ({
            validator: (_rule, value: Dayjs | null | undefined) => {
              if (!value) {
                return Promise.resolve();
              }

              const date = value.format(DATE_ONLY_FORMAT);
              const opening = openingOf(getFieldValue('accountUuid'));

              if (date > todayDateOnly()) {
                return Promise.reject(
                  new Error(t('creditCards.historical.dateInFuture')),
                );
              }

              if (opening && date >= opening) {
                return Promise.reject(
                  new Error(
                    t('creditCards.historical.dateNotBeforeOpening', {
                      date: formatDateOnly(opening, i18n.language),
                    }),
                  ),
                );
              }

              return Promise.resolve();
            },
          }),
        ]}
      >
        <DatePicker
          format={dateInputFormat(i18n.language)}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </>
  );
};

interface RecordHistoricalPaymentModalProps {
  open: boolean;
  invoice?: Pick<CreditCardInvoice, 'uuid' | 'outstanding'>;
  onClose: () => void;
}

export const RecordHistoricalPaymentModal = ({
  open,
  invoice,
  onClose,
}: RecordHistoricalPaymentModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useRecordHistoricalSettlement();
  const accounts = useOwnAccounts();
  const defaultAccountUuid = accounts.find(({ isDefault }) => isDefault)?.uuid;

  const submit = (values: CreditCardPaymentForm) => {
    if (!invoice) {
      return;
    }

    mutation.mutate(
      {
        invoiceUuid: invoice.uuid,
        ...toCreditCardPaymentPayload(
          creditCardPaymentFormSchema.parse(values),
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<CreditCardPaymentForm>
      open={open}
      title={t('creditCards.historical.title')}
      initialValues={{
        accountUuid: defaultAccountUuid,
        amount: invoice?.outstanding,
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {invoice && (
        <Typography.Paragraph>
          {t('creditCards.pay.outstanding')}{' '}
          <MoneyText amount={invoice.outstanding} strong />
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t('creditCards.historical.hint')}
      </Typography.Paragraph>
      <HistoricalPaymentFields accounts={accounts} />
    </FormModal>
  );
};
