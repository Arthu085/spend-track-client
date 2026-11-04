import { DatePicker, Form, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/modules/accounts/infra/accounts.queries';
import { creatableTransactionStateSchema } from '@/modules/transactions/domain/transaction-form.schemas';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import { MoneyText } from '@/shared/money/money-text';
import {
  type InvestmentMovementForm,
  investmentMovementFormSchema,
  toInvestmentMovementPayload,
} from '../../domain/investment-form.schemas';
import type {
  Investment,
  TransferMovementType,
} from '../../domain/investment.schema';
import { useCreateInvestmentMovement } from '../../infra/investments.queries';

export interface MovementTarget {
  investment: Pick<Investment, 'uuid' | 'name' | 'currentValue'>;
  type: TransferMovementType;
}

interface InvestmentMovementModalProps {
  open: boolean;
  target?: MovementTarget;
  onClose: () => void;
}

export const InvestmentMovementModal = ({
  open,
  target,
  onClose,
}: InvestmentMovementModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateInvestmentMovement();
  const { data: accounts } = useAccounts({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = investmentMovementFormSchema;
  const defaultAccountUuid = accounts?.data.find(
    ({ isDefault }) => isDefault,
  )?.uuid;
  const type = target?.type ?? 'CONTRIBUTION';

  const submit = (values: InvestmentMovementForm) => {
    if (!target) {
      return;
    }

    mutation.mutate(
      {
        investmentUuid: target.investment.uuid,
        ...toInvestmentMovementPayload(
          type,
          investmentMovementFormSchema.parse(values),
        ),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<InvestmentMovementForm>
      open={open}
      title={t(`investments.movement.title.${type}`, {
        name: target?.investment.name,
      })}
      initialValues={{
        accountUuid: defaultAccountUuid,
        date: dayjs(todayDateOnly()),
        state: 'COMPLETED',
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      {target && (
        <Typography.Paragraph>
          {t('investments.fields.currentValue')}:{' '}
          <MoneyText amount={target.investment.currentValue} strong />
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t(`investments.movement.hint.${type}`)}
      </Typography.Paragraph>
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
    </FormModal>
  );
};
