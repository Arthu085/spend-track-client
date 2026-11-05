import {
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  LineChartOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import type { UseQueryResult } from '@tanstack/react-query';
import { Popconfirm, Space, Switch, type TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { investmentMovementsPath } from '@/core/router/app-routes';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { IconActionLink } from '@/shared/components/icon-action-link';
import { PendingOperationsModal } from '@/shared/components/pending-operations.modal';
import { useArchiveWithPendingOperations } from '@/shared/components/use-archive-with-pending-operations';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import type { ListParams } from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import type { investmentFiltersShape } from '../../domain/investment-form.schemas';
import type {
  Investment,
  TransferMovementType,
} from '../../domain/investment.schema';
import { fetchInvestmentPendingOperations } from '../../infra/investments.api';
import {
  useDeleteInvestment,
  useUpdateInvestmentStatus,
} from '../../infra/investments.queries';
import { InvestmentProgress } from './investment-progress';

interface InvestmentsTableProps {
  query: UseQueryResult<PaginatedResponse<Investment>>;
  listParams: ListParams<typeof investmentFiltersShape>;
  onEdit: (investment: Investment) => void;
  onMove: (investment: Investment, type: TransferMovementType) => void;
  onValuate: (investment: Investment) => void;
}

export const InvestmentsTable = ({
  query,
  listParams,
  onEdit,
  onMove,
  onValuate,
}: InvestmentsTableProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const { page, limit, setPagination } = listParams;
  const statusMutation = useUpdateInvestmentStatus();
  const deleteMutation = useDeleteInvestment();
  const archiveFlow = useArchiveWithPendingOperations({
    fetchPendingOperations: fetchInvestmentPendingOperations,
    statusMutation,
  });

  const removeInvestment = (uuid: string) => {
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

  const actionButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    disabled: boolean,
  ) => (
    <IconActionButton
      size="small"
      icon={icon}
      label={label}
      disabled={disabled}
      onClick={onClick}
    />
  );

  const columns: TableColumnsType<Investment> = [
    {
      title: t('investments.fields.name'),
      dataIndex: 'name',
    },
    {
      title: t('investments.fields.type'),
      dataIndex: 'typeLabel',
    },
    {
      title: t('investments.fields.currentValue'),
      dataIndex: 'currentValue',
      align: 'right',
      render: (_, { currentValue }) => (
        <MoneyText amount={currentValue} strong />
      ),
    },
    {
      title: t('investments.fields.progress'),
      key: 'progress',
      render: (_, { name, targetAmount, progress }) => (
        <InvestmentProgress
          name={name}
          targetAmount={targetAmount}
          progress={progress}
        />
      ),
    },
    {
      title: t('investments.fields.status'),
      dataIndex: 'status',
      render: (_, { uuid, name, status, statusLabel }) => (
        <Space>
          <Switch
            size="small"
            aria-label={t('investments.actions.toggleStatus', { name })}
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
      title: t('investments.fields.actions'),
      key: 'actions',
      render: (_, investment) => {
        const { name, uuid } = investment;
        const archived = investment.status === 'INACTIVE';

        return (
          <Space wrap>
            {actionButton(
              t('investments.actions.contribute', { name }),
              <PlusCircleOutlined />,
              () => onMove(investment, 'CONTRIBUTION'),
              archived,
            )}
            {actionButton(
              t('investments.actions.withdraw', { name }),
              <MinusCircleOutlined />,
              () => onMove(investment, 'WITHDRAWAL'),
              archived,
            )}
            {actionButton(
              t('investments.actions.valuate', { name }),
              <LineChartOutlined />,
              () => onValuate(investment),
              archived,
            )}
            <IconActionLink
              to={investmentMovementsPath(uuid)}
              label={t('investments.actions.history', { name })}
              icon={<HistoryOutlined />}
            />
            {actionButton(
              t('investments.actions.edit', { name }),
              <EditOutlined />,
              () => onEdit(investment),
              archived,
            )}
            <Popconfirm
              title={t('investments.delete.title')}
              description={t('investments.delete.description', { name })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeInvestment(uuid)}
            >
              <IconActionButton
                size="small"
                danger
                icon={<DeleteOutlined />}
                label={t('investments.actions.delete', { name })}
                loading={
                  deleteMutation.isPending && deleteMutation.variables === uuid
                }
              />
            </Popconfirm>
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
        columns={columns}
        locale={{ emptyText: t('investments.empty') }}
      />
      <PendingOperationsModal
        {...archiveFlow.dialog}
        description={t('investments.archive.description')}
        keepHint={t('investments.archive.keepHint')}
        cancelHint={t('investments.archive.cancelHint')}
      />
    </>
  );
};
