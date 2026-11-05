import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';

export const MONEY_DECIMAL_PATTERN = /^-?\d{1,12}(\.\d{1,2})?$/;

export const CURRENCY = 'BRL';

export const moneySchema = z.string().regex(MONEY_DECIMAL_PATTERN);

export const moneyInputSchema = z
  .string({ error: () => i18n.t('validation.required') })
  .regex(MONEY_DECIMAL_PATTERN, { error: () => i18n.t('validation.money') });

export const isPositiveMoney = (amount: string): boolean =>
  !amount.startsWith('-') && /[1-9]/.test(amount);

export const positiveMoneyInputSchema = moneyInputSchema.refine(
  isPositiveMoney,
  { error: () => i18n.t('validation.positiveMoney') },
);

export const nonNegativeMoneyInputSchema = moneyInputSchema.refine(
  (amount) => !amount.startsWith('-'),
  { error: () => i18n.t('validation.nonNegativeMoney') },
);

export const isNegativeMoney = (amount: string): boolean =>
  amount.startsWith('-') && /[1-9]/.test(amount);

export const formatMoney = (amount: string, language: string): string =>
  new Intl.NumberFormat(language, {
    style: 'currency',
    currency: CURRENCY,
  }).format(Number(amount));

export const moneyToCents = (amount: string): number =>
  Math.round(Number(amount) * 100);

export const centsToMoney = (cents: number): string => (cents / 100).toFixed(2);

export const sumMoney = (amounts: readonly string[]): string =>
  centsToMoney(
    amounts.reduce((total, amount) => total + moneyToCents(amount), 0),
  );
