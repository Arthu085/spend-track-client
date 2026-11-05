import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  buildRecurrence,
  buildRecurrenceOccurrence,
} from '@/test/recurrence-fixture';
import {
  isMovedPastRecurrenceEnd,
  toAdditionalContributionPayload,
  type RecurrenceForm,
  recurrenceFormSchema,
  toCreateRecurrencePayload,
  toEndRecurrencePayload,
  toOccurrencePayload,
  toUpdateRecurrencePayload,
} from '../recurrence-form.schemas';
import {
  recurrenceOccurrenceSchema,
  recurrenceSchema,
} from '../recurrence.schema';

const form: RecurrenceForm = {
  type: 'EXPENSE',
  target: 'CREDIT_CARD',
  description: 'Netflix',
  amount: '55.90',
  frequency: 'MONTHLY',
  startDate: dayjs('2026-10-15'),
  endDate: null,
  accountUuid: 'account-1',
  creditCardUuid: 'card-1',
  categoryUuid: 'category-1',
  notes: '  ',
};

describe('recurrence schemas', () => {
  it('parses card and account recurrences and their occurrences', () => {
    expect(recurrenceSchema.safeParse(buildRecurrence()).success).toBe(true);
    expect(
      recurrenceSchema.safeParse(
        buildRecurrence({
          type: 'INCOME',
          creditCard: null,
          account: { uuid: 'account-1', name: 'Nubank', status: 'ACTIVE' },
        }),
      ).success,
    ).toBe(true);
    expect(
      recurrenceSchema.safeParse({ ...buildRecurrence(), frequency: 'DAILY' })
        .success,
    ).toBe(false);
    expect(
      recurrenceOccurrenceSchema.safeParse(
        buildRecurrenceOccurrence({ invoiceMonth: null }),
      ).success,
    ).toBe(true);
  });
});

describe('recurrence form schemas', () => {
  it('requires a description, a positive amount, and a start date', () => {
    expect(recurrenceFormSchema.safeParse(form).success).toBe(true);
    expect(
      recurrenceFormSchema.safeParse({ ...form, description: ' ' }).success,
    ).toBe(false);
    expect(
      recurrenceFormSchema.safeParse({ ...form, amount: '0' }).success,
    ).toBe(false);
    expect(
      recurrenceFormSchema.safeParse({ ...form, startDate: undefined }).success,
    ).toBe(false);
  });

  it('sends only the chosen target and drops empty notes', () => {
    expect(toCreateRecurrencePayload(form)).toEqual({
      type: 'EXPENSE',
      description: 'Netflix',
      amount: '55.90',
      frequency: 'MONTHLY',
      startDate: '2026-10-15',
      endDate: undefined,
      accountUuid: undefined,
      creditCardUuid: 'card-1',
      categoryUuid: 'category-1',
      notes: undefined,
    });
    expect(
      toCreateRecurrencePayload({
        ...form,
        type: 'INCOME',
        endDate: dayjs('2027-10-15'),
      }),
    ).toMatchObject({
      endDate: '2027-10-15',
      accountUuid: 'account-1',
      creditCardUuid: undefined,
    });
  });

  it('sends the update scope and only changed references', () => {
    const recurrence = buildRecurrence({
      account: { uuid: 'account-1', name: 'Nubank', status: 'ACTIVE' },
      creditCard: null,
    });
    const edit = {
      scope: 'FUTURE' as const,
      from: dayjs('2026-12-01'),
      description: 'Netflix',
      amount: '59.90',
      accountUuid: 'account-1',
      categoryUuid: recurrence.category?.uuid,
      notes: null,
    };

    expect(toUpdateRecurrencePayload(edit, recurrence)).toEqual({
      scope: 'FUTURE',
      from: '2026-12-01',
      description: 'Netflix',
      amount: '59.90',
      categoryUuid: undefined,
      accountUuid: undefined,
      notes: null,
    });
    expect(
      toUpdateRecurrencePayload(
        { ...edit, scope: 'ALL', accountUuid: 'account-2' },
        recurrence,
      ),
    ).toMatchObject({
      scope: 'ALL',
      from: undefined,
      accountUuid: 'account-2',
    });
  });

  it('ends from a date, from the first day of an invoice month, or entirely', () => {
    expect(
      toEndRecurrencePayload({ mode: 'FROM_DATE', from: dayjs('2026-11-20') }),
    ).toEqual({ from: '2026-11-20' });
    expect(
      toEndRecurrencePayload({
        mode: 'FROM_INVOICE_MONTH',
        fromInvoiceMonth: dayjs('2026-12-17'),
      }),
    ).toEqual({ fromInvoiceMonth: '2026-12-01' });
    expect(
      toEndRecurrencePayload({ mode: 'ENTIRE', from: dayjs('2026-11-20') }),
    ).toEqual({});
  });

  it('flags only a planned date moved past the end of the recurrence', () => {
    const occurrence = { date: '2026-10-20' };
    const bounded = { endDate: '2026-10-28' };

    expect(
      isMovedPastRecurrenceEnd(dayjs('2026-10-29'), occurrence, bounded),
    ).toBe(true);
    expect(
      isMovedPastRecurrenceEnd(dayjs('2026-10-28'), occurrence, bounded),
    ).toBe(false);
    expect(
      isMovedPastRecurrenceEnd(
        dayjs('2026-11-02'),
        { date: '2026-11-02' },
        bounded,
      ),
    ).toBe(false);
    expect(
      isMovedPastRecurrenceEnd(dayjs('2099-01-01'), occurrence, {
        endDate: null,
      }),
    ).toBe(false);
  });

  it('builds occurrence payloads with date-only strings', () => {
    expect(
      toOccurrencePayload({ amount: '60.00', date: dayjs('2026-11-16') }),
    ).toEqual({ amount: '60.00', date: '2026-11-16' });
  });
});

