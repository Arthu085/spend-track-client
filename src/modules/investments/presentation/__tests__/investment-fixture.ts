import type {
  Investment,
  InvestmentMovement,
} from '../../domain/investment.schema';

export const buildInvestment = (
  overrides: Partial<Investment> = {},
): Investment => ({
  uuid: '7a1b2c3d-7777-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Viagem',
  type: 'GOAL',
  typeLabel: 'Meta',
  targetAmount: '6000.00',
  currentValue: '1500.00',
  contributed: '1500.00',
  withdrawn: '0.00',
  adjusted: '0.00',
  progress: { remaining: '4500.00', percent: 25 },
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

export const buildInvestmentMovement = (
  overrides: Partial<InvestmentMovement> = {},
): InvestmentMovement => ({
  uuid: '8b2c3d4e-8888-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'CONTRIBUTION',
  typeLabel: 'Aporte',
  amount: '500.00',
  date: '2026-10-10',
  state: 'COMPLETED',
  stateLabel: 'Efetivada',
  completedOn: '2026-10-10',
  canceledAt: null,
  account: {
    uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Nubank',
    status: 'ACTIVE',
  },
  createdAt: '2026-10-10T12:00:00.000Z',
  ...overrides,
});
