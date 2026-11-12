import { Alert, theme, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import type { CreditCardInvoice } from '@/modules/credit-cards/domain/credit-card.schema';
import {
  formatMoney,
  isNegativeMoney,
  isPositiveMoney,
  sumMoney,
} from '@/shared/money/money';
import type { Dashboard } from '../../domain/dashboard.schema';
import { budgetOfMonth, transactionsOfMonth } from './month-links';

interface AttentionItem {
  key: string;
  message: string;
  to: string;
  action: string;
}

const isAwaitingPayment = ({ status, outstanding }: CreditCardInvoice) =>
  status === 'CLOSED' && isPositiveMoney(outstanding);

const totalOutstanding = (invoices: CreditCardInvoice[]) =>
  sumMoney(invoices.map(({ outstanding }) => outstanding));

const useAttentionItems = (dashboard: Dashboard): AttentionItem[] => {
  const { t, i18n } = useTranslation();
  const money = (amount: string) => formatMoney(amount, i18n.language);
  const { balances, upcoming, creditCards, budget, period } = dashboard;

  const overdueTransactions = upcoming.filter(({ overdue }) => overdue);
  const overdueCharges = creditCards.plannedCharges.filter(
    ({ overdue }) => overdue,
  );
  const overdueInvoices = creditCards.invoices.filter(
    ({ status }) => status === 'OVERDUE',
  );
  const closedInvoices = creditCards.invoices.filter(isAwaitingPayment);
  const overspentCategories =
    budget?.categories.filter(({ overspent }) => isPositiveMoney(overspent)) ??
    [];
  const overall = budget?.overall;
  const reviewBudget = {
    to: budgetOfMonth(period),
    action: t('dashboard.attention.actions.budget'),
  };
  const viewInvoices = {
    to: AppRoutes.CREDIT_CARDS,
    action: t('dashboard.attention.actions.invoices'),
  };

  const items: (AttentionItem | false)[] = [
    isNegativeMoney(balances.available) && {
      key: 'shortfall',
      message: t('dashboard.balances.shortfall', {
        amount: money(balances.available.replace('-', '')),
      }),
      to: AppRoutes.ACCOUNTS,
      action: t('dashboard.attention.actions.accounts'),
    },
    overdueInvoices.length > 0 && {
      key: 'overdueInvoices',
      message: t('dashboard.attention.overdueInvoices', {
        count: overdueInvoices.length,
        amount: money(totalOutstanding(overdueInvoices)),
      }),
      ...viewInvoices,
    },
    overdueTransactions.length > 0 && {
      key: 'overdueTransactions',
      message: t('dashboard.attention.overdueTransactions', {
        count: overdueTransactions.length,
      }),
      to: transactionsOfMonth(period),
      action: t('dashboard.attention.actions.transactions'),
    },
    overdueCharges.length > 0 && {
      key: 'overdueCardCharges',
      message: t('dashboard.attention.overdueCardCharges', {
        count: overdueCharges.length,
      }),
      to: AppRoutes.RECURRENCES,
      action: t('dashboard.attention.actions.recurrences'),
    },
    closedInvoices.length > 0 && {
      key: 'closedInvoices',
      message: t('dashboard.attention.closedInvoices', {
        count: closedInvoices.length,
        amount: money(totalOutstanding(closedInvoices)),
      }),
      ...viewInvoices,
    },
    !!overall &&
      isPositiveMoney(overall.overspent) && {
        key: 'overallOverspent',
        message: t('dashboard.attention.overallOverspent', {
          amount: money(overall.overspent),
        }),
        ...reviewBudget,
      },
    overspentCategories.length > 0 && {
      key: 'categoriesOverspent',
      message: t('dashboard.attention.categoriesOverspent', {
        count: overspentCategories.length,
        categories: new Intl.ListFormat(i18n.language).format(
          overspentCategories.map(({ category }) => category.name),
        ),
      }),
      ...reviewBudget,
    },
  ];

  return items.filter((item) => item !== false);
};

interface AttentionStripProps {
  dashboard: Dashboard;
}

export const AttentionStrip = ({ dashboard }: AttentionStripProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const items = useAttentionItems(dashboard);

  if (items.length === 0) {
    return null;
  }

  return (
    <Alert
      type="warning"
      showIcon
      title={t('dashboard.attention.title')}
      description={
        <ul style={{ margin: 0, paddingInlineStart: token.paddingLG }}>
          {items.map(({ key, message, to, action }) => (
            <li key={key}>
              <Typography.Text>{message}</Typography.Text>{' '}
              <Link to={to}>{action}</Link>
            </li>
          ))}
        </ul>
      }
    />
  );
};
