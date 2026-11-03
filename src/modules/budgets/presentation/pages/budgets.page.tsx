import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Flex, Skeleton, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useDashboard } from '@/modules/dashboard/infra/dashboard.queries';
import { BudgetCard } from '@/modules/dashboard/presentation/components/budget.card';
import { usePreferences } from '@/modules/preferences/infra/preferences.queries';
import { PageLoader } from '@/shared/components/page-loader';
import { todayDateOnly } from '@/shared/date/date-only';
import { MonthNavigator } from '@/shared/date/month-navigator';
import {
  formatMonthLabel,
  type MonthRef,
  monthRefOfDate,
  shiftMonth,
} from '@/shared/date/month-ref';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import {
  type BudgetForm,
  toBudgetForm,
} from '../../domain/budget-form.schemas';
import {
  type Budget,
  type BudgetCategoryLimit,
  hasBudget,
} from '../../domain/budget.schema';
import {
  budgetQueryOptions,
  useBudget,
  useDeleteBudget,
} from '../../infra/budgets.queries';
import { BudgetFormModal } from '../components/budget-form.modal';

interface BudgetDraft {
  initialValues: BudgetForm;
  retained: readonly BudgetCategoryLimit[];
}

const draftOf = (budget: Budget): BudgetDraft => ({
  initialValues: toBudgetForm(budget),
  retained: budget.categoryLimits,
});

const emptyDraft: BudgetDraft = {
  initialValues: { categoryLimits: [] },
  retained: [],
};

interface BudgetOfMonthProps {
  month: MonthRef;
  currentMonth: MonthRef;
  onMonthChange: (month: MonthRef) => void;
}

const BudgetOfMonth = ({
  month,
  currentMonth,
  onMonthChange,
}: BudgetOfMonthProps) => {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { showError, confirmWarning } = useFeedbackModal();
  const budgetQuery = useBudget(month);
  const dashboardQuery = useDashboard(month);
  const deleteMutation = useDeleteBudget();
  const [draft, setDraft] = useState<BudgetDraft>();
  const [copying, setCopying] = useState(false);
  const budget = budgetQuery.data;
  const configured = budget !== undefined && hasBudget(budget);
  const monthLabel = formatMonthLabel(month, i18n.language);

  const copyPreviousMonth = async () => {
    const previousMonth = shiftMonth(month, -1);

    setCopying(true);

    try {
      const previous = await queryClient.fetchQuery(
        budgetQueryOptions(previousMonth),
      );

      if (hasBudget(previous)) {
        setDraft(draftOf(previous));
      } else {
        message.info(
          t('budgets.copy.empty', {
            month: formatMonthLabel(previousMonth, i18n.language),
          }),
        );
      }
    } catch (error) {
      showError(error);
    } finally {
      setCopying(false);
    }
  };

  const confirmDelete = () => {
    confirmWarning({
      title: t('budgets.delete.title', { month: monthLabel }),
      content: t('budgets.delete.content'),
      okText: t('budgets.actions.delete'),
      onOk: () => deleteMutation.mutate(month, { onError: showError }),
    });
  };

  const error = budgetQuery.error ?? dashboardQuery.error;

  return (
    <Flex vertical gap="middle">
      <div>
        <Typography.Title level={2}>{t('budgets.title')}</Typography.Title>
        <Typography.Text type="secondary">
          {t('budgets.description')}
        </Typography.Text>
      </div>
      <Card>
        <Flex justify="space-between" align="center" gap="middle" wrap>
          <MonthNavigator
            value={month}
            current={currentMonth}
            onChange={onMonthChange}
          />
          {budget && (
            <Flex gap="small" wrap>
              {configured ? (
                <>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => setDraft(draftOf(budget))}
                  >
                    {t('budgets.actions.edit')}
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteMutation.isPending}
                    onClick={confirmDelete}
                  >
                    {t('budgets.actions.delete')}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="primary" onClick={() => setDraft(emptyDraft)}>
                    {t('budgets.actions.create')}
                  </Button>
                  <Button
                    icon={<CopyOutlined />}
                    loading={copying}
                    onClick={() => {
                      copyPreviousMonth().catch(showError);
                    }}
                  >
                    {t('budgets.actions.copyPrevious')}
                  </Button>
                </>
              )}
            </Flex>
          )}
        </Flex>
      </Card>
      {error && (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      )}
      {dashboardQuery.data ? (
        <BudgetCard
          budget={dashboardQuery.data.budget}
          guidance={dashboardQuery.data.spendingGuidance}
        />
      ) : (
        !error && <Skeleton active />
      )}
      {draft && (
        <BudgetFormModal
          open
          month={month}
          initialValues={draft.initialValues}
          retained={draft.retained}
          onClose={() => setDraft(undefined)}
        />
      )}
    </Flex>
  );
};

export const BudgetsPage = () => {
  const [selectedMonth, setMonth] = useMonthParam();
  const { data: preferences, isPending } = usePreferences();
  const currentMonth = monthRefOfDate(todayDateOnly());

  if (!selectedMonth && isPending) {
    return <PageLoader />;
  }

  const defaultMonth =
    preferences?.defaultMonth === 'NEXT'
      ? shiftMonth(currentMonth, 1)
      : currentMonth;

  return (
    <BudgetOfMonth
      month={selectedMonth ?? defaultMonth}
      currentMonth={currentMonth}
      onMonthChange={setMonth}
    />
  );
};
