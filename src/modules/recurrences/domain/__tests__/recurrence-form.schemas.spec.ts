import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  buildRecurrence,
  buildRecurrenceOccurrence,
} from '@/test/recurrence-fixture';
import {
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
      categoryUuid: recurrence.category.uuid,
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

  it('builds occurrence payloads with date-only strings', () => {
    expect(
      toOccurrencePayload({ amount: '60.00', date: dayjs('2026-11-16') }),
    ).toEqual({ amount: '60.00', date: '2026-11-16' });
  });
});
