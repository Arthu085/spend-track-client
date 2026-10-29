import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  toCreateTransactionPayload,
  toUpdateTransactionPayload,
  type TransactionForm,
} from '../transaction-form.schemas';
import type { Transaction } from '../transaction.schema';

const expenseForm: TransactionForm = {
  type: 'EXPENSE',
  description: 'Mercado',
  amount: '250.40',
  date: dayjs('2026-10-29'),
  state: 'COMPLETED',
  completedOn: dayjs('2026-10-30'),
  accountUuid: 'account-1',
  destinationAccountUuid: 'account-2',
  categoryUuid: 'category-1',
  notes: '  ',
};

const transaction: Transaction = {
  uuid: 'transaction-1',
  type: 'EXPENSE',
  typeLabel: 'Despesa',
  description: 'Mercado',
  amount: '250.40',
  date: '2026-10-29',
  state: 'COMPLETED',
  stateLabel: 'Realizada',
  completedOn: '2026-10-30',
  canceledAt: null,
  account: { uuid: 'account-1', name: 'Nubank', status: 'INACTIVE' },
  destinationAccount: null,
  category: {
    uuid: 'category-1',
    name: 'Mercado',
    kind: 'EXPENSE',
    color: null,
    status: 'ACTIVE',
  },
  notes: 'Old note',
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};

describe('toCreateTransactionPayload', () => {
  it('sends only the references of the transaction type', () => {
    expect(toCreateTransactionPayload(expenseForm)).toEqual({
      type: 'EXPENSE',
      description: 'Mercado',
      amount: '250.40',
      date: '2026-10-29',
      state: 'COMPLETED',
      completedOn: '2026-10-30',
      accountUuid: 'account-1',
      categoryUuid: 'category-1',
    });
    expect(
      toCreateTransactionPayload({
        ...expenseForm,
        type: 'TRANSFER',
        state: 'PLANNED',
        notes: 'Reserve',
      }),
    ).toEqual({
      type: 'TRANSFER',
      description: 'Mercado',
      amount: '250.40',
      date: '2026-10-29',
      state: 'PLANNED',
      accountUuid: 'account-1',
      destinationAccountUuid: 'account-2',
      notes: 'Reserve',
    });
  });
});

describe('toUpdateTransactionPayload', () => {
  it('limits a completed transaction to description, category, and notes', () => {
    expect(
      toUpdateTransactionPayload(
        { ...expenseForm, description: 'Feira', categoryUuid: 'category-2' },
        transaction,
      ),
    ).toEqual({
      description: 'Feira',
      categoryUuid: 'category-2',
      notes: null,
    });
  });

  it('sends planned financial fields and only the references that changed', () => {
    expect(
      toUpdateTransactionPayload(
        { ...expenseForm, amount: '99.90', notes: 'Paid in cash' },
        { ...transaction, state: 'PLANNED', completedOn: null },
      ),
    ).toEqual({
      description: 'Mercado',
      amount: '99.90',
      date: '2026-10-29',
      notes: 'Paid in cash',
    });
  });
});
