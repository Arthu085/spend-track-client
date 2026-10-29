import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  isNegativeMoney,
  moneyInputSchema,
  moneySchema,
} from '../money';

describe('money', () => {
  it.each(['0', '1500.00', '-20.5', '999999999999.99'])(
    'accepts the API amount %s',
    (amount) => {
      expect(moneySchema.safeParse(amount).success).toBe(true);
    },
  );

  it.each(['1.005', '1,50', '', '1e3'])('rejects the amount %p', (amount) => {
    expect(moneyInputSchema.safeParse(amount).success).toBe(false);
  });

  it('formats amounts as BRL in the given language', () => {
    expect(formatMoney('-1234.5', 'pt-BR').replace(/\s/g, ' ')).toBe(
      '-R$ 1.234,50',
    );
    expect(formatMoney('1234.5', 'en')).toBe('R$1,234.50');
  });

  it.each([
    ['-0.01', true],
    ['-0.00', false],
    ['0.00', false],
    ['10.00', false],
  ])('tells whether %s is negative', (amount, negative) => {
    expect(isNegativeMoney(amount)).toBe(negative);
  });
});
