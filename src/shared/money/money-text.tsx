import { Typography } from 'antd';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, isNegativeMoney, isPositiveMoney } from './money';

type TextProps = ComponentProps<typeof Typography.Text>;

type MoneyTextProps = {
  amount: string;
  signed?: boolean;
} & Omit<TextProps, 'children'>;

const textType = (
  amount: string,
  signed: boolean,
  type: TextProps['type'],
): TextProps['type'] => {
  if (isNegativeMoney(amount)) {
    return 'danger';
  }

  return signed && isPositiveMoney(amount) ? 'success' : type;
};

export const MoneyText = ({
  amount,
  signed = false,
  type,
  ...props
}: MoneyTextProps) => {
  const { i18n } = useTranslation();

  return (
    <Typography.Text {...props} type={textType(amount, signed, type)}>
      {formatMoney(amount, i18n.language, signed ? 'exceptZero' : 'auto')}
    </Typography.Text>
  );
};
