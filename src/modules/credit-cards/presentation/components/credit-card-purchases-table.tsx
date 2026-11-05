import {
  DeleteOutlined,
  EditOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Badge,
  Flex,
  Popconfirm,
  Space,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import { isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type { creditCardPurchaseFiltersShape } from '../../domain/credit-card-form.schemas';
import type { CreditCardPurchase } from '../../domain/credit-card.schema';
import {
  useDeleteCreditCardPurchase,
  useDeleteCreditCardRefund,
} from '../../infra/credit-cards.queries';
import { formatInvoiceMonth } from './invoice-month';

type Installment = CreditCardPurchase['installments'][number];
type Refund = CreditCardPurchase['refunds'][number];

interface CreditCardPurchasesTableProps {
  query: UseQueryResult<PaginatedResponse<CreditCardPurchase>>;
  listParams: ListParams<typeof creditCardPurchaseFiltersShape>;
  onEdit: (purchase: CreditCardPurchase) => void;
  onRefund: (purchase: CreditCardPurchase) => void;
}

export const CreditCardPurchasesTable = ({
  query,
  listParams,
  onEdit,
  onRefund,
}: CreditCardPurchasesTableProps) => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const { page, limit, setPagination } = listParams;
  const deleteMutation = useDeleteCreditCardPurchase();
  const deleteRefundMutation = useDeleteCreditCardRefund();
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);
  const invoiceMonth = (referenceMonth: string) =>
    formatInvoiceMonth(referenceMonth, i18n.language);

  const removePurchase = (uuid: string) => {
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

  const installmentColumns: TableColumnsType<Installment> = [
    {
      title: t('creditCards.fields.installment'),
      dataIndex: 'number',
    },
    {
      title: t('creditCards.fields.date'),
      dataIndex: 'date',
      render: (_, { date }) => formatDate(date),
    },
    {
      title: t('creditCards.fields.invoice'),
      key: 'invoice',
      render: (_, { invoice }) => invoiceMonth(invoice.referenceMonth),
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={amount} />,
    },
  ];

  const refundColumns = (
    purchase: CreditCardPurchase,
  ): TableColumnsType<Refund> => [
    {
      title: t('creditCards.fields.refundDate'),
      dataIndex: 'date',
      render: (_, { date }) => formatDate(date),
    },
    {
      title: t('creditCards.fields.invoice'),
      key: 'invoice',
      render: (_, { invoice }) => invoiceMonth(invoice.referenceMonth),
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={`-${amount}`} />,
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, refund) => (
        <Popconfirm
          title={t('creditCards.refund.delete.title')}
          description={t('creditCards.refund.delete.description')}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            deleteRefundMutation.mutate(
              { purchaseUuid: purchase.uuid, refundUuid: refund.uuid },
              { onError: showError },
            );
          }}
        >
          <IconActionButton
            size="small"
            danger
            icon={<DeleteOutlined />}
            label={t('creditCards.actions.deleteRefund', {
              date: formatDate(refund.date),
            })}
            loading={
              deleteRefundMutation.isPending &&
              deleteRefundMutation.variables.refundUuid === refund.uuid
            }
          />
        </Popconfirm>
      ),
    },
  ];

  const columns: TableColumnsType<CreditCardPurchase> = [
    {
      title: t('creditCards.fields.purchaseDate'),
      dataIndex: 'purchaseDate',
      render: (_, { purchaseDate }) => formatDate(purchaseDate),
    },
    {
      title: t('creditCards.fields.description'),
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
      title: t('creditCards.fields.card'),
      key: 'card',
      render: (_, { card }) => card.name,
    },
    {
      title: t('creditCards.fields.category'),
      key: 'category',
      render: (_, { category }) => (
        <Badge color={category.color ?? undefined} text={category.name} />
      ),
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (
        _,
        { amount, installmentCount, installments, refundedAmount },
      ) => (
        <Flex vertical align="end">
          <MoneyText amount={amount} />
          {installmentCount > 1 && (
            <Typography.Text type="secondary">
              {t('creditCards.installmentsSummary', {
                count: installmentCount,
              })}{' '}
              <MoneyText
                amount={installments[installments.length - 1].amount}
              />
            </Typography.Text>
          )}
          {isPositiveMoney(refundedAmount) && (
            <Typography.Text type="secondary">
              {t('creditCards.refunded')} <MoneyText amount={refundedAmount} />
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, purchase) => {
        const { uuid, description } = purchase;

        return (
          <Space>
            <IconActionButton
              size="small"
              icon={<EditOutlined />}
              label={t('creditCards.actions.editPurchase', {
                description,
              })}
              onClick={() => onEdit(purchase)}
            />
            {isPositiveMoney(purchase.refundableAmount) && (
              <IconActionButton
                size="small"
                icon={<RollbackOutlined />}
                label={t('creditCards.actions.refund', { description })}
                onClick={() => onRefund(purchase)}
              />
            )}
            {purchase.deletable && (
              <Popconfirm
                title={t('creditCards.purchases.delete.title')}
                description={t('creditCards.purchases.delete.description', {
                  description,
                })}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => removePurchase(uuid)}
              >
                <IconActionButton
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  label={t('creditCards.actions.deletePurchase', {
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
      locale={{ emptyText: t('creditCards.purchases.empty') }}
      expandable={{
        expandedRowRender: (purchase) => (
          <Flex vertical gap="small">
            <Table
              rowKey="number"
              size="small"
              pagination={false}
              columns={installmentColumns}
              dataSource={purchase.installments}
            />
            {purchase.refunds.length > 0 && (
              <Table
                rowKey="uuid"
                size="small"
                pagination={false}
                columns={refundColumns(purchase)}
                dataSource={purchase.refunds}
              />
            )}
          </Flex>
        ),
      }}
    />
  );
};
