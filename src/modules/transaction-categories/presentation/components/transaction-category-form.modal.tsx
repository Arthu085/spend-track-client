import { ColorPicker, type ColorPickerProps, Form, Input, Radio } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  TRANSACTION_CATEGORY_COLOR_PRESETS,
  type TransactionCategoryForm,
  transactionCategoryFormSchema,
  DEFAULT_TRANSACTION_CATEGORY_COLOR,
} from '../../domain/transaction-category-form.schemas';
import {
  type TransactionCategory,
  type TransactionCategoryKind,
  transactionCategoryKindSchema,
} from '../../domain/transaction-category.schema';
import {
  useCreateTransactionCategory,
  useUpdateTransactionCategory,
} from '../../infra/transaction-categories.queries';

type PickedColor = Parameters<NonNullable<ColorPickerProps['onChange']>>[0];

const toHexColor = (color: PickedColor) => color.toHexString().toUpperCase();

interface TransactionCategoryFormModalProps {
  open: boolean;
  category?: TransactionCategory;
  defaultKind: TransactionCategoryKind;
  onClose: () => void;
}

export const TransactionCategoryFormModal = ({
  open,
  category,
  defaultKind,
  onClose,
}: TransactionCategoryFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateTransactionCategory();
  const updateMutation = useUpdateTransactionCategory();
  const { shape } = transactionCategoryFormSchema;

  const submit = (values: TransactionCategoryForm) => {
    const { name, kind, color } = transactionCategoryFormSchema.parse(values);
    const options = { onSuccess: onClose, onError: showError };

    if (category) {
      updateMutation.mutate({ uuid: category.uuid, name, color }, options);
    } else {
      createMutation.mutate({ name, kind, color }, options);
    }
  };

  return (
    <FormModal<TransactionCategoryForm>
      open={open}
      title={t(
        category
          ? 'transactionCategories.edit.title'
          : 'transactionCategories.create.title',
      )}
      initialValues={{
        name: category?.name,
        kind: category?.kind ?? defaultKind,
        color: category?.color ?? DEFAULT_TRANSACTION_CATEGORY_COLOR,
      }}
      submitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Form.Item
        name="name"
        label={t('transactionCategories.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="kind"
        label={t('transactionCategories.fields.kind')}
        extra={
          category ? t('transactionCategories.hints.kindFixed') : undefined
        }
        rules={[zodRule(shape.kind)]}
      >
        <Radio.Group
          disabled={category !== undefined}
          options={transactionCategoryKindSchema.options.map((kind) => ({
            value: kind,
            label: t(`transactionCategories.kinds.${kind}`),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="color"
        label={t('transactionCategories.fields.color')}
        getValueFromEvent={toHexColor}
        rules={[zodRule(shape.color)]}
      >
        <ColorPicker
          format="hex"
          disabledAlpha
          showText
          presets={[
            {
              label: t('transactionCategories.fields.colorPresets'),
              colors: TRANSACTION_CATEGORY_COLOR_PRESETS,
            },
          ]}
        />
      </Form.Item>
    </FormModal>
  );
};
