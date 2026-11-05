import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  envelope,
  renderWithRoutes,
  type StubRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { dateInputFormat, formatDateOnly } from '@/shared/date/date-only';
import { formatMoney } from '@/shared/money/money';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody, stubHttpRoutes } from '@/test/http-stub';
import type {
  BulkConfirmationResult,
  PendingConfirmation,
} from '../../domain/transaction-confirmation.schema';
import { confirmTransactionsInChunks } from '../../infra/transactions.api';

const account = {
  uuid: '1b0f7d6e-1111-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Nubank',
  status: 'ACTIVE' as const,
};

const buildPending = (
  overrides: Partial<PendingConfirmation> & { uuid: string },
): PendingConfirmation => ({
  type: 'EXPENSE',
  typeLabel: 'Despesa',
  description: 'Aluguel',
  amount: '300.00',
  date: '2026-10-20',
  state: 'PLANNED',
  stateLabel: 'Planejada',
  completedOn: null,
  canceledAt: null,
  account,
  destinationAccount: null,
  category: null,
  recurrence: null,
  notes: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  overdue: true,
  future: false,
  confirmable: true,
  blockedReason: null,
  earliestCompletedOn: '2026-10-01',
  ...overrides,
});

const rent = buildPending({ uuid: 'rent' });
const salary = buildPending({
  uuid: 'salary',
  type: 'INCOME',
  description: 'Salário',
  amount: '2000.00',
  date: '2026-10-29',
  overdue: false,
});
const savings = buildPending({
  uuid: 'savings',
  type: 'TRANSFER',
  description: 'Reserva',
  amount: '150.00',
  date: '2026-10-29',
  overdue: false,
  destinationAccount: {
    uuid: '2c1f8e7f-2222-4c3e-9f1a-1a2b3c4d5e6f',
    name: 'Carteira',
    status: 'ACTIVE',
  },
});
const gym = buildPending({
  uuid: 'gym',
  description: 'Academia',
  amount: '90.00',
  date: '2026-10-31',
  overdue: false,
  future: true,
});
const archived = buildPending({
  uuid: 'archived',
  description: 'Conta antiga',
  amount: '40.00',
  confirmable: false,
  blockedReason: 'INACTIVE_ACCOUNT',
});

const pendingPath = 'GET /transactions/pending-confirmations';
const bulkPath = 'POST /transactions/bulk-confirmation';
const money = (amount: string) => formatMoney(amount, i18n.language);
const typed = (date: string) =>
  dayjs(date).format(dateInputFormat(i18n.language));

const pendingResponse = (items: PendingConfirmation[]) =>
  envelope({ items, total: items.length });

const result = (
  uuid: string,
  outcome: BulkConfirmationResult['outcome'] = 'CONFIRMED',
  message: string | null = null,
): BulkConfirmationResult => ({ uuid, outcome, message, transaction: null });

const bulkResponse = (results: BulkConfirmationResult[]) =>
  envelope({
    results,
    confirmedCount: results.filter(({ outcome }) => outcome === 'CONFIRMED')
      .length,
    alreadyCompletedCount: results.filter(
      ({ outcome }) => outcome === 'ALREADY_COMPLETED',
    ).length,
    failedCount: results.filter(({ outcome }) => outcome === 'FAILED').length,
  });

const dashboardWithUpcoming = envelope(
  buildDashboard({
    upcoming: [
      {
        uuid: rent.uuid,
        type: rent.type,
        typeLabel: rent.typeLabel,
        description: rent.description,
        amount: rent.amount,
        date: rent.date,
        overdue: true,
        account,
        destinationAccount: null,
        category: null,
      },
    ],
    upcomingCount: 5,
  }),
);

const openModal = async (
  items: PendingConfirmation[],
  routes: StubRoutes = {},
) => {
  const rendered = renderWithRoutes(AppRoutes.DASHBOARD, {
    'GET /dashboard': dashboardWithUpcoming,
    [pendingPath]: pendingResponse(items),
    ...routes,
  });

  fireEvent.click(
    await screen.findByRole('button', {
      name: new RegExp(i18n.t('transactions.confirmPending.open')),
    }),
  );

  return {
    ...rendered,
    dialog: await findDialog(i18n.t('transactions.confirmPending.title')),
  };
};

const checkbox = (dialog: HTMLElement, description: string) =>
  within(dialog).findByRole('checkbox', {
    name: i18n.t('transactions.confirmPending.selectRow', { description }),
  });

const submitButton = (dialog: HTMLElement, count: number) =>
  within(dialog).getByRole('button', {
    name: i18n.t('transactions.confirmPending.submit', { count }),
  });

const setDate = (dialog: HTMLElement, label: string, date: string) => {
  const input = within(dialog).getByLabelText(label);

  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: typed(date) } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const rowDateLabel = (description: string) =>
  i18n.t('transactions.confirmPending.rowDate', { description });

