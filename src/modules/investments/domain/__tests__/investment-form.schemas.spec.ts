import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import {
  investmentFormSchema,
  investmentMovementFormSchema,
  investmentValuationFormSchema,
  toInvestmentMovementPayload,
  toInvestmentPayload,
  toInvestmentValuationPayload,
} from '../investment-form.schemas';

const accountUuid = '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f';

describe('investment form schemas', () => {
  it('sends an empty target as null', () => {
    const form = investmentFormSchema.parse({
      name: 'Reserva de emergência',
      type: 'RESERVE',
      targetAmount: undefined,
    });

    expect(toInvestmentPayload(form)).toEqual({
      name: 'Reserva de emergência',
      type: 'RESERVE',
      targetAmount: null,
    });
  });

  it('rejects a target of zero', () => {
    const result = investmentFormSchema.safeParse({
      name: 'Viagem',
      type: 'GOAL',
      targetAmount: '0',
    });

    expect(result.error?.issues[0].message).toBe(
      i18n.t('validation.positiveMoney'),
    );
  });

  it('builds a contribution payload with the date as a plain day', () => {
    const form = investmentMovementFormSchema.parse({
      accountUuid,
      amount: '250.5',
      date: dayjs('2026-10-15'),
      state: 'PLANNED',
    });

    expect(toInvestmentMovementPayload('CONTRIBUTION', form)).toEqual({
      type: 'CONTRIBUTION',
      accountUuid,
      amount: '250.5',
      date: '2026-10-15',
      state: 'PLANNED',
    });
  });

  it('requires a positive movement amount', () => {
    const result = investmentMovementFormSchema.safeParse({
      accountUuid,
      amount: '-10',
      date: dayjs('2026-10-15'),
      state: 'COMPLETED',
    });

    expect(result.error?.issues[0].message).toBe(
      i18n.t('validation.positiveMoney'),
    );
  });

  it('accepts a valuation of zero but not a negative one', () => {
    const date = dayjs('2026-10-20');

    expect(
      toInvestmentValuationPayload(
        investmentValuationFormSchema.parse({ value: '0', date }),
      ),
    ).toEqual({ value: '0', date: '2026-10-20' });
    expect(
      investmentValuationFormSchema.safeParse({ value: '-1', date }).error
        ?.issues[0].message,
    ).toBe(i18n.t('validation.nonNegativeMoney'));
  });
});
