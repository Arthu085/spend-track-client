import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';

export const MONEY_DECIMAL_PATTERN = /^-?\d{1,12}(\.\d{1,2})?$/;

export const CURRENCY = 'BRL';

export const moneySchema = z.string().regex(MONEY_DECIMAL_PATTERN);

export const moneyInputSchema = z
  .string({ error: () => i18n.t('validation.required') })
  .regex(MONEY_DECIMAL_PATTERN, { error: () => i18n.t('validation.money') });

export const isNegativeMoney = (amount: string): boolean =>
  amount.startsWith('-') && /[1-9]/.test(amount);

export const formatMoney = (amount: string, language: string): string =>
  new Intl.NumberFormat(language, {
    style: 'currency',
    currency: CURRENCY,
  }).format(Number(amount));
