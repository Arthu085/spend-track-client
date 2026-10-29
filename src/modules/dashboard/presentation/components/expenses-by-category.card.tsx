import { Badge, Card, Empty, Flex, Progress, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';
import type {
  DashboardAmounts,
  DashboardCategoryExpenses,
} from '../../domain/dashboard.schema';
import { displaySharePercent } from './share-percent';

interface ExpensesByCategoryCardProps {
  categories: DashboardCategoryExpenses[];
  expenses: DashboardAmounts;
}

export const ExpensesByCategoryCard = ({
  categories,
  expenses,
}: ExpensesByCategoryCardProps) => {
  const { t, i18n } = useTranslation();
  const money = (amount: string) => formatMoney(amount, i18n.language);

  return (
    <Card title={t('dashboard.expensesByCategory.title')}>
      {categories.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('dashboard.expensesByCategory.empty')}
        />
      ) : (
        <Flex vertical gap="middle">
          {categories.map(({ category, total, completed, pending }) => (
            <Flex key={category.uuid} vertical>
              <Flex justify="space-between" gap="middle">
                <Badge
                  color={category.color ?? undefined}
                  text={category.name}
                />
                <MoneyText amount={total} strong />
              </Flex>
              <Progress
                percent={displaySharePercent(total, expenses.total)}
                strokeColor={category.color ?? undefined}
                status="normal"
                aria-label={category.name}
              />
              <Typography.Text type="secondary">
                {t('dashboard.expensesByCategory.breakdown', {
                  completed: money(completed),
                  pending: money(pending),
                })}
              </Typography.Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
};