describe('Confirm pending transactions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the full set up to the end of the month and changes nothing before confirming', async () => {
    const { dialog, sent } = await openModal([rent, salary, gym]);

    await checkbox(dialog, rent.description);

    expect(sent(pendingPath)[0].params).toEqual({ until: '2026-10-31' });
    expect(
      within(dialog).getByText(i18n.t('transactions.confirmPending.excluded')),
    ).toBeInTheDocument();
    expect(sent(bulkPath)).toHaveLength(0);
  });

  it('selects what is due, leaves future rows unselected, and disables blocked rows with the reason', async () => {
    const { dialog } = await openModal([rent, salary, gym, archived]);

    expect(await checkbox(dialog, rent.description)).toBeChecked();
    expect(await checkbox(dialog, salary.description)).toBeChecked();

    const future = await checkbox(dialog, gym.description);

    expect(future).not.toBeChecked();
    expect(future).toBeEnabled();

    const blocked = await checkbox(dialog, archived.description);

    expect(blocked).not.toBeChecked();
    expect(blocked).toBeDisabled();
    expect(
      within(dialog).getByText(
        i18n.t('transactions.confirmPending.blocked.INACTIVE_ACCOUNT'),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(rowDateLabel(archived.description)),
    ).toBeDisabled();
  });

  it('totals only the selected rows by type and shows the accounts', async () => {
    const { dialog } = await openModal([rent, salary, savings, gym]);

    await checkbox(dialog, rent.description);

    const summary = within(dialog).getByRole('group', {
      name: i18n.t('transactions.confirmPending.summary.label'),
    });

    expect(summary).toHaveTextContent(money('2000.00'));
    expect(summary).toHaveTextContent(money('300.00'));
    expect(summary).toHaveTextContent(money('150.00'));
    expect(summary).toHaveTextContent(
      i18n.t('transactions.confirmPending.summary.selectedCount', {
        selected: 3,
        total: 4,
      }),
    );
    expect(
      within(dialog).getByText(
        i18n.t('transactions.transferRoute', {
          from: 'Nubank',
          to: 'Carteira',
        }),
      ),
    ).toBeInTheDocument();

    fireEvent.click(await checkbox(dialog, rent.description));

    expect(summary).not.toHaveTextContent(money('300.00'));
  });

  it('sends the selection with the default date, a row override, and an explicit future row', async () => {
    const { dialog, sent } = await openModal([rent, salary, savings, gym], {
      [bulkPath]: bulkResponse([
        result(rent.uuid),
        result(salary.uuid, 'ALREADY_COMPLETED'),
        result(gym.uuid),
      ]),
    });

    fireEvent.click(await checkbox(dialog, savings.description));
    fireEvent.click(await checkbox(dialog, gym.description));
    setDate(dialog, rowDateLabel(rent.description), '2026-10-22');
    fireEvent.click(submitButton(dialog, 3));

    expect(
      await screen.findByText(
        i18n.t('transactions.confirmPending.success', {
          confirmed: 2,
          alreadyCompleted: 1,
        }),
      ),
    ).toBeInTheDocument();
    expect(requestBody(sent(bulkPath)[0])).toEqual({
      items: [
        { uuid: rent.uuid, completedOn: '2026-10-22' },
        { uuid: salary.uuid, completedOn: '2026-10-29' },
        { uuid: gym.uuid, completedOn: '2026-10-29' },
      ],
    });
    await waitFor(() => {
      expect(sent('GET /dashboard').length).toBeGreaterThan(1);
    });
  });

  it('applies a changed default date to rows without an override', async () => {
    const { dialog, sent } = await openModal([rent, salary], {
      [bulkPath]: bulkResponse([result(rent.uuid), result(salary.uuid)]),
    });

    await checkbox(dialog, rent.description);
    setDate(
      dialog,
      i18n.t('transactions.confirmPending.defaultDate'),
      '2026-10-25',
    );
    fireEvent.click(submitButton(dialog, 2));

    await waitFor(() => {
      expect(sent(bulkPath)).toHaveLength(1);
    });
    expect(requestBody(sent(bulkPath)[0])).toEqual({
      items: [
        { uuid: rent.uuid, completedOn: '2026-10-25' },
        { uuid: salary.uuid, completedOn: '2026-10-25' },
      ],
    });
  });

  it('blocks a selected row whose effective date is before the opening date of its account', async () => {
    const { dialog, sent } = await openModal([
      buildPending({ uuid: 'recent', earliestCompletedOn: '2026-10-15' }),
    ]);

    await checkbox(dialog, rent.description);
    setDate(
      dialog,
      i18n.t('transactions.confirmPending.defaultDate'),
      '2026-10-10',
    );

    expect(
      await within(dialog).findByText(
        i18n.t('transactions.confirmPending.dateBeforeOpening', {
          date: formatDateOnly('2026-10-15', i18n.language),
        }),
      ),
    ).toBeInTheDocument();
    expect(submitButton(dialog, 1)).toBeDisabled();
    expect(sent(bulkPath)).toHaveLength(0);
  });

  it('shows per-item failures and retries only the failed rows', async () => {
    const attempts = [
      bulkResponse([
        result(rent.uuid),
        result(salary.uuid, 'FAILED', 'Conta arquivada'),
      ]),
      bulkResponse([result(salary.uuid)]),
    ];
    const { dialog, sent } = await openModal([rent, salary], {
      [bulkPath]: () => attempts.shift() ?? bulkResponse([]),
    });

    await checkbox(dialog, rent.description);
    fireEvent.click(submitButton(dialog, 2));

    expect(
      await within(dialog).findByText('Conta arquivada'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        i18n.t('transactions.confirmPending.partial', {
          confirmed: 1,
          alreadyCompleted: 0,
          failed: 1,
        }),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('checkbox', {
        name: i18n.t('transactions.confirmPending.selectRow', {
          description: rent.description,
        }),
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: i18n.t('transactions.confirmPending.retry', { count: 1 }),
      }),
    );

    expect(
      await screen.findByText(
        i18n.t('transactions.confirmPending.success', {
          confirmed: 2,
          alreadyCompleted: 0,
        }),
      ),
    ).toBeInTheDocument();
    expect(requestBody(sent(bulkPath)[1])).toEqual({
      items: [{ uuid: salary.uuid, completedOn: '2026-10-29' }],
    });
  });

  it('sends a single request when the submit button is clicked twice', async () => {
    const { dialog, sent } = await openModal([rent], {
      [bulkPath]: bulkResponse([result(rent.uuid)]),
    });

    await checkbox(dialog, rent.description);

    const button = submitButton(dialog, 1);

    fireEvent.click(button);
    fireEvent.click(button);

    expect(
      await screen.findByText(
        i18n.t('transactions.confirmPending.success', {
          confirmed: 1,
          alreadyCompleted: 0,
        }),
      ),
    ).toBeInTheDocument();
    expect(sent(bulkPath)).toHaveLength(1);
  });

  it('renders an empty state when nothing is pending', async () => {
    const { dialog } = await openModal([]);

    expect(
      await within(dialog).findByText(
        i18n.t('transactions.confirmPending.empty'),
      ),
    ).toBeInTheDocument();
  });

  it('shows no confirm action when nothing is upcoming', async () => {
    renderWithRoutes(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(buildDashboard()),
    });

    expect(
      await screen.findByText(i18n.t('dashboard.upcoming.empty')),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: new RegExp(i18n.t('transactions.confirmPending.open')),
      }),
    ).not.toBeInTheDocument();
  });
});

