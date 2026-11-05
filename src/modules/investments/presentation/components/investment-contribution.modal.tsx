import { Form, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import {
  type InvestmentContributionForm,
  investmentContributionFormSchema,
  toInvestmentMovementPayload,
} from '../../domain/investment-form.schemas';
import type { Investment } from '../../domain/investment.schema';
import {
  useCreateInvestmentMovement,
  useInvestments,
} from '../../infra/investments.queries';
import { InvestmentMovementFields } from './investment-movement-fields';

export type ContributionInvestment = Pick<Investment, 'uuid' | 'name'>;

interface InvestmentSelectProps {
  preselected?: ContributionInvestment;
}

const InvestmentSelect = ({ preselected }: InvestmentSelectProps) => {
  const { t } = useTranslation();
  const { data: investments } = useInvestments({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });

  return (
    <Form.Item
      name="investmentUuid"
      label={t('investments.fields.investment')}
      rules={[zodRule(investmentContributionFormSchema.shape.investmentUuid)]}
    >
      <Select
        showSearch={{ optionFilterProp: 'label' }}
        options={toReferenceOptions(investments?.data ?? [], preselected)}
      />
    </Form.Item>
  );
};

interface InvestmentContributionModalProps {
  open: boolean;
  investment?: ContributionInvestment;
  onClose: () => void;
}

export const InvestmentContributionModal = ({
  open,
  investment,
  onClose,
}: InvestmentContributionModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateInvestmentMovement();

  const submit = (values: InvestmentContributionForm) => {
    const form = investmentContributionFormSchema.parse(values);

    mutation.mutate(
      {
        investmentUuid: form.investmentUuid,
        ...toInvestmentMovementPayload('CONTRIBUTION', form),
      },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<InvestmentContributionForm>
      open={open}
      title={t('investments.contribution.title')}
      initialValues={{
        investmentUuid: investment?.uuid,
        date: dayjs(todayDateOnly()),
        state: 'COMPLETED',
      }}
      submitting={mutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        {t('investments.contribution.hint')}
      </Typography.Paragraph>
      <InvestmentSelect preselected={investment} />
      <InvestmentMovementFields type="CONTRIBUTION" />
    </FormModal>
  );
};
