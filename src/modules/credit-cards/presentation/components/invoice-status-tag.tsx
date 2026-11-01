import { Tag } from 'antd';
import type {
  CreditCardInvoice,
  CreditCardInvoiceStatus,
} from '../../domain/credit-card.schema';

const statusColors: Record<CreditCardInvoiceStatus, string | undefined> = {
  OPEN: 'processing',
  CLOSED: 'warning',
  OVERDUE: 'error',
  PAID: 'success',
};

type InvoiceStatusTagProps = Pick<CreditCardInvoice, 'status' | 'statusLabel'>;

export const InvoiceStatusTag = ({
  status,
  statusLabel,
}: InvoiceStatusTagProps) => (
  <Tag color={statusColors[status]}>{statusLabel}</Tag>
);
