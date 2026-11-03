import type {
  CreditCard,
  CreditCardInvoice,
  CreditCardInvoiceDetail,
  CreditCardPurchase,
} from '@/modules/credit-cards/domain/credit-card.schema';

export const buildCreditCard = (
  overrides: Partial<CreditCard> = {},
): CreditCard => ({
  uuid: '7b6e3d24-7777-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Visa',
  creditLimit: '5000.00',
  closingDay: 5,
  dueDay: 12,
  isDefault: true,
  outstanding: '300.00',
  availableLimit: '4700.00',
  creditBalance: '0.00',
  status: 'ACTIVE',
  statusLabel: 'Ativo',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
});

const visa = buildCreditCard();

export const novemberInvoiceRef = {
  uuid: '8c7f4e35-8888-4c3e-9f1a-1a2b3c4d5e6f',
  referenceMonth: '2026-11-01',
  closingDate: '2026-11-05',
  dueDate: '2026-11-12',
};

export const buildCreditCardInvoice = (
  overrides: Partial<CreditCardInvoice> = {},
): CreditCardInvoice => ({
  ...novemberInvoiceRef,
  card: { uuid: visa.uuid, name: visa.name, status: 'ACTIVE' },
  charges: '300.00',
  refunds: '0.00',
  previousCredit: '0.00',
  total: '300.00',
  paid: '0.00',
  outstanding: '300.00',
  creditCarried: '0.00',
  status: 'OPEN',
  statusLabel: 'Aberta',
  ...overrides,
});

export const buildCreditCardInvoiceDetail = (
  overrides: Partial<CreditCardInvoiceDetail> = {},
): CreditCardInvoiceDetail => ({
  ...buildCreditCardInvoice(),
  chargeEntries: [
    {
      purchaseUuid: '9d805f46-9999-4c3e-9f1a-1a2b3c4d5e6f',
      description: 'Tênis',
      category: {
        uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
        name: 'Mercado',
        kind: 'EXPENSE',
        color: '#52C41A',
        status: 'ACTIVE',
      },
      purchaseDate: '2026-10-29',
      installmentNumber: 1,
      installmentCount: 3,
      amount: '100.00',
      date: '2026-10-29',
    },
  ],
  refundEntries: [],
  payments: [],
  ...overrides,
});

export const buildCreditCardPurchase = (
  overrides: Partial<CreditCardPurchase> = {},
): CreditCardPurchase => ({
  uuid: '9d805f46-9999-4c3e-9f1a-1a2b3c4d5e6f',
  card: { uuid: visa.uuid, name: visa.name, status: 'ACTIVE' },
  category: {
    uuid: '3d2a9f80-3333-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Mercado',
    kind: 'EXPENSE',
    color: '#52C41A',
    status: 'ACTIVE',
  },
  description: 'Tênis',
  amount: '300.00',
  purchaseDate: '2026-10-29',
  installmentCount: 3,
  installments: [
    {
      number: 1,
      amount: '100.00',
      date: '2026-10-29',
      invoice: novemberInvoiceRef,
    },
    {
      number: 2,
      amount: '100.00',
      date: '2026-11-29',
      invoice: {
        uuid: 'a1b2c3d4-aaaa-4c3e-9f1a-1a2b3c4d5e6f',
        referenceMonth: '2026-12-01',
        closingDate: '2026-12-05',
        dueDate: '2026-12-12',
      },
    },
    {
      number: 3,
      amount: '100.00',
      date: '2026-12-29',
      invoice: {
        uuid: 'b2c3d4e5-bbbb-4c3e-9f1a-1a2b3c4d5e6f',
        referenceMonth: '2027-01-01',
        closingDate: '2027-01-05',
        dueDate: '2027-01-12',
      },
    },
  ],
  refunds: [],
  refundedAmount: '0.00',
  refundableAmount: '300.00',
  deletable: true,
  notes: null,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
  ...overrides,
});