describe('investment contribution recurrences', () => {
  const contributionForm: RecurrenceForm = {
    type: 'INVESTMENT_CONTRIBUTION',
    target: 'ACCOUNT',
    description: 'Reserva',
    amount: '700.00',
    frequency: 'MONTHLY',
    startDate: dayjs('2026-10-15'),
    endDate: null,
    accountUuid: 'account-1',
    investmentUuid: 'investment-1',
    notes: null,
  };
  const contribution = buildRecurrence({
    type: 'INVESTMENT_CONTRIBUTION',
    amount: '700.00',
    account: { uuid: 'account-1', name: 'Nubank', status: 'ACTIVE' },
    creditCard: null,
    category: null,
    investment: {
      uuid: 'investment-1',
      name: 'Reserva',
      type: 'RESERVE',
      typeLabel: 'Reserva',
      status: 'ACTIVE',
    },
  });
  const edit = {
    scope: 'FUTURE' as const,
    from: dayjs('2026-12-01'),
    description: 'Reserva',
    amount: '700.00',
    accountUuid: 'account-1',
    notes: null,
  };
  const strategy = {
    useSavingStrategy: true,
    minimumRetainedBalance: '200.00',
    additionalContribution: 'REMAINING_SURPLUS' as const,
  };

  it('accepts a contribution without a category', () => {
    expect(recurrenceFormSchema.safeParse(contributionForm).success).toBe(true);
  });

  it('creates a contribution with its investment and no category or card', () => {
    expect(
      toCreateRecurrencePayload({
        ...contributionForm,
        creditCardUuid: 'card-1',
        categoryUuid: 'category-1',
        ...strategy,
      }),
    ).toEqual({
      type: 'INVESTMENT_CONTRIBUTION',
      description: 'Reserva',
      amount: '700.00',
      frequency: 'MONTHLY',
      startDate: '2026-10-15',
      accountUuid: 'account-1',
      investmentUuid: 'investment-1',
      savingStrategy: {
        minimumRetainedBalance: '200.00',
        additionalContribution: 'REMAINING_SURPLUS',
      },
    });
  });

  it('sends a saving strategy only for a monthly contribution', () => {
    expect(
      toCreateRecurrencePayload({
        ...contributionForm,
        frequency: 'WEEKLY',
        ...strategy,
      }).savingStrategy,
    ).toBeUndefined();
  });

  it('omits an unchanged amount so a change per occurrence survives', () => {
    const payload = toUpdateRecurrencePayload(edit, contribution);

    expect(payload.amount).toBeUndefined();
    expect(payload.categoryUuid).toBeUndefined();
    expect(payload.savingStrategy).toBeUndefined();
    expect(
      toUpdateRecurrencePayload({ ...edit, amount: '800.00' }, contribution)
        .amount,
    ).toBe('800.00');
  });

  it('clears an existing strategy with null and keeps sending the edited one', () => {
    const withStrategy = buildRecurrence({
      ...contribution,
      savingStrategy: {
        minimumRetainedBalance: '100.00',
        additionalContribution: 'NONE',
        additionalContributionLabel: 'Nenhum',
      },
    });

    expect(
      toUpdateRecurrencePayload(
        { ...edit, useSavingStrategy: false },
        withStrategy,
      ).savingStrategy,
    ).toBeNull();
    expect(
      toUpdateRecurrencePayload({ ...edit, ...strategy }, withStrategy)
        .savingStrategy,
    ).toEqual({
      minimumRetainedBalance: '200.00',
      additionalContribution: 'REMAINING_SURPLUS',
    });
  });

  it('splits the plan month into the year and month of the additional contribution', () => {
    expect(
      toAdditionalContributionPayload(
        { amount: '600.00', date: dayjs('2026-11-20'), state: 'PLANNED' },
        '2026-11-01',
      ),
    ).toEqual({
      year: 2026,
      month: 11,
      amount: '600.00',
      date: '2026-11-20',
      state: 'PLANNED',
    });
  });
});
