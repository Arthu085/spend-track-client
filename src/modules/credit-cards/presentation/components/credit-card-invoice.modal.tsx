import {
  DollarOutlined,
  HistoryOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Descriptions,
  Flex,
  Modal,
  Skeleton,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type {
  CreditCardInvoiceDetail,
  CreditCardPayment,
  CreditCardRefund,
} from '../../domain/credit-card.schema';
import { isHistoricalSettlement } from '../../domain/credit-card.schema';
import {
  useCancelCreditCardPayment,
  useCreditCardInvoice,
} from '../../infra/credit-cards.queries';
import { formatInvoiceMonth } from './invoice-month';
import { InvoiceStatusTag } from './invoice-status-tag';
import { PayInvoiceModal } from './pay-invoice.modal';
import { RecordHistoricalPaymentModal } from './record-historical-payment.modal';

type Charge = CreditCardInvoiceDetail['chargeEntries'][number];

interface CreditCardInvoiceModalProps {
  open: boolean;
  invoiceUuid?: string;
  onClose: () => void;
}

export const CreditCardInvoiceModal = ({
  open,
  invoiceUuid,
  onClose,
}: CreditCardInvoiceModalProps) => {
  const { t, i18n } = useTranslation();
  const { showError, confirmWarning } = useFeedbackModal();
  const {
    data: invoice,
    error,
    isPending,
  } = useCreditCardInvoice(open ? invoiceUuid : undefined);
  const cancelMutation = useCancelCreditCardPayment();
  const paying = useModalTarget<CreditCardInvoiceDetail>();
  const settling = useModalTarget<CreditCardInvoiceDetail>();
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);

  const cancelPayment = (payment: CreditCardPayment) => {
    const copy = isHistoricalSettlement(payment)
      ? 'cancelSettlement'
      : 'cancelPayment';

    confirmWarning({
      title: t(`creditCards.${copy}.title`),
      content: t(`creditCards.${copy}.description`),
      okText: t(`creditCards.${copy}.confirm`),
      onOk: () => {
        cancelMutation.mutate(
          { invoiceUuid: payment.invoice.uuid, paymentUuid: payment.uuid },
          { onError: showError },
        );
      },
    });
  };

  const chargeColumns: TableColumnsType<Charge> = [
    {
      title: t('creditCards.fields.date'),
      dataIndex: 'date',
      render: (_, { date }) => formatDate(date),
    },
    {
      title: t('creditCards.fields.description'),
      dataIndex: 'description',
      render: (
        _,
        { description, category, installmentNumber, installmentCount },
      ) => (
        <Flex vertical>
          <span>
            {description}
            {installmentCount > 1 &&
              ` ${t('creditCards.installmentOf', {
                number: installmentNumber,
                count: installmentCount,
              })}`}
          </span>
          <Badge color={category.color ?? undefined} text={category.name} />
        </Flex>
      ),
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={amount} />,
    },
  ];

  const refundColumns: TableColumnsType<CreditCardRefund> = [
    {
      title: t('creditCards.fields.date'),
      dataIndex: 'date',
      render: (_, { date }) => formatDate(date),
    },
    {
      title: t('creditCards.fields.description'),
      key: 'purchase',
      render: (_, { purchase }) => purchase.description,
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={`-${amount}`} />,
    },
  ];

  const paymentColumns: TableColumnsType<CreditCardPayment> = [
    {
      title: t('creditCards.fields.paidOn'),
      dataIndex: 'paidOn',
      render: (_, payment) => (
        <Flex gap="small" wrap>
          {formatDate(payment.paidOn)}
          {isHistoricalSettlement(payment) && (
            <Tag color="purple">{payment.sourceLabel}</Tag>
          )}
          {payment.canceledAt && <Tag>{t('creditCards.paymentCanceled')}</Tag>}
        </Flex>
      ),
    },
    {
      title: t('creditCards.fields.account'),
      key: 'account',
      render: (_, { account }) => account.name,
    },
    {
      title: t('creditCards.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount, canceledAt }) => (
        <MoneyText amount={amount} delete={canceledAt !== null} />
      ),
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, payment) =>
        payment.canceledAt === null && (
          <IconActionButton
            size="small"
            icon={<StopOutlined />}
            label={t(
              isHistoricalSettlement(payment)
                ? 'creditCards.actions.cancelSettlement'
                : 'creditCards.actions.cancelPayment',
              { amount: payment.amount },
            )}
            loading={
              cancelMutation.isPending &&
              cancelMutation.variables.paymentUuid === payment.uuid
            }
            onClick={() => cancelPayment(payment)}
          />
        ),
    },
  ];

  const section = (title: string) => (
    <Typography.Title level={5} style={{ marginTop: 16 }}>
      {title}
    </Typography.Title>
  );

  return (
    <Modal
      open={open}
      title={
        invoice
          ? t('creditCards.invoice.title', {
              card: invoice.card.name,
              month: formatInvoiceMonth(invoice.referenceMonth, i18n.language),
            })
          : t('creditCards.invoices.title')
      }
      width={760}
      footer={(_, { CancelBtn }) => <CancelBtn />}
      cancelText={t('common.close')}
      onCancel={onClose}
      destroyOnHidden
    >
      {error && !invoice && (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      )}
      {isPending && open && <Skeleton active />}
      {invoice && (
        <Flex vertical gap="small">
          <Flex justify="space-between" align="center" gap="middle" wrap>
            <InvoiceStatusTag {...invoice} />
            <Flex gap="small" wrap>
              <Button
                icon={<HistoryOutlined />}
                disabled={!isPositiveMoney(invoice.outstanding)}
                onClick={() => settling.show(invoice)}
              >
                {t('creditCards.historical.title')}
              </Button>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                disabled={!isPositiveMoney(invoice.outstanding)}
                onClick={() => paying.show(invoice)}
              >
                {t('creditCards.pay.title')}
              </Button>
            </Flex>
          </Flex>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: 'closingDate',
                label: t('creditCards.fields.closingDate'),
                children: formatDate(invoice.closingDate),
              },
              {
                key: 'dueDate',
                label: t('creditCards.fields.dueDate'),
                children: formatDate(invoice.dueDate),
              },
              {
                key: 'charges',
                label: t('creditCards.fields.charges'),
                children: <MoneyText amount={invoice.charges} />,
              },
              {
                key: 'refunds',
                label: t('creditCards.fields.refunds'),
                children: <MoneyText amount={invoice.refunds} />,
              },
              {
                key: 'previousCredit',
                label: t('creditCards.fields.previousCredit'),
                children: <MoneyText amount={invoice.previousCredit} />,
              },
              {
                key: 'total',
                label: t('creditCards.fields.total'),
                children: <MoneyText amount={invoice.total} strong />,
              },
              {
                key: 'paid',
                label: t('creditCards.fields.paid'),
                children: <MoneyText amount={invoice.paid} />,
              },
              ...(isPositiveMoney(invoice.historicalPaid)
                ? [
                    {
                      key: 'historicalPaid',
                      label: t('creditCards.fields.historicalPaid'),
                      children: (
                        <MoneyText
                          amount={invoice.historicalPaid}
                          aria-label={t('creditCards.fields.historicalPaid')}
                        />
                      ),
                    },
                  ]
                : []),
              {
                key: 'outstanding',
                label: t('creditCards.fields.outstanding'),
                children: (
                  <MoneyText
                    amount={invoice.outstanding}
                    strong
                    aria-label={t('creditCards.fields.outstanding')}
                  />
                ),
              },
            ]}
          />
          {isPositiveMoney(invoice.creditCarried) && (
            <Alert
              type="info"
              showIcon
              title={t('creditCards.invoice.creditCarried', {
                amount: invoice.creditCarried,
              })}
            />
          )}
          {section(t('creditCards.invoice.charges'))}
          <Table
            rowKey={({ purchaseUuid, installmentNumber }) =>
              `${purchaseUuid}-${installmentNumber}`
            }
            size="small"
            pagination={false}
            columns={chargeColumns}
            dataSource={invoice.chargeEntries}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: t('creditCards.invoice.noCharges') }}
          />
          {invoice.refundEntries.length > 0 && (
            <>
              {section(t('creditCards.invoice.refunds'))}
              <Table
                rowKey="uuid"
                size="small"
                pagination={false}
                columns={refundColumns}
                dataSource={invoice.refundEntries}
                scroll={{ x: 'max-content' }}
              />
            </>
          )}
          {section(t('creditCards.invoice.payments'))}
          <Table
            rowKey="uuid"
            size="small"
            pagination={false}
            columns={paymentColumns}
            dataSource={invoice.payments}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: t('creditCards.invoice.noPayments') }}
          />
        </Flex>
      )}
      <PayInvoiceModal
        open={paying.open}
        invoice={paying.target}
        onClose={paying.close}
      />
      <RecordHistoricalPaymentModal
        open={settling.open}
        invoice={settling.target}
        onClose={settling.close}
      />
    </Modal>
  );
};
