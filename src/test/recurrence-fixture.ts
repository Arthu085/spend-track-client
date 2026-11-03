import type {
  Recurrence,
  RecurrenceOccurrence,
} from '@/modules/recurrences/domain/recurrence.schema';

export const buildRecurrence = (
  overrides: Partial<Recurrence> = {},
): Recurrence => ({
  uuid: 'c3d4e5f6-cccc-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'EXPENSE',
  typeLabel: 'Despesa',
  description: 'Netflix',
  amount: '55.90',
  frequency: 'MONTHLY',
  frequencyLabel: 'Mensal',
  startDate: '2026-10-15',
  endDate: null,
  state: 'ACTIVE',
  stateLabel: 'Ativa',
  account: null,
  creditCard: {
    uuid: '7b6e3d24-7777-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Visa',
    status: 'ACTIVE',
  },
  category: {
    uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Mercado',
    kind: 'EXPENSE',
    color: '#52C41A',
    status: 'ACTIVE',
  },
  notes: null,
  nextOccurrenceDate: '2026-11-15',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

export const buildRecurrenceOccurrence = (
  overrides: Partial<RecurrenceOccurrence> = {},
): RecurrenceOccurrence => ({
  uuid: 'e5f6a7b8-eeee-4c3e-9f1a-1a2b3c4d5e6f',
  occurrenceDate: '2026-11-15',
  date: '2026-11-15',
  amount: '55.90',
  description: 'Netflix',
  state: 'PLANNED',
  stateLabel: 'Prevista',
  completedOn: null,
  transactionUuid: null,
  purchaseUuid: null,
  invoiceMonth: '2026-12-01',
  ...overrides,
});
