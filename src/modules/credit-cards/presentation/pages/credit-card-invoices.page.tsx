import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { Flex, Space, type TableColumnsType, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { formatDateOnly } from '@/shared/date/date-only';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { PaginatedTable } from '@/shared/list/paginated-table';
import { useListParams } from '@/shared/list/use-list-params';
import { MoneyText } from '@/shared/money/money-text';
import type { CreditCardInvoice } from '../../domain/credit-card.schema';
import { useCreditCardInvoices } from '../../infra/credit-cards.queries';
import { CreditCardInvoiceModal } from '../components/credit-card-invoice.modal';
import { formatInvoiceMonth } from '../components/invoice-month';
import { InvoiceStatusTag } from '../components/invoice-status-tag';

const noFilters = {};

export const CreditCardInvoicesPage = () => {
  const { t, i18n } = useTranslation();
  const { uuid = '' } = useParams();
  const listParams = useListParams(noFilters);
  const { page, limit } = listParams;
  const invoicesQuery = useCreditCardInvoices(uuid, { page, limit });
  const viewing = useModalTarget<string>();
  const cardName = invoicesQuery.data?.data[0]?.card.name;
  const formatDate = (date: string) => formatDateOnly(date, i18n.language);

  const columns: TableColumnsType<CreditCardInvoice> = [
    {
      title: t('creditCards.fields.referenceMonth'),
      dataIndex: 'referenceMonth',
      render: (_, { referenceMonth }) =>
        formatInvoiceMonth(referenceMonth, i18n.language),
    },
    {
      title: t('creditCards.fields.closingDate'),
      dataIndex: 'closingDate',
      render: (_, { closingDate }) => formatDate(closingDate),
    },
    {
      title: t('creditCards.fields.dueDate'),
      dataIndex: 'dueDate',
      render: (_, { dueDate }) => formatDate(dueDate),
    },
    {
      title: t('creditCards.fields.total'),
      dataIndex: 'total',
      align: 'right',
      render: (_, { total }) => <MoneyText amount={total} />,
    },
    {
      title: t('creditCards.fields.paid'),
      dataIndex: 'paid',
      align: 'right',
      render: (_, { paid }) => <MoneyText amount={paid} />,
    },
    {
      title: t('creditCards.fields.outstanding'),
      dataIndex: 'outstanding',
      align: 'right',
      render: (_, { outstanding }) => <MoneyText amount={outstanding} strong />,
    },
    {
      title: t('creditCards.fields.status'),
      dataIndex: 'status',
      render: (_, invoice) => <InvoiceStatusTag {...invoice} />,
    },
    {
      title: t('creditCards.fields.actions'),
      key: 'actions',
      render: (_, { uuid: invoiceUuid, referenceMonth }) => (
        <IconActionButton
          size="small"
          icon={<EyeOutlined />}
          label={t('creditCards.actions.viewInvoice', {
            month: formatInvoiceMonth(referenceMonth, i18n.language),
          })}
          onClick={() => viewing.show(invoiceUuid)}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap="middle">
      <Space direction="vertical" size={0}>
        <Link to={AppRoutes.CREDIT_CARDS}>
          <ArrowLeftOutlined /> {t('creditCards.title')}
        </Link>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {cardName
            ? t('creditCards.invoices.titleOf', { name: cardName })
            : t('creditCards.invoices.title')}
        </Typography.Title>
      </Space>
      <PaginatedTable
        query={invoicesQuery}
        listParams={listParams}
        rowKey="uuid"
        columns={columns}
        locale={{ emptyText: t('creditCards.invoices.empty') }}
      />
      <CreditCardInvoiceModal
        open={viewing.open}
        invoiceUuid={viewing.target}
        onClose={viewing.close}
      />
    </Flex>
  );
};
