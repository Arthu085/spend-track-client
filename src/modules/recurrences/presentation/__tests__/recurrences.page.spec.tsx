import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  chooseOption,
  envelope,
  findRow,
  groceries,
  listPage,
  nubank,
  renderWithRoutes,
  save,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { formatDateOnly } from '@/shared/date/date-only';
import { formatMonthLabel } from '@/shared/date/month-ref';
import { formatMoney } from '@/shared/money/money';
import { buildCreditCard } from '@/test/credit-card-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import {
  buildRecurrence,
  buildRecurrenceOccurrence,
} from '@/test/recurrence-fixture';

const visa = buildCreditCard();
const netflix = buildRecurrence();
const rent = buildRecurrence({
  uuid: 'd4e5f6a7-dddd-4c3e-9f1a-1a2b3c4d5e6f',
  description: 'Aluguel',
  amount: '1500.00',
  startDate: '2026-01-05',
  endDate: '2026-12-05',
  nextOccurrenceDate: '2026-11-05',
  creditCard: null,
  account: { uuid: nubank.uuid, name: nubank.name, status: 'ACTIVE' },
});
const plannedCharge = buildRecurrenceOccurrence();
const confirmedCharge = buildRecurrenceOccurrence({
  uuid: 'f6a7b8c9-ffff-4c3e-9f1a-1a2b3c4d5e6f',
  occurrenceDate: '2026-10-15',
  date: '2026-10-15',
  state: 'COMPLETED',
  stateLabel: 'Realizada',
  completedOn: '2026-10-15',
  purchaseUuid: '9d805f46-9999-4c3e-9f1a-1a2b3c4d5e6f',
  invoiceMonth: '2026-11-01',
});
const occurrencesPath = `/recurrences/${netflix.uuid}/occurrences`;

const money = (amount: string) => formatMoney(amount, i18n.language);
const date = (value: string) => formatDateOnly(value, i18n.language);

const renderRecurrences = (routes = {}) =>
  renderWithRoutes(AppRoutes.RECURRENCES, {
    'GET /credit-cards': listPage([visa]),
    'GET /recurrences': listPage([netflix, rent]),
    [`GET ${occurrencesPath}`]: listPage([confirmedCharge, plannedCharge]),
    ...routes,
  });

const clickRowAction = async (uuid: string, name: string) => {
  fireEvent.click(within(await findRow(uuid)).getByRole('button', { name }));
};

const openOccurrences = async () => {
  await clickRowAction(
    netflix.uuid,
    i18n.t('recurrences.actions.occurrences', { description: 'Netflix' }),
  );

  return findDialog(i18n.t('recurrences.occurrences.cardHint'));
};

