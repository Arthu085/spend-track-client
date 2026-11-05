import type { SavingPlan } from '@/modules/recurrences/domain/saving-plan.schema';

export const buildSavingPlan = (
  overrides: Partial<SavingPlan> = {},
): SavingPlan => ({
  recurrence: {
    uuid: 'a1b2c3d4-aaaa-4c3e-9f1a-1a2b3c4d5e6f',
    description: 'Reserva mensal',
    frequency: 'MONTHLY',
    frequencyLabel: 'Mensal',
    amount: '700.00',
    state: 'ACTIVE',
    stateLabel: 'Ativa',
  },
  investment: {
    uuid: '7a1b2c3d-7777-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Reserva de emergência',
    type: 'RESERVE',
    typeLabel: 'Reserva',
    status: 'ACTIVE',
  },
  account: {
    uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Nubank',
    status: 'ACTIVE',
  },
  month: '2026-10-01',
  actualBalance: '1500.00',
  plannedTransactions: '0.00',
  otherInvestmentMovements: '0.00',
  cardObligations: '0.00',
  balanceBeforeContribution: '1500.00',
  minimumRetainedBalance: '200.00',
  distributable: '1300.00',
  shortfall: '0.00',
  additionalContribution: 'REMAINING_SURPLUS',
  additionalContributionLabel: 'Sobra do mês',
  mandatory: {
    planned: '700.00',
    completed: '0.00',
    plannedOccurrences: [
      {
        uuid: 'b2c3d4e5-bbbb-4c3e-9f1a-1a2b3c4d5e6f',
        date: '2026-10-15',
        amount: '700.00',
        overdue: true,
      },
    ],
  },
  suggestedAdditional: '600.00',
  additional: null,
  canAcceptAdditional: true,
  ...overrides,
});
