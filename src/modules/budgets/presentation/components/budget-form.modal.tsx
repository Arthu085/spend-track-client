import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Form, Row, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTransactionCategories } from '@/modules/transaction-categories/infra/transaction-categories.queries';
import { toReferenceOptions } from '@/modules/transactions/presentation/components/reference-options';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatMonthLabel, type MonthRef } from '@/shared/date/month-ref';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import { MAX_PAGE_SIZE } from '@/shared/list/use-list-params';
import { MoneyInput } from '@/shared/money/money-input';
import { positiveMoneyInputSchema } from '@/shared/money/money';
import {
  type BudgetForm,
  budgetCategoryLimitFormSchema,
  toBudgetPayload,
} from '../../domain/budget-form.schemas';
import type { BudgetCategoryLimit } from '../../domain/budget.schema';
import { useSaveBudget } from '../../infra/budgets.queries';

type CategoryLimitRow = Partial<
  NonNullable<BudgetForm['categoryLimits']>[number]
>;

interface BudgetFormFieldsProps {
  retained: readonly BudgetCategoryLimit[];
}

const BudgetFormFields = ({ retained }: BudgetFormFieldsProps) => {
  const { t } = useTranslation();
  const rows = Form.useWatch<CategoryLimitRow[] | undefined>('categoryLimits');
  const { data: categories } = useTransactionCategories({
    kind: 'EXPENSE',
    status: 'ACTIVE',
    limit: MAX_PAGE_SIZE,
  });
  const { shape } = budgetCategoryLimitFormSchema;

  const activeOptions = toReferenceOptions(categories?.data ?? []);
  const options = [
    ...activeOptions,
    ...toReferenceOptions(retained.map(({ category }) => category)).filter(
      ({ value }) => !activeOptions.some((option) => option.value === value),
    ),
  ];

  const optionsFor = (index: number) => {
    const takenElsewhere = new Set(
      (rows ?? [])
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row) => row?.categoryUuid),
    );

    return options.filter(({ value }) => !takenElsewhere.has(value));
  };

  return (
    <>
      <Form.Item
        name="totalLimit"
        label={t('budgets.fields.totalLimit')}
        extra={t('budgets.hints.totalLimit')}
        dependencies={['categoryLimits']}
        rules={[
          zodRule(positiveMoneyInputSchema.nullish()),
          ({ getFieldValue }) => ({
            validator: (_rule, value: unknown) => {
              const limits: unknown = getFieldValue('categoryLimits');
              const hasCategoryLimits =
                Array.isArray(limits) && limits.length > 0;

              return value == null && !hasCategoryLimits
                ? Promise.reject(new Error(t('budgets.validation.empty')))
                : Promise.resolve();
            },
          }),
        ]}
      >
        <MoneyInput min="0" />
      </Form.Item>
      <Typography.Text strong>
        {t('budgets.fields.categoryLimits')}
      </Typography.Text>
      <Form.List name="categoryLimits">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <Row key={key} gutter={8} align="top" wrap={false}>
                <Col flex="auto">
                  <Form.Item
                    name={[name, 'categoryUuid']}
                    label={t('budgets.fields.category')}
                    rules={[zodRule(shape.categoryUuid)]}
                  >
                    <Select
                      showSearch={{ optionFilterProp: 'label' }}
                      options={optionsFor(name)}
                    />
                  </Form.Item>
                </Col>
                <Col flex="180px">
                  <Form.Item
                    name={[name, 'limit']}
                    label={t('budgets.fields.limit')}
                    rules={[zodRule(shape.limit)]}
                  >
                    <MoneyInput min="0" />
                  </Form.Item>
                </Col>
                <Col style={{ paddingTop: 30 }}>
                  <IconActionButton
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    label={t('budgets.actions.removeCategoryLimit')}
                    onClick={() => remove(name)}
                  />
                </Col>
              </Row>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add()}
              >
                {t('budgets.actions.addCategoryLimit')}
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </>
  );
};

interface BudgetFormModalProps {
  open: boolean;
  month: MonthRef;
  initialValues: BudgetForm;
  retained: readonly BudgetCategoryLimit[];
  onClose: () => void;
}

const MODAL_WIDTH = 640;

export const BudgetFormModal = ({
  open,
  month,
  initialValues,
  retained,
  onClose,
}: BudgetFormModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const saveMutation = useSaveBudget();

  const submit = (values: BudgetForm) => {
    saveMutation.mutate(
      { month, payload: toBudgetPayload(values) },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <FormModal<BudgetForm>
      open={open}
      title={t('budgets.form.title', {
        month: formatMonthLabel(month, i18n.language),
      })}
      initialValues={initialValues}
      submitting={saveMutation.isPending}
      width={MODAL_WIDTH}
      onSubmit={submit}
      onCancel={onClose}
    >
      <BudgetFormFields retained={retained} />
    </FormModal>
  );
};