describe('RecurrencesPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists recurrences with their schedule, target, and next occurrence', async () => {
    const { sent } = renderRecurrences();

    const netflixRow = await findRow(netflix.uuid);
    expect(within(netflixRow).getByText('Visa')).toBeInTheDocument();
    expect(within(netflixRow).getByText(money('-55.90'))).toBeInTheDocument();
    expect(
      within(netflixRow).getByText(date('2026-11-15')),
    ).toBeInTheDocument();
    expect(
      within(netflixRow).getByText(
        i18n.t('recurrences.schedule.from', { start: date('2026-10-15') }),
      ),
    ).toBeInTheDocument();
    expect(
      within(await findRow(rent.uuid)).getByText(
        i18n.t('recurrences.schedule.between', {
          start: date('2026-01-05'),
          end: date('2026-12-05'),
        }),
      ),
    ).toBeInTheDocument();
    expect(sent('GET /recurrences')[0].params).toEqual({ page: 1, limit: 20 });
  });

  it('creates a monthly card charge on the default card', async () => {
    const { sent } = renderRecurrences({
      'POST /recurrences': envelope(netflix, 'Recorrência criada'),
    });

    await findRow(netflix.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('recurrences.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('recurrences.hints.planned'));
    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.targets.CREDIT_CARD'),
      }),
    );
    await waitFor(() => {
      expect(within(dialog).getByTitle(visa.name)).toBeInTheDocument();
    });
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('recurrences.fields.description')),
      { target: { value: 'Netflix' } },
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('recurrences.fields.amount')),
      { target: { value: '55.90' } },
    );
    await chooseOption(
      dialog,
      i18n.t('recurrences.fields.category'),
      groceries.name,
    );
    save(dialog);

    expect(await screen.findByText('Recorrência criada')).toBeInTheDocument();
    expect(requestBody(sent('POST /recurrences')[0])).toEqual({
      type: 'EXPENSE',
      description: 'Netflix',
      amount: expect.stringMatching(/^55\.90?$/) as unknown,
      frequency: 'MONTHLY',
      startDate: '2026-10-29',
      creditCardUuid: visa.uuid,
      categoryUuid: groceries.uuid,
    });
  });

  it('offers only accounts for income', async () => {
    renderRecurrences();

    await findRow(netflix.uuid);
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(i18n.t('recurrences.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('recurrences.hints.planned'));
    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('transactions.types.INCOME'),
      }),
    );

    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.hints.cardOnlyExpense'),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.targets.CREDIT_CARD'),
      }),
    ).toBeDisabled();
    expect(
      within(dialog).getByLabelText(
        i18n.t('transactions.accountLabels.INCOME'),
      ),
    ).toBeInTheDocument();
  });

  it('edits every planned occurrence with only the editable fields', async () => {
    const { sent } = renderRecurrences({
      [`PATCH /recurrences/${rent.uuid}`]: envelope(rent, 'Atualizada'),
    });

    await clickRowAction(
      rent.uuid,
      i18n.t('recurrences.actions.edit', { description: 'Aluguel' }),
    );
    const dialog = await findDialog(i18n.t('recurrences.hints.editLocked'));
    expect(
      within(dialog).queryByLabelText(i18n.t('recurrences.fields.frequency')),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(i18n.t('recurrences.fields.from')),
    ).toHaveValue(date('2026-10-29'));
    fireEvent.click(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.scopes.ALL'),
      }),
    );
    await waitFor(() => {
      expect(
        within(dialog).queryByLabelText(i18n.t('recurrences.fields.from')),
      ).not.toBeInTheDocument();
    });
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('recurrences.fields.amount')),
      { target: { value: '1600' } },
    );
    save(dialog);

    expect(await screen.findByText('Atualizada')).toBeInTheDocument();
    expect(requestBody(sent(`PATCH /recurrences/${rent.uuid}`)[0])).toEqual({
      scope: 'ALL',
      description: 'Aluguel',
      amount: expect.stringMatching(/^1600(\.00?)?$/) as unknown,
      notes: null,
    });
  });

  it('ends a card recurrence from a chosen invoice month', async () => {
    const { sent } = renderRecurrences({
      [`PUT /recurrences/${netflix.uuid}/end`]: envelope(
        { ...netflix, endDate: '2026-11-04' },
        'Recorrência encerrada',
      ),
    });

    await clickRowAction(
      netflix.uuid,
      i18n.t('recurrences.actions.end', { description: 'Netflix' }),
    );
    const dialog = await findDialog(i18n.t('recurrences.end.history'));
    expect(
      within(dialog).getByText(i18n.t('recurrences.hints.endFromInvoiceMonth')),
    ).toBeInTheDocument();
    const monthInput = within(dialog).getByLabelText(
      i18n.t('recurrences.fields.endFromInvoiceMonth'),
    );
    fireEvent.mouseDown(monthInput);
    fireEvent.change(monthInput, { target: { value: '12/2026' } });
    fireEvent.keyDown(monthInput, { key: 'Enter' });
    save(dialog);

    expect(
      await screen.findByText('Recorrência encerrada'),
    ).toBeInTheDocument();
    expect(
      requestBody(sent(`PUT /recurrences/${netflix.uuid}/end`)[0]),
    ).toEqual({ fromInvoiceMonth: '2026-12-01' });
  });

  it('ends an account recurrence from today by default', async () => {
    const { sent } = renderRecurrences({
      [`PUT /recurrences/${rent.uuid}/end`]: envelope(rent, 'Encerrada'),
    });

    await clickRowAction(
      rent.uuid,
      i18n.t('recurrences.actions.end', { description: 'Aluguel' }),
    );
    save(await findDialog(i18n.t('recurrences.end.history')));

    expect(await screen.findByText('Encerrada')).toBeInTheDocument();
    expect(requestBody(sent(`PUT /recurrences/${rent.uuid}/end`)[0])).toEqual({
      from: '2026-10-29',
    });
  });

  it('confirms a planned card charge with an edited amount', async () => {
    const { sent } = renderRecurrences({
      [`PUT ${occurrencesPath}/${plannedCharge.uuid}/confirmation`]: envelope(
        { ...plannedCharge, state: 'COMPLETED', amount: '59.90' },
        'Ocorrência confirmada',
      ),
    });

    const occurrences = await openOccurrences();
    const plannedRow = await findRow(plannedCharge.uuid);
    expect(
      within(plannedRow).getByText(
        formatMonthLabel({ year: 2026, month: 12 }, i18n.language),
      ),
    ).toBeInTheDocument();
    expect(
      within(await findRow(confirmedCharge.uuid)).queryByRole('button', {
        name: i18n.t('recurrences.actions.confirmOccurrence', {
          date: date('2026-10-15'),
        }),
      }),
    ).not.toBeInTheDocument();
    expect(sent(`GET ${occurrencesPath}`)[0].params).toEqual({
      page: 1,
      limit: 20,
    });

    fireEvent.click(
      within(occurrences).getByRole('button', {
        name: i18n.t('recurrences.actions.confirmOccurrence', {
          date: date('2026-11-15'),
        }),
      }),
    );
    const dialog = await findDialog(
      i18n.t('recurrences.confirm.cardDescription', { description: 'Netflix' }),
    );
    const amount = within(dialog).getByLabelText(
      i18n.t('recurrences.fields.amount'),
    );
    expect(amount).toHaveValue(money('55.90').replace(/^R\$\s*/, ''));
    expect(
      within(dialog).getByLabelText(i18n.t('creditCards.fields.purchaseDate')),
    ).toHaveValue(date('2026-11-15'));
    fireEvent.change(amount, { target: { value: '59.90' } });
    save(dialog);

    expect(
      await screen.findByText('Ocorrência confirmada'),
    ).toBeInTheDocument();
    expect(
      requestBody(
        sent(`PUT ${occurrencesPath}/${plannedCharge.uuid}/confirmation`)[0],
      ),
    ).toEqual({
      amount: expect.stringMatching(/^59\.90?$/) as unknown,
      date: '2026-11-15',
    });
  });

  it('skips a planned occurrence after a warning', async () => {
    const { sent } = renderRecurrences({
      [`PUT ${occurrencesPath}/${plannedCharge.uuid}/cancellation`]: envelope(
        { ...plannedCharge, state: 'CANCELED', stateLabel: 'Cancelada' },
        'Ocorrência pulada',
      ),
    });

    const occurrences = await openOccurrences();
    await findRow(plannedCharge.uuid);
    fireEvent.click(
      within(occurrences).getByRole('button', {
        name: i18n.t('recurrences.actions.skipOccurrence', {
          date: date('2026-11-15'),
        }),
      }),
    );
    const warning = await findDialog(i18n.t('recurrences.skip.title'));
    fireEvent.click(
      within(warning).getByRole('button', {
        name: i18n.t('recurrences.skip.confirm'),
      }),
    );

    expect(await screen.findByText('Ocorrência pulada')).toBeInTheDocument();
    expect(
      sent(`PUT ${occurrencesPath}/${plannedCharge.uuid}/cancellation`),
    ).toHaveLength(1);
  });

  it.each([
    ['card', netflix, 'recurrences.occurrences.cardHint'] as const,
    ['account', rent, 'recurrences.occurrences.accountHint'] as const,
  ])(
    'locks an ended %s recurrence but keeps its planned occurrences manageable',
    async (_target, recurrence, hint) => {
      const { uuid, description } = recurrence;
      const planned = buildRecurrenceOccurrence({
        occurrenceDate: '2026-10-20',
        date: '2026-10-20',
      });

      renderRecurrences({
        'GET /recurrences': listPage([
          {
            ...recurrence,
            state: 'ENDED',
            stateLabel: 'Encerrada',
            endDate: '2026-10-28',
            nextOccurrenceDate: null,
          },
        ]),
        [`GET /recurrences/${uuid}/occurrences`]: listPage([
          confirmedCharge,
          planned,
        ]),
      });

      const row = await findRow(uuid);
      for (const action of [
        'recurrences.actions.edit',
        'recurrences.actions.pause',
        'recurrences.actions.resume',
        'recurrences.actions.end',
      ] as const) {
        expect(
          within(row).queryByRole('button', {
            name: i18n.t(action, { description }),
          }),
        ).not.toBeInTheDocument();
      }

      await clickRowAction(
        uuid,
        i18n.t('recurrences.actions.occurrences', { description }),
      );
      await findDialog(i18n.t(hint));

      const plannedRow = await findRow(planned.uuid);
      const plannedDate = date('2026-10-20');
      for (const action of [
        'recurrences.actions.confirmOccurrence',
        'recurrences.actions.editOccurrence',
        'recurrences.actions.skipOccurrence',
      ] as const) {
        expect(
          within(plannedRow).getByRole('button', {
            name: i18n.t(action, { date: plannedDate }),
          }),
        ).toBeEnabled();
      }
      expect(
        within(await findRow(confirmedCharge.uuid)).queryByRole('button'),
      ).not.toBeInTheDocument();
    },
  );

  it('pauses a recurrence after a warning', async () => {
    const { sent } = renderRecurrences({
      [`PUT /recurrences/${netflix.uuid}/state`]: envelope(
        { ...netflix, state: 'PAUSED', stateLabel: 'Pausada' },
        'Recorrência pausada',
      ),
    });

    await clickRowAction(
      netflix.uuid,
      i18n.t('recurrences.actions.pause', { description: 'Netflix' }),
    );
    const warning = await findDialog(i18n.t('recurrences.pause.title'));
    fireEvent.click(
      within(warning).getByRole('button', {
        name: i18n.t('recurrences.pause.confirm'),
      }),
    );

    expect(await screen.findByText('Recorrência pausada')).toBeInTheDocument();
    expect(
      requestBody(sent(`PUT /recurrences/${netflix.uuid}/state`)[0]),
    ).toEqual({ state: 'PAUSED' });
  });
});