describe('confirmTransactionsInChunks', () => {
  const items = Array.from({ length: 205 }, (_, index) => ({
    uuid: `uuid-${String(index)}`,
    completedOn: '2026-10-29',
  }));
  const echo = (config: { data?: unknown }) => {
    const body = requestBody(config as never) as { items: typeof items };

    return bulkResponse(body.items.map(({ uuid }) => result(uuid)));
  };

  it('sends more than 200 items sequentially and aggregates the results', async () => {
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': envelope({ csrfToken: 'token' }),
      [bulkPath]: echo,
    });

    const results = await confirmTransactionsInChunks(items);
    const bodies = requests
      .filter(({ url }) => url === '/transactions/bulk-confirmation')
      .map((request) => requestBody(request) as { items: unknown[] });

    expect(bodies.map((body) => body.items.length)).toEqual([200, 5]);
    expect(results).toHaveLength(205);
    expect(results.every(({ outcome }) => outcome === 'CONFIRMED')).toBe(true);
  });

  it('stops after a refused chunk and reports it and the rest as failed', async () => {
    let call = 0;
    const requests = stubHttpRoutes(httpClient, {
      'GET /auth/csrf': envelope({ csrfToken: 'token' }),
      [bulkPath]: (config) => {
        call += 1;

        return call === 1
          ? echo(config)
          : { status: 500, data: { message: 'Falha geral' } };
      },
    });

    const results = await confirmTransactionsInChunks([
      ...items,
      ...items.map(({ uuid, completedOn }) => ({
        uuid: `${uuid}-next`,
        completedOn,
      })),
      ...items.map(({ uuid, completedOn }) => ({
        uuid: `${uuid}-last`,
        completedOn,
      })),
    ]);

    expect(
      requests.filter(({ url }) => url === '/transactions/bulk-confirmation'),
    ).toHaveLength(2);
    expect(results).toHaveLength(615);
    expect(
      results.filter(({ outcome }) => outcome === 'CONFIRMED'),
    ).toHaveLength(200);
    expect(results.filter(({ outcome }) => outcome === 'FAILED')).toHaveLength(
      415,
    );
  });
});
