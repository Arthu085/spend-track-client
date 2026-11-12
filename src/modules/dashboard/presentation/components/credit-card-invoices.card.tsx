import { EyeOutlined } from '@ant-design/icons';
import { Card, Empty, Flex, type TableColumnsType, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import type { CreditCardInvoice } from '@/modules/credit-cards/domain/credit-card.schema';
import { CreditCardInvoiceModal } from '@/modules/credit-cards/presentation/components/credit-card-invoice.modal';
import { formatInvoiceMonth } from '@/modules/credit-cards/presentation/components/invoice-month';
import { InvoiceStatusTag } from '@/modules/credit-cards/presentation/components/invoice-status-tag';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { formatMoney, isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type {
  DashboardCreditCards,
  DashboardPlannedCardCharge,
} from '../../domain/dashboard.schema';
import { PlannedDate } from './planned-date';
import { ResponsiveTable } from './responsive-table';

interface CreditCardInvoicesCardProps {
  creditCards: DashboardCreditCards;
}

export const CreditCardInvoicesCard = ({
  creditCards,
}: CreditCardInvoicesCardProps) => {
  const { t, i18n } = useTranslation();
  const viewing = useModalTarget<string>();

  const invoiceMonth = ({ referenceMonth }: CreditCardInvoice) =>
    formatInvoiceMonth(referenceMonth, i18n.language);

  const viewAction = (invoice: CreditCardInvoice) => (
    <IconActionButton
      size="small"
      icon={<EyeOutlined />}
      label={t('creditCards.actions.viewInvoiceOf', {
        card: invoice.card.name,
        month: invoiceMonth(invoice),
      })}
      onClick={() => viewing.show(invoice.uuid)}
    />
  );

  const chargeRoute = ({ card, invoiceMonth }: DashboardPlannedCardCharge) =>
    `${card.name} · ${formatInvoiceMonth(invoiceMonth, i18n.language)}`;

  const columns: TableColumnsType<CreditCardInvoice> = [
    {
      title: t('creditCards.fields.card'),
      key: 'card',
      render: (_, invoice) => (
        <Flex vertical>
          {invoice.card.name}
          <Typography.Text type="secondary">
            {invoiceMonth(invoice)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('creditCards.fields.dueDate'),
      dataIndex: 'dueDate',
      render: (_, { dueDate }) => formatDateOnly(dueDate, i18n.language),
    },
    {
      title: t('creditCards.fields.status'),
      dataIndex: 'status',
      render: (_, invoice) => <InvoiceStatusTag {...invoice} />,
    },
    {
      title: t('creditCards.fields.outstanding'),
      dataIndex: 'outstanding',
      align: 'right',
      render: (_, { outstanding }) => <MoneyText amount={outstanding} strong />,
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, invoice) => viewAction(invoice),
    },
  ];

  const plannedColumns: TableColumnsType<DashboardPlannedCardCharge> = [
    {
      title: t('transactions.fields.date'),
      dataIndex: 'date',
      render: (_, { date, overdue }) => (
        <PlannedDate date={date} overdue={overdue} />
      ),
    },
    {
      title: t('transactions.fields.description'),
      dataIndex: 'description',
      render: (_, charge) => (
        <Flex vertical>
          {charge.description}
          <Typography.Text type="secondary">
            {chargeRoute(charge)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t('transactions.fields.amount'),
      dataIndex: 'amount',
      align: 'right',
      render: (_, { amount }) => <MoneyText amount={amount} strong />,
    },
  ];

  return (
    <Card
      title={t('dashboard.creditCards.title')}
      extra={
        <Link to={AppRoutes.CREDIT_CARDS}>
          {t('dashboard.creditCards.manage')}
        </Link>
      }
    >
      <Flex vertical gap="small">
        <Flex gap="large" wrap>
          <Typography.Text>
            {t('dashboard.creditCards.spending')}{' '}
            <MoneyText
              amount={creditCards.spending}
              strong
              aria-label={t('dashboard.creditCards.spending')}
            />
            {isPositiveMoney(creditCards.planned) && (
              <Typography.Text type="secondary">
                {' '}
                {t('dashboard.creditCards.spendingPlanned', {
                  amount: formatMoney(creditCards.planned, i18n.language),
                })}
              </Typography.Text>
            )}
          </Typography.Text>
          <Typography.Text>
            {t('dashboard.creditCards.outstanding')}{' '}
            <MoneyText
              amount={creditCards.outstanding}
              strong
              aria-label={t('dashboard.creditCards.outstanding')}
            />
          </Typography.Text>
          {isPositiveMoney(creditCards.plannedDue) && (
            <Typography.Text>
              {t('dashboard.creditCards.plannedDue')}{' '}
              <MoneyText
                amount={creditCards.plannedDue}
                strong
                aria-label={t('dashboard.creditCards.plannedDue')}
              />
            </Typography.Text>
          )}
        </Flex>
        {creditCards.invoices.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.creditCards.empty')}
          />
        ) : (
          <ResponsiveTable
            columns={columns}
            dataSource={creditCards.invoices}
            compactRow={(invoice) => ({
              title: invoice.card.name,
              description: invoiceMonth(invoice),
              amount: <MoneyText amount={invoice.outstanding} strong />,
              action: viewAction(invoice),
              extra: (
                <Flex align="center" gap="small" wrap>
                  <Typography.Text type="secondary">
                    {t('dashboard.creditCards.dueOn', {
                      date: formatDateOnly(invoice.dueDate, i18n.language),
                    })}
                  </Typography.Text>
                  <InvoiceStatusTag {...invoice} />
                </Flex>
              ),
            })}
          />
        )}
        {creditCards.plannedCharges.length > 0 && (
          <>
            <Flex justify="space-between" gap="middle" wrap>
              <Typography.Text type="secondary">
                {t('dashboard.creditCards.plannedHint')}
              </Typography.Text>
              <Link to={AppRoutes.RECURRENCES}>
                {t('dashboard.creditCards.manageRecurrences')}
              </Link>
            </Flex>
            <ResponsiveTable
              columns={plannedColumns}
              dataSource={creditCards.plannedCharges}
              compactRow={(charge) => ({
                title: charge.description,
                description: chargeRoute(charge),
                amount: <MoneyText amount={charge.amount} strong />,
                extra: (
                  <PlannedDate date={charge.date} overdue={charge.overdue} />
                ),
              })}
            />
            {creditCards.plannedChargesCount >
              creditCards.plannedCharges.length && (
              <Typography.Text type="secondary">
                {t('dashboard.upcoming.partial', {
                  shown: creditCards.plannedCharges.length,
                  count: creditCards.plannedChargesCount,
                })}
              </Typography.Text>
            )}
          </>
        )}
      </Flex>
      <CreditCardInvoiceModal
        open={viewing.open}
        invoiceUuid={viewing.target}
        onClose={viewing.close}
      />
    </Card>
  );
};
