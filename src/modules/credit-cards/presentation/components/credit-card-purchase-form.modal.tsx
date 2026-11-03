import {
  Alert,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { dateInputFormat, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import {
  type CreditCardPurchaseForm,
  creditCardPurchaseFormSchema,
  MAX_INSTALLMENTS,
  toCreateCreditCardPurchasePayload,
  toUpdateCreditCardPurchasePayload,
} from '../../domain/credit-card-form.schemas';
import type { CreditCardPurchase } from '../../domain/credit-card.schema';
import {
  useCreateCreditCardPurchase,
  useCreditCards,
  useUpdateCreditCardPurchase,
} from '../../infra/credit-cards.queries';

interface CreditCardPurchaseFormModalProps {
  open: boolean;
  purchase?: CreditCardPurchase;
  onClose: () => void;
}

const HALF_WIDTH = { xs: 24, sm: 12 } as const;
const MODAL_WIDTH = 720;

const editFormSchema = creditCardPurchaseFormSchema.pick({
  description: true,
  categoryUuid: true,
  notes: true,
});

const initialValuesOf = (
  purchase?: CreditCardPurchase,
): Partial<CreditCardPurchaseForm> =>
  purchase
    ? {
        cardUuid: purchase.card.uuid,
        categoryUuid: purchase.category.uuid,
        description: purchase.description,
        amount: purchase.amount,
        purchaseDate: dayjs(purchase.purchaseDate),
        installmentCount: purchase.installmentCount,
        notes: purchase.notes ?? undefined,
      }
    : { purchaseDate: dayjs(todayDateOnly()), installmentCount: 1 };

const PurchaseFields = ({ purchase }: { purchase?: CreditCardPurchase }) => {
  const { t, i18n } = useTranslation();
  const form = Form.useFormInstance<CreditCardPurchaseForm>();
  const { data: cards } = useCreditCards({
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { data: categories } = useTransactionCategories({
    kind: 'EXPENSE',
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = creditCardPurchaseFormSchema;
  const isCreating = purchase === undefined;
  const defaultCardUuid = cards?.data.find(({ isDefault }) => isDefault)?.uuid;

  useEffect(() => {
    if (
      isCreating &&
      defaultCardUuid &&
      !form.getFieldValue('cardUuid') &&
      !form.isFieldTouched('cardUuid')
    ) {
      form.setFieldValue('cardUuid', defaultCardUuid);
    }
  }, [form, isCreating, defaultCardUuid]);

  return (
    <>
      <Form.Item
        name="cardUuid"
        label={t('creditCards.fields.card')}
        rules={[zodRule(shape.cardUuid)]}
      >
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          disabled={!isCreating}
          options={toReferenceOptions(cards?.data ?? [], purchase?.card)}
        />
      </Form.Item>
      <Form.Item
        name="description"
        label={t('creditCards.fields.description')}
        rules={[zodRule(shape.description)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="amount"
            label={t('creditCards.fields.amount')}
            rules={[zodRule(shape.amount)]}
          >
            <MoneyInput disabled={!isCreating} />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="purchaseDate"
            label={t('creditCards.fields.purchaseDate')}
            rules={[zodRule(shape.purchaseDate)]}
          >
            <DatePicker
              format={dateInputFormat(i18n.language)}
              disabled={!isCreating}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="installmentCount"
            label={t('creditCards.fields.installmentCount')}
            extra={isCreating ? t('creditCards.hints.installments') : undefined}
            rules={[zodRule(shape.installmentCount)]}
          >
            <InputNumber
              min={1}
              max={MAX_INSTALLMENTS}
              precision={0}
              disabled={!isCreating}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col {...HALF_WIDTH}>
          <Form.Item
            name="categoryUuid"
            label={t('creditCards.fields.category')}
            rules={[zodRule(shape.categoryUuid)]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={toReferenceOptions(
                categories?.data ?? [],
                purchase?.category,
              )}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        name="notes"
        label={t('creditCards.fields.notes')}
        rules={[zodRule(shape.notes)]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
};

export const CreditCardPurchaseFormModal = ({
  open,
  purchase,
  onClose,
}: CreditCardPurchaseFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateCreditCardPurchase();
  const updateMutation = useUpdateCreditCardPurchase();

  const submit = (values: CreditCardPurchaseForm) => {
    const options = { onSuccess: onClose, onError: showError };

    if (purchase) {
      updateMutation.mutate(
        {
          uuid: purchase.uuid,
          ...toUpdateCreditCardPurchasePayload(
            editFormSchema.parse(values),
            purchase,
          ),
        },
        options,
      );
    } else {
      createMutation.mutate(
        toCreateCreditCardPurchasePayload(
          creditCardPurchaseFormSchema.parse(values),
        ),
        options,
      );
    }
  };

  return (
    <FormModal<CreditCardPurchaseForm>
      open={open}
      title={t(
        purchase
          ? 'creditCards.purchases.edit.title'
          : 'creditCards.purchases.create.title',
      )}
      initialValues={initialValuesOf(purchase)}
      submitting={createMutation.isPending || updateMutation.isPending}
      width={MODAL_WIDTH}
      onSubmit={submit}
      onCancel={onClose}
    >
      {purchase && (
        <Alert
          type="info"
          showIcon
          title={t('creditCards.hints.purchaseLocked')}
          style={{ marginBottom: 16 }}
        />
      )}
      <PurchaseFields purchase={purchase} />
    </FormModal>
  );
};
