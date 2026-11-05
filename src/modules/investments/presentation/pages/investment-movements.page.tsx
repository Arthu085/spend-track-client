import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  Flex,
  Popconfirm,
  Space,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { PaginatedTable } from '@/shared/list/paginated-table';
import { useListParams } from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import type { InvestmentMovement } from '../../domain/investment.schema';
import {
  useInvestmentMovements,
  useUpdateInvestmentMovementState,
} from '../../infra/investments.queries';

const noFilters = {};

const stateColors = {
  PLANNED: 'gold',
  COMPLETED: 'green',
  CANCELED: 'default',
} as const;

const kindColors = {
  ONE_TIME: 'default',
  MANDATORY: 'blue',
  ADDITIONAL: 'purple',
} as const;

const signedAmount = ({ type, amount }: InvestmentMovement) =>
  type === 'WITHDRAWAL' ? `-${amount}` : amount;

export const InvestmentMovementsPage = () => {
  const { t, i18n } = useTranslation();
  const { showError } = useFeedbackModal();
  const { uuid = '' } = useParams();
  const listParams = useListParams(noFilters);
  const { page, limit } = listParams;
  const movementsQuery = useInvestmentMovements(uuid, { page, limit });
  const stateMutation = useUpdateInvestmentMovementState();

  const changeState = (
    movementUuid: string,
    state: 'COMPLETED' | 'CANCELED',
  ) => {
    stateMutation.mutate(
      { investmentUuid: uuid, movementUuid, state },
      { onError: showError },
    );
  };

  const columns: TableColumnsType<InvestmentMovement> = [
    {
      title: t('investments.fields.date'),
      dataIndex: 'date',
      render: (_, { date }) => formatDateOnly(date, i18n.language),
    },
    {
      title: t('investments.fields.movementType'),
      dataIndex: 'typeLabel',
      render: (
        _,
        { type, typeLabel, contributionKind, contributionKindLabel },
      ) => (
        <Space size="small" wrap>
          {typeLabel}
          {type === 'CONTRIBUTION' && (
            <Tag color={kindColors[contributionKind]}>
              {contributionKindLabel}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('investments.fields.account'),
      key: 'account',
      render: (_, { account }) => account?.name ?? '—',
    },
    {
      title: t('investments.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, movement) => (
        <MoneyText
          amount={signedAmount(movement)}
          delete={movement.state === 'CANCELED'}
        />
      ),
    },
    {
      title: t('investments.fields.state'),
      dataIndex: 'state',
      render: (_, { state, stateLabel }) => (
        <Tag color={stateColors[state]}>{stateLabel}</Tag>
      ),
    },
    {
      title: t('investments.fields.actions'),
      key: 'actions',
      render: (_, movement) => (
        <Space>
          {movement.state === 'PLANNED' && (
            <Popconfirm
              title={t('investments.confirm.title')}
              description={t('investments.confirm.description')}
              okText={t('investments.actions.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => changeState(movement.uuid, 'COMPLETED')}
            >
              <IconActionButton
                size="small"
                icon={<CheckOutlined />}
                label={t('investments.actions.confirmMovement', {
                  type: movement.typeLabel,
                })}
              />
            </Popconfirm>
          )}
          {movement.state !== 'CANCELED' && (
            <Popconfirm
              title={t('investments.cancelMovement.title')}
              description={t('investments.cancelMovement.description')}
              okText={t('investments.actions.cancel')}
              cancelText={t('common.close')}
              okButtonProps={{ danger: true }}
              onConfirm={() => changeState(movement.uuid, 'CANCELED')}
            >
              <IconActionButton
                size="small"
                danger
                icon={<CloseOutlined />}
                label={t('investments.actions.cancelMovement', {
                  type: movement.typeLabel,
                })}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Space direction="vertical" size={0}>
        <Link to={AppRoutes.INVESTMENTS}>
          <ArrowLeftOutlined /> {t('investments.title')}
        </Link>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('investments.movements.title')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('investments.movements.description')}
        </Typography.Text>
      </Space>
      <PaginatedTable
        query={movementsQuery}
        listParams={listParams}
        rowKey="uuid"
        columns={columns}
        locale={{ emptyText: t('investments.movements.empty') }}
      />
    </Flex>
  );
};
