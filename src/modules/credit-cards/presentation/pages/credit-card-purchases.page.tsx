import { CreditCardOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppRoutes } from '@/core/router/app-routes';
import { usePreferences } from '@/modules/preferences/infra/preferences.queries';
import { PageLoader } from '@/shared/components/page-loader';
import { todayDateOnly } from '@/shared/date/date-only';
import { MonthNavigator } from '@/shared/date/month-navigator';
import {
  monthDateRange,
  type MonthRef,
  monthRefOfDate,
  shiftMonth,
} from '@/shared/date/month-ref';
import { useMonthParam } from '@/shared/date/use-month-param';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { useListParams } from '@/shared/list/use-list-params';
import { creditCardPurchaseFiltersShape } from '../../domain/credit-card-form.schemas';
import type { CreditCardPurchase } from '../../domain/credit-card.schema';
import { useCreditCardPurchases } from '../../infra/credit-cards.queries';
import { CreditCardPurchaseFormModal } from '../components/credit-card-purchase-form.modal';
import { CreditCardPurchasesFilters } from '../components/credit-card-purchases-filters';
import { CreditCardPurchasesTable } from '../components/credit-card-purchases-table';
import { CreditCardRefundModal } from '../components/credit-card-refund.modal';

interface PurchasesOfMonthProps {
  month: MonthRef;
  currentMonth: MonthRef;
  onMonthChange: (month: MonthRef) => void;
}

const PurchasesOfMonth = ({
  month,
  currentMonth,
  onMonthChange,
}: PurchasesOfMonthProps) => {
  const { t } = useTranslation();
  const listParams = useListParams(creditCardPurchaseFiltersShape);
  const { page, limit, filters } = listParams;
  const purchasesQuery = useCreditCardPurchases({
    page,
    limit,
    ...monthDateRange(month),
    ...filters,
  });
  const editor = useModalTarget<CreditCardPurchase>();
  const refunding = useModalTarget<CreditCardPurchase>();

  return (
    <Flex vertical gap="middle">
      <Flex justify="space-between" align="center" gap="middle" wrap>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t('creditCards.purchases.title')}
        </Typography.Title>
        <Flex gap="middle" align="center" wrap>
          <Link to={AppRoutes.CREDIT_CARDS}>
            <CreditCardOutlined /> {t('creditCards.title')}
          </Link>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => editor.show()}
          >
            {t('creditCards.purchases.create.title')}
          </Button>
        </Flex>
      </Flex>
      <Card>
        <MonthNavigator
          value={month}
          current={currentMonth}
          onChange={onMonthChange}
        />
      </Card>
      <CreditCardPurchasesFilters listParams={listParams} />
      <CreditCardPurchasesTable
        query={purchasesQuery}
        listParams={listParams}
        onEdit={editor.show}
        onRefund={refunding.show}
      />
      <CreditCardPurchaseFormModal
        open={editor.open}
        purchase={editor.target}
        onClose={editor.close}
      />
      <CreditCardRefundModal
        open={refunding.open}
        purchase={refunding.target}
        onClose={refunding.close}
      />
    </Flex>
  );
};

export const CreditCardPurchasesPage = () => {
  const [selectedMonth, setMonth] = useMonthParam();
  const { data: preferences, isPending } = usePreferences();
  const currentMonth = monthRefOfDate(todayDateOnly());

  if (!selectedMonth && isPending) {
    return <PageLoader />;
  }

  const defaultMonth =
    preferences?.defaultMonth === 'NEXT'
      ? shiftMonth(currentMonth, 1)
      : currentMonth;

  return (
    <PurchasesOfMonth
      month={selectedMonth ?? defaultMonth}
      currentMonth={currentMonth}
      onMonthChange={setMonth}
    />
  );
};
