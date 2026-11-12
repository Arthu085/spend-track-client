import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  isNegativeMoney,
  isPositiveMoney,
  moneyInputSchema,
  moneySchema,
  positiveMoneyInputSchema,
  subtractMoney,
  sumMoney,
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

  it('formats signed amounts with an explicit sign except for zero', () => {
    expect(formatMoney('1234.5', 'en', 'exceptZero')).toBe('+R$1,234.50');
    expect(formatMoney('-1234.5', 'en', 'exceptZero')).toBe('-R$1,234.50');
    expect(formatMoney('0.00', 'en', 'exceptZero')).toBe('R$0.00');
  });

  it.each([
    ['-0.01', true],
    ['-0.00', false],
    ['0.00', false],
    ['10.00', false],
  ])('tells whether %s is negative', (amount, negative) => {
    expect(isNegativeMoney(amount)).toBe(negative);
  });

  it.each([
    ['0.01', true],
    ['250.40', true],
    ['0.00', false],
    ['0', false],
    ['-5.00', false],
  ])('tells whether %s is positive', (amount, positive) => {
    expect(isPositiveMoney(amount)).toBe(positive);
    expect(positiveMoneyInputSchema.safeParse(amount).success).toBe(positive);
  });
});

describe('sumMoney', () => {
  it('adds decimal amounts without binary rounding errors', () => {
    expect(sumMoney(['0.10', '0.20', '1000000.01'])).toBe('1000000.31');
  });

  it('answers zero for no amounts', () => {
    expect(sumMoney([])).toBe('0.00');
  });
});

describe('subtractMoney', () => {
  it('subtracts decimal amounts without binary rounding errors', () => {
    expect(subtractMoney('0.30', '0.10')).toBe('0.20');
    expect(subtractMoney('1000.00', '1250.45')).toBe('-250.45');
  });

  it('answers zero for equal amounts', () => {
    expect(subtractMoney('10.10', '10.10')).toBe('0.00');
  });
});
