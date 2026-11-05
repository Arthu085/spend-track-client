import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  envelope,
  renderWithRoutes,
  save,
  type StubRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { buildInvestmentMovement } from '@/modules/investments/presentation/__tests__/investment-fixture';
import type { SavingPlan } from '@/modules/recurrences/domain/saving-plan.schema';
import { dateInputFormat, formatDateOnly } from '@/shared/date/date-only';
import { formatMoney } from '@/shared/money/money';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import { buildSavingPlan } from '@/test/saving-plan-fixture';
import type { Dashboard } from '../../domain/dashboard.schema';

const money = (amount: string) => formatMoney(amount, i18n.language);

const investmentsWith = (
  overrides: Partial<Dashboard['investments']>,
): Dashboard['investments'] => ({
  ...buildDashboard().investments,
  ...overrides,
});

const renderPlans = (plans: SavingPlan[], routes: StubRoutes = {}) =>
  renderWithRoutes(AppRoutes.DASHBOARD, {
    'GET /dashboard': envelope(
      buildDashboard({ investments: investmentsWith({ savingPlans: plans }) }),
    ),
    ...routes,
  });

const planGroup = (description: string) =>
  screen.findByRole('group', { name: description });

const amountOf = (group: HTMLElement, label: string) =>
  within(group).getByLabelText(label);

const openAccept = async (plan: SavingPlan, routes: StubRoutes = {}) => {
  const rendered = renderPlans([plan], routes);
  const group = await planGroup(plan.recurrence.description);

  fireEvent.click(
    within(group).getByRole('button', {
      name: i18n.t('dashboard.savingPlans.accept'),
    }),
  );

  return {
    ...rendered,
    dialog: await findDialog(i18n.t('recurrences.additional.title')),
  };
};

const acceptPath = (plan: SavingPlan) =>
  `POST /recurrences/${plan.recurrence.uuid}/additional-contributions`;

