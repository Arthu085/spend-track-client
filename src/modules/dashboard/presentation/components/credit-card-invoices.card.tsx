import { EyeOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Flex,
  Table,
  type TableColumnsType,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import type { CreditCardInvoice } from '@/modules/credit-cards/domain/credit-card.schema';
import { CreditCardInvoiceModal } from '@/modules/credit-cards/presentation/components/credit-card-invoice.modal';
import { formatInvoiceMonth } from '@/modules/credit-cards/presentation/components/invoice-month';
import { InvoiceStatusTag } from '@/modules/credit-cards/presentation/components/invoice-status-tag';
import { formatDateOnly } from '@/shared/date/date-only';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type { DashboardCreditCards } from '../../domain/dashboard.schema';

interface CreditCardInvoicesCardProps {
  creditCards: DashboardCreditCards;
}

export const CreditCardInvoicesCard = ({
  creditCards,
}: CreditCardInvoicesCardProps) => {
  const { t, i18n } = useTranslation();
  const viewing = useModalTarget<string>();

  const columns: TableColumnsType<CreditCardInvoice> = [
    {
      title: t('creditCards.fields.card'),
      key: 'card',
      render: (_, { card, referenceMonth }) => (
        <Flex vertical>
          {card.name}
          <Typography.Text type="secondary">
            {formatInvoiceMonth(referenceMonth, i18n.language)}
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
      render: (_, { uuid, card, referenceMonth }) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          aria-label={t('creditCards.actions.viewInvoiceOf', {
            card: card.name,
            month: formatInvoiceMonth(referenceMonth, i18n.language),
          })}
          onClick={() => viewing.show(uuid)}
        />
      ),
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
          </Typography.Text>
          <Typography.Text>
            {t('dashboard.creditCards.outstanding')}{' '}
            <MoneyText
              amount={creditCards.outstanding}
              strong
              aria-label={t('dashboard.creditCards.outstanding')}
            />
          </Typography.Text>
          {isPositiveMoney(creditCards.planned) && (
            <Typography.Text>
              {t('dashboard.creditCards.planned')}{' '}
              <MoneyText
                amount={creditCards.planned}
                strong
                aria-label={t('dashboard.creditCards.planned')}
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
          <Table
            rowKey="uuid"
            size="small"
            pagination={false}
            columns={columns}
            dataSource={creditCards.invoices}
            scroll={{ x: 'max-content' }}
          />
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
