import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Flex,
  Popconfirm,
  Space,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { formatDateOnly, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import type { transactionFiltersShape } from '../../domain/transaction-form.schemas';
import {
  isOverdue,
  type Transaction,
  type TransactionState,
} from '../../domain/transaction.schema';
import {
  useDeleteTransaction,
  useUpdateTransactionState,
} from '../../infra/transactions.queries';
import { TransactionAmount } from './transaction-amount';

const stateColors: Record<TransactionState, string | undefined> = {
  PLANNED: 'warning',
  COMPLETED: 'success',
  CANCELED: undefined,
};

interface TransactionsTableProps {
  query: UseQueryResult<PaginatedResponse<Transaction>>;
  listParams: ListParams<typeof transactionFiltersShape>;
  onEdit: (transaction: Transaction) => void;
  onComplete: (transaction: Transaction) => void;
}

export const TransactionsTable = ({
  query,
  listParams,
  onEdit,
  onComplete,
}: TransactionsTableProps) => {
  const { t, i18n } = useTranslation();
  const { showError, confirmWarning } = useFeedbackModal();
  const { page, limit, setPagination } = listParams;
  const stateMutation = useUpdateTransactionState();
  const deleteMutation = useDeleteTransaction();
  const today = todayDateOnly();
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);

  const cancelTransaction = ({ uuid, description, state }: Transaction) => {
    confirmWarning({
      title: t('transactions.cancel.title'),
      content: t(
        state === 'COMPLETED'
          ? 'transactions.cancel.completedDescription'
          : 'transactions.cancel.plannedDescription',
        { description },
      ),
      okText: t('transactions.cancel.confirm'),
      onOk: () => {
        stateMutation.mutate(
          { uuid, state: 'CANCELED' },
          { onError: showError },
        );
      },
    });
  };

  const removeTransaction = (uuid: string) => {
    const isLastRowOfPage = query.data?.data.length === 1 && page > 1;

    deleteMutation.mutate(uuid, {
      onSuccess: () => {
        if (isLastRowOfPage) {
          setPagination(page - 1, limit);
        }
      },
      onError: showError,
    });
  };

  const columns: TableColumnsType<Transaction> = [
    {
      title: t('transactions.fields.date'),
      dataIndex: 'date',
      render: (_, transaction) => (
        <Space size="small" wrap>
          {formatDate(transaction.date)}
          {isOverdue(transaction, today) && (
            <Tag color="error">{t('transactions.overdue')}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('transactions.fields.description'),
      dataIndex: 'description',
      render: (_, { description, notes }) => (
        <Flex vertical>
          {description}
          {notes && (
            <Typography.Text
              type="secondary"
              ellipsis={{ tooltip: notes }}
              style={{ maxWidth: 240 }}
            >
              {notes}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: t('transactions.fields.type'),
      dataIndex: 'typeLabel',
    },
    {
      title: t('transactions.fields.category'),
      dataIndex: 'category',
      render: (_, { category }) =>
        category && (
          <Badge color={category.color ?? undefined} text={category.name} />
        ),
    },
    {
      title: t('transactions.fields.account'),
      dataIndex: 'account',
      render: (_, { account, destinationAccount }) =>
        destinationAccount
          ? t('transactions.transferRoute', {
              from: account.name,
              to: destinationAccount.name,
            })
          : account.name,
    },
    {
      title: t('transactions.fields.state'),
      dataIndex: 'state',
      render: (_, { state, stateLabel, completedOn }) => (
        <Flex vertical align="start">
          <Tag color={stateColors[state]}>{stateLabel}</Tag>
          {completedOn && (
            <Typography.Text type="secondary">
              {t('transactions.completedOnDate', {
                date: formatDate(completedOn),
              })}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: t('transactions.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, transaction) => (
        <TransactionAmount transaction={transaction} />
      ),
    },
    {
      title: t('transactions.fields.actions'),
      key: 'actions',
      render: (_, transaction) => {
        const { uuid, description, state } = transaction;
        const isCanceled = state === 'CANCELED';
        const isPlanned = state === 'PLANNED';

        return (
          <Space>
            <Button
              size="small"
              icon={isCanceled ? <EyeOutlined /> : <EditOutlined />}
              aria-label={t(
                isCanceled
                  ? 'transactions.actions.view'
                  : 'transactions.actions.edit',
                { description },
              )}
              onClick={() => onEdit(transaction)}
            />
            {isPlanned && (
              <Button
                size="small"
                icon={<CheckOutlined />}
                aria-label={t('transactions.actions.complete', {
                  description,
                })}
                onClick={() => onComplete(transaction)}
              />
            )}
            {!isCanceled && (
              <Button
                size="small"
                icon={<StopOutlined />}
                aria-label={t('transactions.actions.cancel', {
                  description,
                })}
                loading={
                  stateMutation.isPending &&
                  stateMutation.variables.uuid === uuid
                }
                onClick={() => cancelTransaction(transaction)}
              />
            )}
            {isPlanned && (
              <Popconfirm
                title={t('transactions.delete.title')}
                description={t('transactions.delete.description', {
                  description,
                })}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => removeTransaction(uuid)}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={t('transactions.actions.delete', {
                    description,
                  })}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === uuid
                  }
                />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PaginatedTable
      query={query}
      listParams={listParams}
      rowKey="uuid"
      columns={columns}
      locale={{ emptyText: t('transactions.empty') }}
    />
  );
};
