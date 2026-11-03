import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { buildCreditCardPurchase } from '@/test/credit-card-fixture';
import {
  creditCardFormSchema,
  creditCardPurchaseFormSchema,
  toCreateCreditCardPurchasePayload,
  toCreditCardPaymentPayload,
  toCreditCardRefundPayload,
  toUpdateCreditCardPurchasePayload,
} from '../credit-card-form.schemas';

describe('credit card form schemas', () => {
  it('rejects billing days outside 1–31 and a negative limit', () => {
    const base = { name: 'Visa', creditLimit: '0', closingDay: 5, dueDay: 12 };

    expect(creditCardFormSchema.safeParse(base).success).toBe(true);
    expect(
      creditCardFormSchema.safeParse({ ...base, closingDay: 32 }).success,
    ).toBe(false);
    expect(
      creditCardFormSchema.safeParse({ ...base, creditLimit: '-1' }).success,
    ).toBe(false);
  });

  it('accepts between 1 and 48 installments', () => {
    const base = {
      cardUuid: 'card',
      categoryUuid: 'category',
      description: 'Tênis',
      amount: '300',
      purchaseDate: dayjs('2026-10-29'),
    };

    expect(
      creditCardPurchaseFormSchema.safeParse({ ...base, installmentCount: 48 })
        .success,
    ).toBe(true);
    expect(
      creditCardPurchaseFormSchema.safeParse({ ...base, installmentCount: 49 })
        .success,
    ).toBe(false);
  });

  it('builds payloads with date-only strings and without empty notes', () => {
    expect(
      toCreateCreditCardPurchasePayload({
        cardUuid: 'card',
        categoryUuid: 'category',
        description: 'Tênis',
        amount: '300.00',
        purchaseDate: dayjs('2026-10-29'),
        installmentCount: 3,
        notes: '  ',
      }),
    ).toEqual({
      cardUuid: 'card',
      categoryUuid: 'category',
      description: 'Tênis',
      amount: '300.00',
      purchaseDate: '2026-10-29',
      installmentCount: 3,
      notes: undefined,
    });
    expect(
      toCreditCardRefundPayload({ amount: '10', date: dayjs('2026-11-02') }),
    ).toEqual({ amount: '10', date: '2026-11-02', notes: undefined });
    expect(
      toCreditCardPaymentPayload({
        accountUuid: 'bank',
        amount: '10',
        paidOn: dayjs('2026-11-12'),
      }),
    ).toEqual({ accountUuid: 'bank', amount: '10', paidOn: '2026-11-12' });
  });

  it('sends the category of an edited purchase only when it changed', () => {
    const purchase = buildCreditCardPurchase();

    expect(
      toUpdateCreditCardPurchasePayload(
        {
          description: 'Tênis',
          categoryUuid: purchase.category.uuid,
          notes: 'gift',
        },
        purchase,
      ),
    ).toEqual({ description: 'Tênis', categoryUuid: undefined, notes: 'gift' });
    expect(
      toUpdateCreditCardPurchasePayload(
        { description: 'Tênis', categoryUuid: 'other', notes: null },
        purchase,
      ).categoryUuid,
    ).toBe('other');
  });
});
