import { ColorPicker, type ColorPickerProps, Form, Input, Radio } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  type CategoryForm,
  categoryFormSchema,
} from '../../domain/category-form.schemas';
import {
  type Category,
  type CategoryKind,
  categoryKindSchema,
} from '../../domain/category.schema';
import {
  useCreateCategory,
  useUpdateCategory,
} from '../../infra/categories.queries';

type PickedColor = Parameters<NonNullable<ColorPickerProps['onChange']>>[0];

const toHexColor = (color: PickedColor) => color.toHexString().toUpperCase();

interface CategoryFormModalProps {
  open: boolean;
  category?: Category;
  defaultKind: CategoryKind;
  onClose: () => void;
}

export const CategoryFormModal = ({
  open,
  category,
  defaultKind,
  onClose,
}: CategoryFormModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { shape } = categoryFormSchema;

  const submit = (values: CategoryForm) => {
    const { name, kind, color } = categoryFormSchema.parse(values);
    const options = { onSuccess: onClose, onError: showError };

    if (category) {
      updateMutation.mutate({ uuid: category.uuid, name, color }, options);
    } else {
      createMutation.mutate({ name, kind, color }, options);
    }
  };

  return (
    <FormModal<CategoryForm>
      open={open}
      title={t(category ? 'categories.edit.title' : 'categories.create.title')}
      initialValues={{
        name: category?.name,
        kind: category?.kind ?? defaultKind,
        color: category?.color ?? undefined,
      }}
      submitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={submit}
      onCancel={onClose}
    >
      <Form.Item
        name="name"
        label={t('categories.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="kind"
        label={t('categories.fields.kind')}
        extra={category ? t('categories.hints.kindFixed') : undefined}
        rules={[zodRule(shape.kind)]}
      >
        <Radio.Group
          disabled={category !== undefined}
          options={categoryKindSchema.options.map((kind) => ({
            value: kind,
            label: t(`categories.kinds.${kind}`),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="color"
        label={t('categories.fields.color')}
        getValueFromEvent={toHexColor}
      >
        <ColorPicker format="hex" disabledAlpha showText />
      </Form.Item>
    </FormModal>
  );
};
