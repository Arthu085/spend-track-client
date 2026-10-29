import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/modules/preferences/infra/preferences.queries';
import { PageLoader } from '@/shared/components/page-loader';
import { todayDateOnly } from '@/shared/date/date-only';
import { MonthNavigator } from '@/shared/date/month-navigator';
import {
  monthDateRange,
  type MonthRef,
  monthRefOfDate,
  shiftMonth,
} from '@/shared/date/month-ref';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useListParams } from '@/shared/list/use-list-params';
import { transactionFiltersShape } from '../../domain/transaction-form.schemas';
import type { Transaction } from '../../domain/transaction.schema';
import { useTransactions } from '../../infra/transactions.queries';
import { CompleteTransactionModal } from '../components/complete-transaction.modal';
import { TransactionFormModal } from '../components/transaction-form.modal';
import { TransactionsFilters } from '../components/transactions-filters';
import { TransactionsTable } from '../components/transactions-table';

type EditorState =
  { mode: 'create' } | { mode: 'edit'; transaction: Transaction };

interface TransactionsOfMonthProps {
  month: MonthRef;
  currentMonth: MonthRef;
  onMonthChange: (month: MonthRef) => void;
}

const TransactionsOfMonth = ({
  month,
  currentMonth,
  onMonthChange,
}: TransactionsOfMonthProps) => {
  const { t } = useTranslation();
  const listParams = useListParams(transactionFiltersShape);
  const { page, limit, filters } = listParams;
  const transactionsQuery = useTransactions({
    page,
    limit,
    ...monthDateRange(month),
    ...filters,
  });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [completing, setCompleting] = useState<Transaction | null>(null);

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('transactions.title')}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditor({ mode: 'create' })}
        >
          {t('transactions.create.title')}
        </Button>
      </Flex>
      <Card>
        <MonthNavigator
          value={month}
          current={currentMonth}
          onChange={onMonthChange}
        />
      </Card>
      <TransactionsFilters listParams={listParams} />
      <TransactionsTable
        query={transactionsQuery}
        listParams={listParams}
        onEdit={(transaction) => setEditor({ mode: 'edit', transaction })}
        onComplete={setCompleting}
      />
      <TransactionFormModal
        open={editor !== null}
        transaction={editor?.mode === 'edit' ? editor.transaction : undefined}
        onClose={() => setEditor(null)}
      />
      <CompleteTransactionModal
        transaction={completing}
        onClose={() => setCompleting(null)}
      />
    </Flex>
  );
};

export const TransactionsPage = () => {
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
    <TransactionsOfMonth
      month={selectedMonth ?? defaultMonth}
      currentMonth={currentMonth}
      onMonthChange={setMonth}
    />
  );
};
