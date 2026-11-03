import { formatMonthLabel, monthRefOfDate } from '@/shared/date/month-ref';

export const formatInvoiceMonth = (referenceMonth: string, language: string) =>
  formatMonthLabel(monthRefOfDate(referenceMonth), language);
