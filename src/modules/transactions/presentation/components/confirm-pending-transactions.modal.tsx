import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Modal,
  Space,
  Spin,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import {
  DATE_ONLY_FORMAT,
  dateInputFormat,
  formatDateOnly,
  todayDateOnly,
} from '@/shared/date/date-only';
import { sumMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import {
  isSelectedByDefault,
  type PendingConfirmation,
} from '../../domain/transaction-confirmation.schema';
import type { TransactionType } from '../../domain/transaction.schema';
import {
  useConfirmPendingTransactions,
  usePendingConfirmations,
} from '../../infra/transactions.queries';
import { TransactionAmount } from './transaction-amount';

const PAGE_SIZE = 50;

interface ConfirmPendingTransactionsModalProps {
  open: boolean;
  until: string;
  onClose: () => void;
}

interface EffectiveDatePickerProps {
  label: string;
  value: string;
  disabled?: boolean;
  earliest?: string;
  invalid?: boolean;
  onChange: (date: string) => void;
}

const EffectiveDatePicker = ({
  label,
  value,
  disabled,
  earliest,
  invalid,
  onChange,
}: EffectiveDatePickerProps) => {
  const { i18n } = useTranslation();

  return (
    <DatePicker
      aria-label={label}
      allowClear={false}
      disabled={disabled}
      format={dateInputFormat(i18n.language)}
      status={invalid ? 'error' : undefined}
      value={dayjs(value)}
      disabledDate={(date) => {
        const candidate = date.format(DATE_ONLY_FORMAT);

        return (
          candidate > todayDateOnly() ||
          (earliest !== undefined && candidate < earliest)
        );
      }}
      onChange={(date: Dayjs | null) => {
        if (date) {
          onChange(date.format(DATE_ONLY_FORMAT));
        }
      }}
    />
  );
};

const totalOf = (rows: PendingConfirmation[], type: TransactionType) =>
  sumMoney(rows.filter((row) => row.type === type).map(({ amount }) => amount));

const SelectionSummary = ({
  selected,
  total,
}: {
  selected: PendingConfirmation[];
  total: number;
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('transactions.confirmPending.summary.label')}
    >
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 4 }}
        items={[
          {
            key: 'selected',
            label: t('transactions.confirmPending.summary.selected'),
            children: t('transactions.confirmPending.summary.selectedCount', {
              selected: selected.length,
              total,
            }),
          },
          {
            key: 'income',
            label: t('transactions.confirmPending.summary.income'),
            children: <MoneyText amount={totalOf(selected, 'INCOME')} />,
          },
          {
            key: 'expenses',
            label: t('transactions.confirmPending.summary.expenses'),
            children: <MoneyText amount={totalOf(selected, 'EXPENSE')} />,
          },
          {
            key: 'transfers',
            label: t('transactions.confirmPending.summary.transfers'),
            children: <MoneyText amount={totalOf(selected, 'TRANSFER')} />,
          },
        ]}
      />
    </div>
  );
};

interface PendingConfirmationReviewProps {
  items: PendingConfirmation[];
  mutation: ReturnType<typeof useConfirmPendingTransactions>;
  onClose: () => void;
}

