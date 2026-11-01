import { Checkbox, Col, Form, Input, InputNumber, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type CreditCardForm,
  creditCardFormSchema,
  toCreditCardPayload,
} from '../../domain/credit-card-form.schemas';
import type { CreditCard } from '../../domain/credit-card.schema';
import {
  useCreateCreditCard,
  useUpdateCreditCard,
} from '../../infra/credit-cards.queries';

interface CreditCardFormModalProps {
  open: boolean;
  card?: CreditCard;
  onClose: () => void;
}

const HALF_WIDTH = { xs: 24, sm: 12 } as const;

const initialValuesOf = (card?: CreditCard): Partial<CreditCardForm> =>
  card
    ? {
        name: card.name,
        creditLimit: card.creditLimit,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        isDefault: card.isDefault,
      }
    : { creditLimit: '0', isDefault: false };

export const CreditCardFormModal = ({
  open,
  card,
  onClose,
}: CreditCardFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateCreditCard();
  const updateMutation = useUpdateCreditCard();
  const { shape } = creditCardFormSchema;

  const submit = (values: CreditCardForm) => {
    const payload = toCreditCardPayload(creditCardFormSchema.parse(values));
    const options = { onSuccess: onClose, onError: showError };

    if (card) {
      updateMutation.mutate({ uuid: card.uuid, ...payload }, options);
    } else {
      createMutation.mutate(payload, options);
    }
  };

  return (
    <FormModal<CreditCardForm>
      open={open}
      title={t(card ? 'creditCards.edit.title' : 'creditCards.create.title')}
      initialValues={initialValuesOf(card)}
      submitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Form.Item
        name="name"
        label={t('creditCards.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="creditLimit"
        label={t('creditCards.fields.creditLimit')}
        rules={[zodRule(shape.creditLimit)]}
      >
        <MoneyInput min="0" />
      </Form.Item>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="closingDay"
            label={t('creditCards.fields.closingDay')}
            rules={[zodRule(shape.closingDay)]}
          >
            <InputNumber
              min={1}
              max={31}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="dueDay"
            label={t('creditCards.fields.dueDay')}
            rules={[zodRule(shape.dueDay)]}
          >
            <InputNumber
              min={1}
              max={31}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Typography.Paragraph type="secondary">
        {t('creditCards.hints.billingDays')}
      </Typography.Paragraph>
      <Form.Item name="isDefault" valuePropName="checked">
        <Checkbox>{t('creditCards.fields.isDefault')}</Checkbox>
      </Form.Item>
    </FormModal>
  );
};