describe('Saving plans on the dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders cleanly without plans', async () => {
    renderPlans([]);

    expect(
      await screen.findByText(i18n.t('dashboard.investments.title')),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(i18n.t('dashboard.savingPlans.title')),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', {
        name: i18n.t('dashboard.investments.breakdown.label'),
      }),
    ).not.toBeInTheDocument();
  });

  it('separates mandatory, additional, and one-time contributions', async () => {
    renderWithRoutes(AppRoutes.DASHBOARD, {
      'GET /dashboard': envelope(
        buildDashboard({
          investments: investmentsWith({
            contributionBreakdown: {
              mandatoryPlanned: '700.00',
              mandatoryCompleted: '100.00',
              additionalPlanned: '600.00',
              additionalCompleted: '50.00',
              oneTimePlanned: '30.00',
              oneTimeCompleted: '20.00',
            },
          }),
        }),
      ),
    });

    const group = await screen.findByRole('group', {
      name: i18n.t('dashboard.investments.breakdown.label'),
    });
    const amounts = (completed: string, planned: string) =>
      i18n.t('dashboard.investments.breakdown.amounts', {
        completed: money(completed),
        planned: money(planned),
      });

    expect(within(group).getByText(amounts('100.00', '700.00'))).toBeVisible();
    expect(within(group).getByText(amounts('50.00', '600.00'))).toBeVisible();
    expect(within(group).getByText(amounts('20.00', '30.00'))).toBeVisible();
  });

  it('shows the figures of a plan, the card note, and creates nothing by itself', async () => {
    const { sent } = renderPlans([
      buildSavingPlan({ cardObligations: '250.00' }),
    ]);
    const group = await planGroup('Reserva mensal');

    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.balanceForRemaining')),
    ).toHaveTextContent(money('1500.00'));
    expect(
      within(group).getByText(
        i18n.t('dashboard.savingPlans.mandatoryDetail', {
          planned: money('700.00'),
          completed: money('0.00'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.suggested')),
    ).toHaveTextContent(money('600.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.total')),
    ).toHaveTextContent(money('1300.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.retained')),
    ).toHaveTextContent(money('200.00'));
    expect(
      within(group).getByText(
        i18n.t('dashboard.savingPlans.cardNote', {
          amount: money('250.00'),
          account: 'Nubank',
        }),
      ),
    ).toBeInTheDocument();
    expect(sent(acceptPath(buildSavingPlan()))).toHaveLength(0);
  });

  it('reconciles the figures after the mandatory contribution is confirmed', async () => {
    renderPlans([
      buildSavingPlan({
        balanceBeforeContribution: '800.00',
        mandatory: {
          planned: '0.00',
          completed: '700.00',
          plannedOccurrences: [],
        },
      }),
    ]);
    const group = await planGroup('Reserva mensal');

    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.balanceForRemaining')),
    ).toHaveTextContent(money('800.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.suggested')),
    ).toHaveTextContent(money('600.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.retained')),
    ).toHaveTextContent(money('200.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.total')),
    ).toHaveTextContent(money('1300.00'));
  });

  it('alerts about a shortfall without lowering the mandatory target', async () => {
    renderPlans([
      buildSavingPlan({
        balanceBeforeContribution: '500.00',
        distributable: '300.00',
        shortfall: '400.00',
        suggestedAdditional: '0.00',
      }),
    ]);
    const group = await planGroup('Reserva mensal');

    expect(within(group).getByRole('alert')).toHaveTextContent(
      i18n.t('dashboard.savingPlans.shortfall', {
        amount: money('400.00'),
        account: 'Nubank',
      }),
    );
    expect(
      within(group).getByText(
        i18n.t('dashboard.savingPlans.mandatoryDetail', {
          planned: money('700.00'),
          completed: money('0.00'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.total')),
    ).toHaveTextContent(money('700.00'));
  });

  it('warns that suggestions on a shared account overlap and never adds them', async () => {
    renderPlans([
      buildSavingPlan(),
      buildSavingPlan({
        recurrence: {
          ...buildSavingPlan().recurrence,
          uuid: 'c3d4e5f6-cccc-4c3e-9f1a-1a2b3c4d5e6f',
          description: 'Viagem mensal',
        },
      }),
    ]);

    expect(
      await screen.findByText(
        i18n.t('dashboard.savingPlans.overlap', { account: 'Nubank' }),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(money('1200.00'))).not.toBeInTheDocument();
  });

  it('shows no overlap warning for a single plan', async () => {
    renderPlans([buildSavingPlan()]);

    await planGroup('Reserva mensal');

    expect(
      screen.queryByText(
        i18n.t('dashboard.savingPlans.overlap', { account: 'Nubank' }),
      ),
    ).not.toBeInTheDocument();
  });

  it('confirms a mandatory occurrence from the plan', async () => {
    const plan = buildSavingPlan();
    const [occurrence] = plan.mandatory.plannedOccurrences;
    const path = `PUT /recurrences/${plan.recurrence.uuid}/occurrences/${occurrence.uuid}/confirmation`;
    const { sent } = renderPlans([plan], {
      [path]: envelope(
        {
          uuid: occurrence.uuid,
          occurrenceDate: occurrence.date,
          date: occurrence.date,
          amount: occurrence.amount,
          description: plan.recurrence.description,
          state: 'COMPLETED',
          stateLabel: 'Realizada',
          completedOn: '2026-10-29',
          transactionUuid: null,
          purchaseUuid: null,
          movementUuid: 'movement',
          invoiceMonth: null,
        },
        'Aporte confirmado',
      ),
    });
    const group = await planGroup('Reserva mensal');

    fireEvent.click(
      within(group).getByRole('button', {
        name: i18n.t('dashboard.savingPlans.confirmOccurrence', {
          amount: money('700.00'),
          date: formatDateOnly('2026-10-15', i18n.language),
        }),
      }),
    );

    const dialog = await findDialog(
      i18n.t('recurrences.confirm.contributionDescription', {
        description: 'Reserva mensal',
      }),
    );

    save(dialog);

    expect(await screen.findByText('Aporte confirmado')).toBeInTheDocument();
    expect(requestBody(sent(path)[0])).toEqual({
      amount: '700.00',
      date: '2026-10-29',
    });
  });

  it('prefills the suggestion and records it only after the explicit action', async () => {
    const plan = buildSavingPlan();
    const { dialog, sent } = await openAccept(plan, {
      [acceptPath(plan)]: envelope(
        buildInvestmentMovement({ contributionKind: 'ADDITIONAL' }),
        'Aporte registrado',
      ),
    });

    expect(sent(acceptPath(plan))).toHaveLength(0);
    expect(
      within(dialog).getByLabelText(i18n.t('recurrences.additional.amount')),
    ).toHaveValue('600.00');
    expect(
      within(dialog).queryByText(
        i18n.t('recurrences.additional.exceedsSuggestion', {
          amount: money('600.00'),
        }),
      ),
    ).not.toBeInTheDocument();

    save(dialog);

    expect(await screen.findByText('Aporte registrado')).toBeInTheDocument();
    expect(requestBody(sent(acceptPath(plan))[0])).toEqual({
      year: 2026,
      month: 10,
      amount: '600.00',
      date: '2026-10-29',
      state: 'COMPLETED',
    });
  });

  it('warns when the amount is above the suggestion and sends the override', async () => {
    const plan = buildSavingPlan();
    const { dialog, sent } = await openAccept(plan, {
      [acceptPath(plan)]: envelope(
        buildInvestmentMovement({ contributionKind: 'ADDITIONAL' }),
        'Aporte registrado',
      ),
    });

    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('recurrences.additional.amount')),
      { target: { value: '650.00' } },
    );

    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.additional.exceedsSuggestion', {
          amount: money('600.00'),
        }),
      ),
    ).toBeInTheDocument();

    save(dialog);

    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.additional.overrideRequired'),
      ),
    ).toBeInTheDocument();
    expect(sent(acceptPath(plan))).toHaveLength(0);
    fireEvent.click(
      within(dialog).getByRole('checkbox', {
        name: i18n.t('recurrences.additional.allowExceedingSuggestion'),
      }),
    );
    save(dialog);

    expect(await screen.findByText('Aporte registrado')).toBeInTheDocument();
    expect(requestBody(sent(acceptPath(plan))[0])).toMatchObject({
      amount: expect.stringMatching(/^650(\.00?)?$/) as unknown,
      allowExceedingSuggestion: true,
    });
  });

  it('allows recording an amount when nothing is suggested', async () => {
    const { dialog } = await openAccept(
      buildSavingPlan({ suggestedAdditional: '0.00' }),
    );

    expect(
      within(dialog).getByText(i18n.t('recurrences.additional.noSuggestion')),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(i18n.t('recurrences.additional.amount')),
    ).toHaveValue('');
  });

  it('requires a fresh override acknowledgement after the amount changes, including a zero suggestion', async () => {
    const plan = buildSavingPlan({ suggestedAdditional: '0.00' });
    const { dialog, sent } = await openAccept(plan, {
      [acceptPath(plan)]: envelope(buildInvestmentMovement()),
    });
    const input = within(dialog).getByLabelText(
      i18n.t('recurrences.additional.amount'),
    );
    fireEvent.change(input, { target: { value: '10.00' } });
    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.additional.exceedsSuggestion', {
          amount: money('0.00'),
        }),
      ),
    ).toBeInTheDocument();
    const checkbox = within(dialog).getByRole('checkbox', {
      name: i18n.t('recurrences.additional.allowExceedingSuggestion'),
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.change(input, { target: { value: '20.00' } });
    await waitFor(() => expect(checkbox).not.toBeChecked());
    save(dialog);
    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.additional.overrideRequired'),
      ),
    ).toBeInTheDocument();
    expect(sent(acceptPath(plan))).toHaveLength(0);
  });

  it('refreshes shared-account suggestions after acceptance before another plan is accepted', async () => {
    const first = buildSavingPlan();
    const second = buildSavingPlan({
      recurrence: {
        ...first.recurrence,
        uuid: 'second-plan',
        description: 'Travel savings',
      },
    });
    let accepted = false;
    const dashboard = () =>
      envelope(
        buildDashboard({
          investments: investmentsWith({
            savingPlans: accepted
              ? [
                  buildSavingPlan({
                    canAcceptAdditional: false,
                    suggestedAdditional: '0.00',
                    additional: {
                      movementUuid: 'additional',
                      amount: '600.00',
                      state: 'COMPLETED',
                      stateLabel: 'Completed',
                      suggestedAmount: '600.00',
                    },
                  }),
                  {
                    ...second,
                    suggestedAdditional: '0.00',
                    balanceBeforeContribution: '900.00',
                  },
                ]
              : [first, second],
          }),
        }),
      );
    const { sent } = renderPlans([first, second], {
      'GET /dashboard': dashboard,
      [acceptPath(first)]: () => {
        accepted = true;
        return envelope(buildInvestmentMovement());
      },
    });
    const group = await planGroup(first.recurrence.description);
    fireEvent.click(
      within(group).getByRole('button', {
        name: i18n.t('dashboard.savingPlans.accept'),
      }),
    );
    const dialog = await findDialog(i18n.t('recurrences.additional.title'));
    save(dialog);
    const other = await planGroup(second.recurrence.description);
    await waitFor(() =>
      expect(
        amountOf(other, i18n.t('dashboard.savingPlans.suggested')),
      ).toHaveTextContent(money('0.00')),
    );
    expect(
      within(other).getByRole('button', {
        name: i18n.t('dashboard.savingPlans.accept'),
      }),
    ).toBeEnabled();
    expect(sent(acceptPath(second))).toHaveLength(0);
  });

  it('refreshes a stale open modal after rejection and requires explicit override consent', async () => {
    const plan = buildSavingPlan();
    let stale = false;
    const { dialog, sent } = await openAccept(plan, {
      'GET /dashboard': () =>
        envelope(
          buildDashboard({
            investments: investmentsWith({
              savingPlans: [
                { ...plan, suggestedAdditional: stale ? '0.00' : '600.00' },
              ],
            }),
          }),
        ),
      [acceptPath(plan)]: () => {
        stale = true;
        return { status: 409, data: { message: 'Suggestion changed' } };
      },
    });
    save(dialog);
    expect(await screen.findByText('Suggestion changed')).toBeInTheDocument();
    expect(
      await within(dialog).findByText(
        i18n.t('recurrences.additional.exceedsSuggestion', {
          amount: money('0.00'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('checkbox', {
        name: i18n.t('recurrences.additional.allowExceedingSuggestion'),
      }),
    ).not.toBeChecked();
    expect(requestBody(sent(acceptPath(plan))[0])).not.toHaveProperty(
      'allowExceedingSuggestion',
    );
  });

  it('offers only a planned state in a future month and surfaces the API error', async () => {
    const plan = buildSavingPlan({ month: '2026-11-01' });
    const { dialog, sent } = await openAccept(plan, {
      [acceptPath(plan)]: {
        status: 422,
        data: { message: 'Data anterior à abertura da conta' },
      },
    });

    expect(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.additional.states.PLANNED'),
      }),
    ).toBeChecked();
    expect(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.additional.states.COMPLETED'),
      }),
    ).toBeDisabled();

    save(dialog);

    expect(
      await screen.findByText('Data anterior à abertura da conta'),
    ).toBeInTheDocument();
    expect(requestBody(sent(acceptPath(plan))[0])).toEqual({
      year: 2026,
      month: 11,
      amount: '600.00',
      date: '2026-11-01',
      state: 'PLANNED',
    });
  });

  it('switches to planned when a later date of the current month is chosen', async () => {
    const { dialog } = await openAccept(buildSavingPlan());
    const input = within(dialog).getByLabelText(
      i18n.t('recurrences.additional.date'),
    );

    fireEvent.mouseDown(input);
    fireEvent.change(input, {
      target: {
        value: dayjs('2026-10-30').format(dateInputFormat(i18n.language)),
      },
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(
        within(dialog).getByRole('radio', {
          name: i18n.t('recurrences.additional.states.PLANNED'),
        }),
      ).toBeChecked();
    });
    expect(
      within(dialog).getByRole('radio', {
        name: i18n.t('recurrences.additional.states.COMPLETED'),
      }),
    ).toBeDisabled();
    expect(
      within(dialog).getByText(
        i18n.t('recurrences.additional.futureOnlyPlanned'),
      ),
    ).toBeInTheDocument();
  });

  it('shows a live additional contribution instead of offering another', async () => {
    renderPlans([
      buildSavingPlan({
        balanceBeforeContribution: '900.00',
        suggestedAdditional: '0.00',
        canAcceptAdditional: false,
        additional: {
          movementUuid: 'movement',
          amount: '600.00',
          state: 'PLANNED',
          stateLabel: 'Prevista',
          suggestedAmount: '600.00',
        },
      }),
    ]);
    const group = await planGroup('Reserva mensal');

    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.additional')),
    ).toHaveTextContent(money('600.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.total')),
    ).toHaveTextContent(money('1300.00'));
    expect(
      amountOf(group, i18n.t('dashboard.savingPlans.retained')),
    ).toHaveTextContent(money('200.00'));
    expect(
      within(group).queryByRole('button', {
        name: i18n.t('dashboard.savingPlans.accept'),
      }),
    ).not.toBeInTheDocument();
    expect(
      within(group).getByRole('link', {
        name: i18n.t('dashboard.savingPlans.viewMovements'),
      }),
    ).toBeInTheDocument();
  });
});
