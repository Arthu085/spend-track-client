import {
  CreditCardOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import { Badge, Flex, Space, type TableColumnsType, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { TransactionAmount } from '@/modules/transactions/presentation/components/transaction-amount';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import type { recurrenceFiltersShape } from '../../domain/recurrence-form.schemas';
import {
  isRecurrenceEnded,
  type Recurrence,
} from '../../domain/recurrence.schema';
import { useUpdateRecurrenceState } from '../../infra/recurrences.queries';
import { RecurrenceStateTag } from './recurrence-state-tag';

interface RecurrencesTableProps {
  query: UseQueryResult<PaginatedResponse<Recurrence>>;
  listParams: ListParams<typeof recurrenceFiltersShape>;
  onShowOccurrences: (recurrence: Recurrence) => void;
  onEdit: (recurrence: Recurrence) => void;
  onEnd: (recurrence: Recurrence) => void;
}

export const RecurrencesTable = ({
  query,
  listParams,
  onShowOccurrences,
  onEdit,
  onEnd,
}: RecurrencesTableProps) => {
  const { t, i18n } = useTranslation();
  const { showError, confirmWarning } = useFeedbackModal();
  const stateMutation = useUpdateRecurrenceState();
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);

  const resume = ({ uuid }: Recurrence) => {
    stateMutation.mutate({ uuid, state: 'ACTIVE' }, { onError: showError });
  };

  const pause = ({ uuid, description }: Recurrence) => {
    confirmWarning({
      title: t('recurrences.pause.title'),
      content: t('recurrences.pause.description', { description }),
      okText: t('recurrences.pause.confirm'),
      onOk: () => {
        stateMutation.mutate({ uuid, state: 'PAUSED' }, { onError: showError });
      },
    });
  };

  const columns: TableColumnsType<Recurrence> = [
    {
      title: t('recurrences.fields.description'),
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
      title: t('recurrences.fields.type'),
      dataIndex: 'typeLabel',
    },
    {
      title: t('recurrences.fields.schedule'),
      key: 'schedule',
      render: (_, { frequencyLabel, startDate, endDate }) => (
        <Flex vertical>
          {frequencyLabel}
          <Typography.Text type="secondary">
            {endDate
              ? t('recurrences.schedule.between', {
                  start: formatDate(startDate),
                  end: formatDate(endDate),
                })
              : t('recurrences.schedule.from', {
                  start: formatDate(startDate),
                })}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('recurrences.fields.nextOccurrence'),
      dataIndex: 'nextOccurrenceDate',
      render: (_, { nextOccurrenceDate }) =>
        nextOccurrenceDate && formatDate(nextOccurrenceDate),
    },
    {
      title: t('recurrences.fields.target'),
      key: 'target',
      render: (_, { account, creditCard }) => (
        <Space size="small">
          {creditCard ? <CreditCardOutlined /> : <WalletOutlined />}
          {creditCard?.name ?? account?.name}
        </Space>
      ),
    },
    {
      title: t('recurrences.fields.category'),
      key: 'category',
      render: (_, { category }) => (
        <Badge color={category.color ?? undefined} text={category.name} />
      ),
    },
    {
      title: t('recurrences.fields.state'),
      dataIndex: 'state',
      render: (_, recurrence) => <RecurrenceStateTag {...recurrence} />,
    },
    {
      title: t('recurrences.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, recurrence) => <TransactionAmount transaction={recurrence} />,
    },
    {
      title: t('recurrences.fields.actions'),
      key: 'actions',
      render: (_, recurrence) => {
        const { uuid, description, state } = recurrence;
        const isChangingState =
          stateMutation.isPending && stateMutation.variables.uuid === uuid;

        return (
          <Space>
            <IconActionButton
              size="small"
              icon={<UnorderedListOutlined />}
              label={t('recurrences.actions.occurrences', {
                description,
              })}
              onClick={() => onShowOccurrences(recurrence)}
            />
            {!isRecurrenceEnded(recurrence) && (
              <>
                <IconActionButton
                  size="small"
                  icon={<EditOutlined />}
                  label={t('recurrences.actions.edit', { description })}
                  onClick={() => onEdit(recurrence)}
                />
                {state === 'PAUSED' ? (
                  <IconActionButton
                    size="small"
                    icon={<PlayCircleOutlined />}
                    label={t('recurrences.actions.resume', {
                      description,
                    })}
                    loading={isChangingState}
                    onClick={() => resume(recurrence)}
                  />
                ) : (
                  <IconActionButton
                    size="small"
                    icon={<PauseCircleOutlined />}
                    label={t('recurrences.actions.pause', {
                      description,
                    })}
                    loading={isChangingState}
                    onClick={() => pause(recurrence)}
                  />
                )}
                <IconActionButton
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  label={t('recurrences.actions.end', { description })}
                  onClick={() => onEnd(recurrence)}
                />
              </>
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
      locale={{ emptyText: t('recurrences.empty') }}
    />
  );
};
