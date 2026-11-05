import { Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
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
import { InvestmentMovementFields } from './investment-movement-fields';

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
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const mutation = useCreateInvestmentMovement();
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
      <InvestmentMovementFields type={type} />
    </FormModal>
  );
};