const PendingConfirmationReview = ({
  items,
  mutation,
  onClose,
}: PendingConfirmationReviewProps) => {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const dueUuids = items.filter(isSelectedByDefault).map(({ uuid }) => uuid);
  const [selectedUuids, setSelectedUuids] = useState(new Set(dueUuids));
  const [defaultDate, setDefaultDate] = useState(todayDateOnly);
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>(
    {},
  );
  const [failures, setFailures] = useState(new Map<string, string>());
  const [tally, setTally] = useState({ confirmed: 0, alreadyCompleted: 0 });
  const submitting = useRef(false);

  const retrying = failures.size > 0;
  const rows = retrying
    ? items.filter(({ uuid }) => failures.has(uuid))
    : items;
  const selectedRows = rows.filter(({ uuid }) => selectedUuids.has(uuid));
  const effectiveDate = (uuid: string) => dateOverrides[uuid] ?? defaultDate;
  const today = todayDateOnly();
  const dateProblemOf = ({
    uuid,
    earliestCompletedOn,
  }: PendingConfirmation) => {
    const date = effectiveDate(uuid);

    if (date > today) {
      return t('transactions.confirmPending.dateInFuture');
    }

    return date < earliestCompletedOn
      ? t('transactions.confirmPending.dateBeforeOpening', {
          date: formatDateOnly(earliestCompletedOn, i18n.language),
        })
      : null;
  };

  const submit = () => {
    if (submitting.current) {
      return;
    }

    submitting.current = true;

    const selection = selectedRows.map(({ uuid }) => ({
      uuid,
      completedOn: effectiveDate(uuid),
    }));
    const sentUuids = new Set(selection.map(({ uuid }) => uuid));

    mutation.mutate(selection, {
      onSettled: () => {
        submitting.current = false;
      },
      onSuccess: (results) => {
        const countOf = (outcome: (typeof results)[number]['outcome']) =>
          results.filter((result) => result.outcome === outcome).length;
        const nextTally = {
          confirmed: tally.confirmed + countOf('CONFIRMED'),
          alreadyCompleted:
            tally.alreadyCompleted + countOf('ALREADY_COMPLETED'),
        };
        const nextFailures = new Map(
          [...failures].filter(([uuid]) => !sentUuids.has(uuid)),
        );

        for (const { uuid, outcome, message: reason } of results) {
          if (outcome === 'FAILED') {
            nextFailures.set(
              uuid,
              reason ?? t('transactions.confirmPending.failedFallback'),
            );
          }
        }

        if (nextFailures.size === 0) {
          message.success(t('transactions.confirmPending.success', nextTally));
          onClose();

          return;
        }

        setTally(nextTally);
        setFailures(nextFailures);
        setSelectedUuids(new Set(nextFailures.keys()));
      },
    });
  };

  const statusOf = ({ uuid, blockedReason, future }: PendingConfirmation) => {
    const failure = failures.get(uuid);

    if (failure) {
      return <Typography.Text type="danger">{failure}</Typography.Text>;
    }

    if (blockedReason) {
      return (
        <Typography.Text type="warning">
          {t(`transactions.confirmPending.blocked.${blockedReason}`)}
        </Typography.Text>
      );
    }

    return future ? (
      <Typography.Text type="secondary">
        {t('transactions.confirmPending.futureHint')}
      </Typography.Text>
    ) : null;
  };

  const columns: TableColumnsType<PendingConfirmation> = [
    {
      title: t('transactions.fields.date'),
      dataIndex: 'date',
      render: (_, { date, overdue, future }) => (
        <Space size="small" wrap>
          {formatDateOnly(date, i18n.language)}
          {overdue && <Tag color="error">{t('transactions.overdue')}</Tag>}
          {future && <Tag>{t('transactions.confirmPending.future')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('transactions.fields.description'),
      dataIndex: 'description',
      render: (_, { description, account, destinationAccount }) => (
        <Flex vertical>
          {description}
          <Typography.Text type="secondary">
            {destinationAccount
              ? t('transactions.transferRoute', {
                  from: account.name,
                  to: destinationAccount.name,
                })
              : account.name}
          </Typography.Text>
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
      title: t('transactions.confirmPending.effectiveDate'),
      key: 'effectiveDate',
      render: (_, row) => {
        const dateProblem = row.confirmable ? dateProblemOf(row) : null;

        return (
          <Flex vertical gap={4}>
            <EffectiveDatePicker
              label={t('transactions.confirmPending.rowDate', {
                description: row.description,
              })}
              value={effectiveDate(row.uuid)}
              disabled={!row.confirmable}
              earliest={row.earliestCompletedOn}
              invalid={dateProblem !== null}
              onChange={(date) => {
                setDateOverrides((current) => ({
                  ...current,
                  [row.uuid]: date,
                }));
              }}
            />
            {dateProblem && (
              <Typography.Text type="danger">{dateProblem}</Typography.Text>
            )}
          </Flex>
        );
      },
    },
    {
      title: t('transactions.confirmPending.status'),
      key: 'status',
      width: 280,
      render: (_, row) => statusOf(row),
    },
  ];

  const blockedByDate = selectedRows.some((row) => dateProblemOf(row) !== null);

  return (
    <Flex vertical gap="middle">
      <Typography.Text type="secondary">
        {t('transactions.confirmPending.hint')}
      </Typography.Text>
      <Alert
        type="info"
        showIcon
        title={t('transactions.confirmPending.excluded')}
      />
      {retrying && (
        <Alert
          type="warning"
          showIcon
          title={t('transactions.confirmPending.partial', {
            ...tally,
            failed: failures.size,
          })}
        />
      )}
      <Flex justify="space-between" align="center" gap="small" wrap>
        <Space size="small" wrap>
          <Typography.Text>
            {t('transactions.confirmPending.defaultDate')}
          </Typography.Text>
          <EffectiveDatePicker
            label={t('transactions.confirmPending.defaultDate')}
            value={defaultDate}
            onChange={setDefaultDate}
          />
        </Space>
        {!retrying && (
          <Space size="small" wrap>
            <Button
              size="small"
              onClick={() => {
                setSelectedUuids(new Set(dueUuids));
              }}
            >
              {t('transactions.confirmPending.selectDue')}
            </Button>
            <Button
              size="small"
              onClick={() => {
                setSelectedUuids(new Set());
              }}
            >
              {t('transactions.confirmPending.clear')}
            </Button>
          </Space>
        )}
      </Flex>
      <Table
        rowKey="uuid"
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: PAGE_SIZE,
          showSizeChanger: false,
          hideOnSinglePage: true,
        }}
        scroll={{ x: 'max-content' }}
        rowSelection={{
          hideSelectAll: true,
          preserveSelectedRowKeys: true,
          selectedRowKeys: [...selectedUuids],
          onChange: (keys) => {
            setSelectedUuids(new Set(keys.map(String)));
          },
          getCheckboxProps: ({ confirmable, description }) => ({
            disabled: !confirmable,
            'aria-label': t('transactions.confirmPending.selectRow', {
              description,
            }),
          }),
        }}
      />
      <SelectionSummary selected={selectedRows} total={rows.length} />
      <Flex justify="end" gap="small">
        <Button disabled={mutation.isPending} onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          type="primary"
          loading={mutation.isPending}
          disabled={selectedRows.length === 0 || blockedByDate}
          onClick={submit}
        >
          {t(
            retrying
              ? 'transactions.confirmPending.retry'
              : 'transactions.confirmPending.submit',
            { count: selectedRows.length },
          )}
        </Button>
      </Flex>
    </Flex>
  );
};

const PendingConfirmationContent = ({
  until,
  mutation,
  onClose,
}: Pick<ConfirmPendingTransactionsModalProps, 'until' | 'onClose'> &
  Pick<PendingConfirmationReviewProps, 'mutation'>) => {
  const { t } = useTranslation();
  const query = usePendingConfirmations(until);
  const [reviewItems, setReviewItems] = useState<PendingConfirmation[]>();
  const loadedItems = query.data?.items;

  if (!reviewItems && loadedItems?.length) {
    setReviewItems(loadedItems);

    return null;
  }

  if (reviewItems) {
    return (
      <PendingConfirmationReview
        items={reviewItems}
        mutation={mutation}
        onClose={onClose}
      />
    );
  }

  if (query.isPending) {
    return (
      <Flex justify="center">
        <Spin />
      </Flex>
    );
  }

  if (query.isError) {
    return (
      <Alert type="error" showIcon title={getApiErrorMessage(query.error)} />
    );
  }

  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={t('transactions.confirmPending.empty')}
    />
  );
};

export const ConfirmPendingTransactionsModal = ({
  open,
  until,
  onClose,
}: ConfirmPendingTransactionsModalProps) => {
  const { t } = useTranslation();
  const mutation = useConfirmPendingTransactions();

  return (
    <Modal
      open={open}
      title={t('transactions.confirmPending.title')}
      width={1040}
      footer={null}
      destroyOnHidden
      closable={!mutation.isPending}
      mask={{ closable: !mutation.isPending }}
      keyboard={!mutation.isPending}
      onCancel={onClose}
    >
      <PendingConfirmationContent
        until={until}
        mutation={mutation}
        onClose={onClose}
      />
    </Modal>
  );
};
