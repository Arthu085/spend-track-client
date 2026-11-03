import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type InvestmentForm,
  investmentFormSchema,
  toInvestmentPayload,
} from '../../domain/investment-form.schemas';
import {
  type Investment,
  investmentTypeSchema,
} from '../../domain/investment.schema';
import {
  useCreateInvestment,
  useUpdateInvestment,
} from '../../infra/investments.queries';

interface InvestmentFormModalProps {
  open: boolean;
  investment?: Investment;
  onClose: () => void;
}

const initialValuesOf = (investment?: Investment): Partial<InvestmentForm> =>
  investment
    ? {
        name: investment.name,
        type: investment.type,
        targetAmount: investment.targetAmount,
      }
    : { type: 'RESERVE' };

export const InvestmentFormModal = ({
  open,
  investment,
  onClose,
}: InvestmentFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateInvestment();
  const updateMutation = useUpdateInvestment();
  const { shape } = investmentFormSchema;

  const submit = (values: InvestmentForm) => {
    const payload = toInvestmentPayload(investmentFormSchema.parse(values));
    const options = { onSuccess: onClose, onError: showError };

    if (investment) {
      updateMutation.mutate({ uuid: investment.uuid, ...payload }, options);
    } else {
      createMutation.mutate(payload, options);
    }
  };

  return (
    <FormModal<InvestmentForm>
      open={open}
      title={t(
        investment ? 'investments.edit.title' : 'investments.create.title',
      )}
      initialValues={initialValuesOf(investment)}
      submitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Form.Item
        name="name"
        label={t('investments.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="type"
        label={t('investments.fields.type')}
        rules={[zodRule(shape.type)]}
      >
        <Select
          options={investmentTypeSchema.options.map((type) => ({
            value: type,
            label: t(`investments.types.${type}`),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="targetAmount"
        label={t('investments.fields.targetAmount')}
        extra={t('investments.hints.targetAmount')}
        rules={[zodRule(shape.targetAmount)]}
      >
        <MoneyInput />
      </Form.Item>
    </FormModal>
  );
};
