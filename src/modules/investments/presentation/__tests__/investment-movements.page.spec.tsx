import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { investmentMovementsPath } from '@/core/router/app-routes';
import {
  envelope,
  findRow,
  listPage,
  renderWithRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import { formatMoney } from '@/shared/money/money';
import { requestBody } from '@/test/http-stub';
import { buildInvestment, buildInvestmentMovement } from './investment-fixture';

const investment = buildInvestment();
const movementsPath = `/investments/${investment.uuid}/movements`;

const plannedWithdrawal = buildInvestmentMovement({
  uuid: 'a1a1a1a1-0001-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'WITHDRAWAL',
  typeLabel: 'Resgate',
  amount: '200.00',
  date: '2026-10-25',
  state: 'PLANNED',
  stateLabel: 'Prevista',
  completedOn: null,
});
const contribution = buildInvestmentMovement();
const valuation = buildInvestmentMovement({
  uuid: 'b2b2b2b2-0002-4c3e-9f1a-1a2b3c4d5e6f',
  type: 'VALUATION',
  typeLabel: 'Atualização de valor',
  amount: '-50.00',
  account: null,
});

const money = (amount: string) => formatMoney(amount, i18n.language);

const renderMovements = (routes = {}) =>
  renderWithRoutes(investmentMovementsPath(investment.uuid), {
    [`GET ${movementsPath}`]: listPage([
      plannedWithdrawal,
      contribution,
      valuation,
    ]),
    ...routes,
  });

describe('InvestmentMovementsPage', () => {
  it('lists every movement with its signed amount and account', async () => {
    renderMovements();

    const withdrawal = await findRow(plannedWithdrawal.uuid);
    expect(within(withdrawal).getByText(money('-200.00'))).toBeInTheDocument();
    expect(within(withdrawal).getByText('Nubank')).toBeInTheDocument();
    expect(
      within(await findRow(valuation.uuid)).getByText(money('-50.00')),
    ).toBeInTheDocument();
    expect(
      within(await findRow(valuation.uuid)).getByText('—'),
    ).toBeInTheDocument();
  });

  it('confirms a planned movement', async () => {
    const path = `PUT ${movementsPath}/${plannedWithdrawal.uuid}/state`;
    const { sent } = renderMovements({
      [path]: envelope(
        { ...plannedWithdrawal, state: 'COMPLETED', stateLabel: 'Efetivada' },
        'Movimentação confirmada',
      ),
    });

    const row = await findRow(plannedWithdrawal.uuid);
    expect(
      within(await findRow(contribution.uuid)).queryByRole('button', {
        name: i18n.t('investments.actions.confirmMovement', {
          type: contribution.typeLabel,
        }),
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('investments.actions.confirmMovement', {
          type: plannedWithdrawal.typeLabel,
        }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('investments.actions.confirm'),
      }),
    );

    await waitFor(() => {
      expect(sent(path)).toHaveLength(1);
    });
    expect(requestBody(sent(path)[0])).toEqual({ state: 'COMPLETED' });
  });

  it('cancels a completed movement', async () => {
    const path = `PUT ${movementsPath}/${contribution.uuid}/state`;
    const { sent } = renderMovements({
      [path]: envelope(
        { ...contribution, state: 'CANCELED', stateLabel: 'Cancelada' },
        'Movimentação cancelada',
      ),
    });

    const row = await findRow(contribution.uuid);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('investments.actions.cancelMovement', {
          type: contribution.typeLabel,
        }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: i18n.t('investments.actions.cancel'),
      }),
    );

    await waitFor(() => {
      expect(sent(path)).toHaveLength(1);
    });
    expect(requestBody(sent(path)[0])).toEqual({ state: 'CANCELED' });
  });
});
