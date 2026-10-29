import { Typography } from 'antd';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, isNegativeMoney } from './money';

type MoneyTextProps = {
  amount: string;
} & Omit<ComponentProps<typeof Typography.Text>, 'children' | 'type'>;

export const MoneyText = ({ amount, ...props }: MoneyTextProps) => {
  const { i18n } = useTranslation();

  return (
    <Typography.Text
      {...props}
      type={isNegativeMoney(amount) ? 'danger' : undefined}
    >
      {formatMoney(amount, i18n.language)}
    </Typography.Text>
  );
};
