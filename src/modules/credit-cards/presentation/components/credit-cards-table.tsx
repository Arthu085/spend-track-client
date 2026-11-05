import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Flex,
  Popconfirm,
  Space,
  Switch,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { creditCardInvoicesPath } from '@/core/router/app-routes';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { PendingOperationsModal } from '@/shared/components/pending-operations.modal';
import { useArchiveWithPendingOperations } from '@/shared/components/use-archive-with-pending-operations';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import { isPositiveMoney } from '@/shared/money/money';
import type { creditCardFiltersShape } from '../../domain/credit-card-form.schemas';
import type { CreditCard } from '../../domain/credit-card.schema';
import { fetchCreditCardPendingOperations } from '../../infra/credit-cards.api';
import {
  useDeleteCreditCard,
  useUpdateCreditCardStatus,
} from '../../infra/credit-cards.queries';

interface CreditCardsTableProps {
  query: UseQueryResult<PaginatedResponse<CreditCard>>;
  listParams: ListParams<typeof creditCardFiltersShape>;
  onEdit: (card: CreditCard) => void;
}

export const CreditCardsTable = ({
  query,
  listParams,
  onEdit,
}: CreditCardsTableProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const { page, limit, setPagination } = listParams;
  const statusMutation = useUpdateCreditCardStatus();
  const deleteMutation = useDeleteCreditCard();
  const archiveFlow = useArchiveWithPendingOperations({
    fetchPendingOperations: fetchCreditCardPendingOperations,
    statusMutation,
  });

  const removeCard = (uuid: string) => {
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

  const columns: TableColumnsType<CreditCard> = [
    {
      title: t('creditCards.fields.name'),
      dataIndex: 'name',
      render: (_, { name, isDefault }) => (
        <Space size="small" wrap>
          {name}
          {isDefault && <Tag>{t('creditCards.default')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('creditCards.fields.billingDays'),
      key: 'billingDays',
      render: (_, { closingDay, dueDay }) =>
        t('creditCards.billingDays', { closingDay, dueDay }),
    },
    {
      title: t('creditCards.fields.creditLimit'),
      dataIndex: 'creditLimit',
      align: 'right',
      render: (_, { creditLimit }) => <MoneyText amount={creditLimit} />,
    },
    {
      title: t('creditCards.fields.outstanding'),
      dataIndex: 'outstanding',
      align: 'right',
      render: (_, { outstanding }) => <MoneyText amount={outstanding} />,
    },
    {
      title: t('creditCards.fields.availableLimit'),
      dataIndex: 'availableLimit',
      align: 'right',
      render: (_, { availableLimit, creditBalance }) => (
        <Flex vertical align="end">
          <MoneyText amount={availableLimit} />
          {isPositiveMoney(creditBalance) && (
            <Typography.Text type="secondary">
              {t('creditCards.creditBalance')}{' '}
              <MoneyText amount={creditBalance} />
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: t('creditCards.fields.status'),
      dataIndex: 'status',
      render: (_, { uuid, name, status, statusLabel }) => (
        <Space>
          <Switch
            size="small"
            aria-label={t('creditCards.actions.toggleStatus', { name })}
            checked={status === 'ACTIVE'}
            loading={
              archiveFlow.isChecking(uuid) ||
              (statusMutation.isPending &&
                statusMutation.variables.uuid === uuid)
            }
            onChange={(checked) => {
              if (checked) {
                statusMutation.mutate(
                  { uuid, status: 'ACTIVE' },
                  { onError: showError },
                );

                return;
              }

              archiveFlow.requestArchive({ uuid, name });
            }}
          />
          {statusLabel}
        </Space>
      ),
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, card) => (
        <Space>
          <Link
            to={creditCardInvoicesPath(card.uuid)}
            aria-label={t('creditCards.actions.invoices', { name: card.name })}
          >
            <FileTextOutlined /> {t('creditCards.invoices.title')}
          </Link>
          <IconActionButton
            size="small"
            icon={<EditOutlined />}
            label={t('creditCards.actions.edit', { name: card.name })}
            disabled={card.status === 'INACTIVE'}
            onClick={() => onEdit(card)}
          />
          <Popconfirm
            title={t('creditCards.delete.title')}
            description={t('creditCards.delete.description', {
              name: card.name,
            })}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => removeCard(card.uuid)}
          >
            <IconActionButton
              size="small"
              danger
              icon={<DeleteOutlined />}
              label={t('creditCards.actions.delete', { name: card.name })}
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === card.uuid
              }
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PaginatedTable
        query={query}
        listParams={listParams}
        rowKey="uuid"
        columns={columns}
        locale={{ emptyText: t('creditCards.empty') }}
      />
      <PendingOperationsModal
        {...archiveFlow.dialog}
        description={t('creditCards.archive.description')}
        keepHint={t('creditCards.archive.keepHint')}
        cancelHint={t('creditCards.archive.cancelHint')}
      />
    </>
  );
};
