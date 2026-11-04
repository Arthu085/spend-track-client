import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes, investmentMovementsPath } from '@/core/router/app-routes';
import {
  chooseOption,
  envelope,
  findRow,
  listPage,
  nubank,
  renderWithRoutes,
  save,
  type StubRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { formatMoney } from '@/shared/money/money';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import { buildInvestment, buildInvestmentMovement } from './investment-fixture';

const trip = buildInvestment();
const reserve = buildInvestment({
  uuid: '9c3d4e5f-9999-4c3e-9f1a-1a2b3c4d5e6f',
  name: 'Reserva',
  type: 'RESERVE',
  typeLabel: 'Reserva',
  targetAmount: null,
  progress: null,
  currentValue: '800.00',
  status: 'INACTIVE',
  statusLabel: 'Inativo',
});

const money = (amount: string) => formatMoney(amount, i18n.language);

const renderInvestments = (routes: StubRoutes = {}) =>
  renderWithRoutes(AppRoutes.INVESTMENTS, {
    'GET /investments': listPage([trip, reserve]),
    ...routes,
  });

type RowAction = 'contribute' | 'valuate' | 'delete';

const clickAction = async (action: RowAction) => {
  const row = await findRow(trip.uuid);
  fireEvent.click(
    within(row).getByRole('button', {
      name: i18n.t(`investments.actions.${action}`, { name: trip.name }),
    }),
  );
};

describe('InvestmentsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists active investments with their value and target progress', async () => {
    const { sent } = renderInvestments();

    const row = await findRow(trip.uuid);
    expect(within(row).getByText(money('1500.00'))).toBeInTheDocument();
    expect(
      within(row).getByText(
        i18n.t('investments.targetRemaining', {
          remaining: money('4500.00'),
          target: money('6000.00'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      within(await findRow(reserve.uuid)).getByText(
        i18n.t('investments.noTarget'),
      ),
    ).toBeInTheDocument();
    expect(sent('GET /investments')[0].params).toMatchObject({
      status: 'ACTIVE',
    });
  });

  describe('archiving', () => {
    const pendingPath = `GET /investments/${trip.uuid}/pending-operations`;
    const statusPath = `PUT /investments/${trip.uuid}/status`;
    const archived = envelope(
      { ...trip, status: 'INACTIVE', statusLabel: 'Inativo' },
      'Investimento atualizado',
    );

    const toggle = async () => {
      fireEvent.click(
        within(await findRow(trip.uuid)).getByRole('switch', {
          name: i18n.t('investments.actions.toggleStatus', { name: trip.name }),
        }),
      );
    };

    it('archives directly when nothing is planned', async () => {
      const { sent } = renderInvestments({
        [pendingPath]: envelope({ count: 0, total: '0.00' }),
        [statusPath]: archived,
      });

      await toggle();

      await waitFor(() => {
        expect(sent(statusPath)).toHaveLength(1);
      });
      expect(requestBody(sent(statusPath)[0])).toEqual({ status: 'INACTIVE' });
    });

    it.each([
      ['KEEP', 'pendingOperations.keep'],
      ['CANCEL', 'pendingOperations.cancel'],
    ] as const)(
      'shows the count and total of planned movements and sends %s',
      async (decision, label) => {
        const { sent } = renderInvestments({
          [pendingPath]: envelope({ count: 1, total: '150.00' }),
          [statusPath]: archived,
        });

        await toggle();

        const dialog = await findDialog(
          i18n.t('investments.archive.description'),
        );
        expect(
          within(dialog).getByText(
            i18n.t('pendingOperations.summary', {
              count: 1,
              total: money('150.00'),
            }),
          ),
        ).toBeInTheDocument();

        fireEvent.click(
          within(dialog).getByRole('button', { name: i18n.t(label) }),
        );

        await waitFor(() => {
          expect(sent(statusPath)).toHaveLength(1);
        });
        expect(requestBody(sent(statusPath)[0])).toEqual({
          status: 'INACTIVE',
          pendingOperations: decision,
        });
      },
    );

    it('reactivates without asking about planned movements', async () => {
      const reservePath = `PUT /investments/${reserve.uuid}/status`;
      const { sent } = renderInvestments({
        [reservePath]: envelope(
          { ...reserve, status: 'ACTIVE', statusLabel: 'Ativo' },
          'Investimento atualizado',
        ),
      });

      fireEvent.click(
        within(await findRow(reserve.uuid)).getByRole('switch', {
          name: i18n.t('investments.actions.toggleStatus', {
            name: reserve.name,
          }),
        }),
      );

      await waitFor(() => {
        expect(sent(reservePath)).toHaveLength(1);
      });
      expect(requestBody(sent(reservePath)[0])).toEqual({ status: 'ACTIVE' });
    });
  });

  it('creates a goal with a target amount', async () => {
    const { sent } = renderInvestments({
      'POST /investments': envelope(trip, 'Investimento criado'),
    });

    fireEvent.click(
      await screen.findByRole('button', {
        name: new RegExp(i18n.t('investments.create.title')),
      }),
    );
    const dialog = await findDialog(i18n.t('investments.create.title'));
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('investments.fields.name')),
      { target: { value: 'Viagem' } },
    );
    await chooseOption(
      dialog,
      i18n.t('investments.fields.type'),
      i18n.t('investments.types.GOAL'),
    );
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('investments.fields.targetAmount')),
      { target: { value: '6000' } },
    );
    save(dialog);

    await waitFor(() => {
      expect(sent('POST /investments')).toHaveLength(1);
    });
    expect(requestBody(sent('POST /investments')[0])).toEqual({
      name: 'Viagem',
      type: 'GOAL',
      targetAmount: '6000',
    });
  });

  it('contributes from the default account as a completed movement today', async () => {
    const path = `POST /investments/${trip.uuid}/movements`;
    const { sent } = renderInvestments({
      [path]: envelope(buildInvestmentMovement(), 'Aporte registrado'),
    });

    await clickAction('contribute');
    const dialog = await findDialog(
      i18n.t('investments.movement.title.CONTRIBUTION', { name: trip.name }),
    );
    await waitFor(() => {
      expect(within(dialog).getByTitle(nubank.name)).toBeInTheDocument();
    });
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('investments.fields.amount')),
      { target: { value: '500' } },
    );
    save(dialog);

    await waitFor(() => {
      expect(sent(path)).toHaveLength(1);
    });
    expect(requestBody(sent(path)[0])).toEqual({
      type: 'CONTRIBUTION',
      accountUuid: nubank.uuid,
      amount: '500',
      date: '2026-10-29',
      state: 'COMPLETED',
    });
  });

  it('updates the value of an investment without choosing an account', async () => {
    const path = `POST /investments/${trip.uuid}/valuations`;
    const { sent } = renderInvestments({
      [path]: envelope(
        buildInvestmentMovement({
          type: 'VALUATION',
          amount: '120.00',
          account: null,
        }),
        'Valor atualizado',
      ),
    });

    await clickAction('valuate');
    const dialog = await findDialog(
      i18n.t('investments.valuation.title', { name: trip.name }),
    );
    expect(
      within(dialog).queryByLabelText(
        i18n.t('investments.movement.account.CONTRIBUTION'),
      ),
    ).not.toBeInTheDocument();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('investments.fields.newValue')),
      { target: { value: '1620' } },
    );
    save(dialog);

    await waitFor(() => {
      expect(sent(path)).toHaveLength(1);
    });
    expect(requestBody(sent(path)[0])).toEqual({
      value: '1620',
      date: '2026-10-29',
    });
  });

  it('blocks movements on an inactive investment but keeps its history', async () => {
    const { router } = renderInvestments();

    const row = await findRow(reserve.uuid);
    for (const key of [
      'investments.actions.contribute',
      'investments.actions.withdraw',
      'investments.actions.valuate',
    ] as const) {
      expect(
        within(row).getByRole('button', {
          name: i18n.t(key, { name: reserve.name }),
        }),
      ).toBeDisabled();
    }

    fireEvent.click(
      within(row).getByRole('link', {
        name: i18n.t('investments.actions.history', { name: reserve.name }),
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        investmentMovementsPath(reserve.uuid),
      );
    });
  });

  it('explains why an investment with movements cannot be deleted', async () => {
    renderInvestments({
      [`DELETE /investments/${trip.uuid}`]: {
        status: 409,
        data: {
          statusCode: 409,
          message:
            'O investimento tem movimentações. Inative-o em vez de excluir.',
        },
      },
    });

    await clickAction('delete');
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('common.delete') }),
    );

    expect(await findDialog(i18n.t('feedback.error'))).toHaveTextContent(
      'O investimento tem movimentações. Inative-o em vez de excluir.',
    );
  });
});
