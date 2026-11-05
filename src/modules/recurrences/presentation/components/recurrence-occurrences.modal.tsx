import { CheckOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import {
  Flex,
  Modal,
  Space,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInvoiceMonth } from '@/modules/credit-cards/presentation/components/invoice-month';
import { isOverdue } from '@/modules/transactions/domain/transaction.schema';
import { TransactionStateTag } from '@/modules/transactions/presentation/components/transaction-state-tag';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly, todayDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { PaginatedTable } from '@/shared/list/paginated-table';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type ListParams,
} from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import {
  isCardRecurrence,
  isContributionRecurrence,
  type Recurrence,
  type RecurrenceOccurrence,
} from '../../domain/recurrence.schema';
import {
  useCancelRecurrenceOccurrence,
  useRecurrenceOccurrences,
} from '../../infra/recurrences.queries';
import {
  OccurrenceFormModal,
  type OccurrenceTarget,
} from './occurrence-form.modal';

interface RecurrenceOccurrencesModalProps {
  open: boolean;
  recurrence?: Recurrence;
  onClose: () => void;
}

const noFilters = {};

const hintKey = (recurrence?: Recurrence) => {
  if (recurrence && isContributionRecurrence(recurrence)) {
    return 'recurrences.occurrences.contributionHint';
  }

  return recurrence && isCardRecurrence(recurrence)
    ? 'recurrences.occurrences.cardHint'
    : 'recurrences.occurrences.accountHint';
};

const useLocalListParams = (): ListParams<typeof noFilters> => {
  const [{ page, limit }, setPagination] = useState({
    page: DEFAULT_PAGE,
    limit: DEFAULT_PAGE_SIZE,
  });

  return {
    page,
    limit,
    filters: noFilters,
    setPagination: (nextPage, nextLimit) => {
      setPagination({ page: nextPage, limit: nextLimit });
    },
    setFilters: () => undefined,
  };
};

const OccurrencesTable = ({ recurrence }: { recurrence: Recurrence }) => {
  const { t, i18n } = useTranslation();
  const { showError, confirmWarning } = useFeedbackModal();
  const listParams = useLocalListParams();
  const { page, limit } = listParams;
  const query = useRecurrenceOccurrences(recurrence.uuid, { page, limit });
  const cancelMutation = useCancelRecurrenceOccurrence();
  const editing = useModalTarget<OccurrenceTarget>();
  const chargesCard = isCardRecurrence(recurrence);
  const today = todayDateOnly();
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);

  const skip = (occurrence: RecurrenceOccurrence) => {
    confirmWarning({
      title: t('recurrences.skip.title'),
      content: t('recurrences.skip.description', {
        date: formatDate(occurrence.date),
      }),
      okText: t('recurrences.skip.confirm'),
      onOk: () => {
        cancelMutation.mutate(
          { recurrenceUuid: recurrence.uuid, occurrenceUuid: occurrence.uuid },
          { onError: showError },
        );
      },
    });
  };

  const columns: TableColumnsType<RecurrenceOccurrence> = [
    {
      title: t('recurrences.fields.date'),
      dataIndex: 'date',
      render: (_, occurrence) => (
        <Flex vertical align="start">
          <Space size="small" wrap>
            {formatDate(occurrence.date)}
            {isOverdue(occurrence, today) && (
              <Tag color="error">{t('transactions.overdue')}</Tag>
            )}
          </Space>
          {occurrence.date !== occurrence.occurrenceDate && (
            <Typography.Text type="secondary">
              {t('recurrences.occurrences.scheduledFor', {
                date: formatDate(occurrence.occurrenceDate),
              })}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    ...(chargesCard
      ? [
          {
            title: t('creditCards.fields.invoice'),
            key: 'invoiceMonth',
            render: (_: unknown, { invoiceMonth }: RecurrenceOccurrence) =>
              invoiceMonth && formatInvoiceMonth(invoiceMonth, i18n.language),
          },
        ]
      : []),
    {
      title: t('recurrences.fields.state'),
      dataIndex: 'state',
      render: (_, { state, stateLabel, completedOn }) => (
        <Flex vertical align="start">
          <TransactionStateTag state={state} stateLabel={stateLabel} />
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
      title: t('recurrences.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={amount} />,
    },
    {
      title: t('recurrences.fields.actions'),
      key: 'actions',
      render: (_, occurrence) => {
        if (occurrence.state !== 'PLANNED') {
          return null;
        }

        const date = formatDate(occurrence.date);

        return (
          <Space>
            <IconActionButton
              size="small"
              icon={<CheckOutlined />}
              label={t('recurrences.actions.confirmOccurrence', { date })}
              onClick={() => editing.show({ action: 'confirm', occurrence })}
            />
            <IconActionButton
              size="small"
              icon={<EditOutlined />}
              label={t('recurrences.actions.editOccurrence', { date })}
              onClick={() => editing.show({ action: 'edit', occurrence })}
            />
            <IconActionButton
              size="small"
              icon={<StopOutlined />}
              label={t('recurrences.actions.skipOccurrence', { date })}
              loading={
                cancelMutation.isPending &&
                cancelMutation.variables.occurrenceUuid === occurrence.uuid
              }
              onClick={() => skip(occurrence)}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <PaginatedTable
        query={query}
        listParams={listParams}
        rowKey="uuid"
        size="small"
        columns={columns}
        locale={{ emptyText: t('recurrences.occurrences.empty') }}
      />
      <OccurrenceFormModal
        open={editing.open}
        recurrence={recurrence}
        target={editing.target}
        onClose={editing.close}
      />
    </>
  );
};

export const RecurrenceOccurrencesModal = ({
  open,
  recurrence,
  onClose,
}: RecurrenceOccurrencesModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={t('recurrences.occurrences.title', {
        description: recurrence?.description,
      })}
      width={760}
      footer={(_, { CancelBtn }) => <CancelBtn />}
      cancelText={t('common.close')}
      onCancel={onClose}
      destroyOnHidden
    >
      <Flex vertical gap="small">
        <Typography.Paragraph type="secondary">
          {t(hintKey(recurrence), {
            investment: recurrence?.investment?.name,
          })}
        </Typography.Paragraph>
        {recurrence && <OccurrencesTable recurrence={recurrence} />}
      </Flex>
    </Modal>
  );
};
