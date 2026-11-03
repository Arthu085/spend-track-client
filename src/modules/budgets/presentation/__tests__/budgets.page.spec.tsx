import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { AppRoutes } from '@/core/router/app-routes';
import {
  chooseOption,
  envelope,
  groceries,
  renderWithRoutes,
  save,
  type StubRoutes,
} from '@/modules/credit-cards/presentation/__tests__/credit-card-test-support';
import type { Dashboard } from '@/modules/dashboard/domain/dashboard.schema';
import { formatMonthLabel } from '@/shared/date/month-ref';
import { formatMoney } from '@/shared/money/money';
import { buildDashboard } from '@/test/dashboard-fixture';
import { findDialog } from '@/test/find-dialog';
import { requestBody } from '@/test/http-stub';
import type { Budget } from '../../domain/budget.schema';

const october = { year: 2026, month: 10 };
const septemberLabel = () =>
  formatMonthLabel({ year: 2026, month: 9 }, i18n.language);
const octoberLabel = () => formatMonthLabel(october, i18n.language);

const groceriesRef = {
  uuid: groceries.uuid,
  name: groceries.name,
  kind: groceries.kind,
  color: groceries.color,
  status: groceries.status,
};

const noBudget = (year: number, month: number): Budget => ({
  year,
  month,
  totalLimit: null,
  categoryLimits: [],
  updatedAt: null,
});

const savedBudget: Budget = {
  year: 2026,
  month: 10,
  totalLimit: '3000.00',
  categoryLimits: [{ category: groceriesRef, limit: '800.00' }],
  updatedAt: '2026-10-02T10:00:00.000Z',
};

const overspentDashboard: Dashboard = buildDashboard({
  expenses: { total: '3200.00', completed: '2700.00', pending: '500.00' },
  budget: {
    overall: {
      limit: '3000.00',
      total: '3200.00',
      completed: '2700.00',
      pending: '500.00',
      remaining: '0.00',
      overspent: '200.00',
    },
    categories: [
      {
        category: {
          uuid: groceries.uuid,
          name: groceries.name,
          color: groceries.color,
        },
        limit: '800.00',
        total: '300.00',
        completed: '300.00',
        pending: '0.00',
        remaining: '500.00',
        overspent: '0.00',
      },
    ],
  },
  spendingGuidance: {
    basis: 'BUDGET',
    remaining: '0.00',
    dailyAllowance: '0.00',
  },
});

const money = (amount: string) => formatMoney(amount, i18n.language);

const dashboardOfMonth =
  (dashboard: Dashboard) =>
  ({ params }: InternalAxiosRequestConfig) => {
    const { year, month } = params as { year: number; month: number };

    return envelope({
      ...dashboard,
      period: { ...dashboard.period, year, month },
    });
  };

const renderBudgets = (routes: StubRoutes = {}) =>
  renderWithRoutes(AppRoutes.BUDGETS, {
    'GET /budgets/2026/10': envelope(noBudget(2026, 10)),
    'GET /dashboard': dashboardOfMonth(buildDashboard()),
    ...routes,
  });

const clickButton = async (name: string) => {
  fireEvent.click(
    await screen.findByRole('button', { name: new RegExp(name) }),
  );
};

const budgetDialog = () =>
  findDialog(i18n.t('budgets.form.title', { month: octoberLabel() }));

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the current month and shows the balance guidance without a budget', async () => {
    const { sent } = renderBudgets();

    expect(
      await screen.findByRole('heading', { name: octoberLabel() }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(i18n.t('dashboard.budget.empty')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('dashboard.budget.guidance.BALANCE')),
    ).toBeInTheDocument();
    expect(sent('GET /dashboard')[0].params).toEqual(october);
  });

  it('creates a budget with an overall and a category limit', async () => {
    const { sent } = renderBudgets({
      'PUT /budgets/2026/10': envelope(savedBudget, 'Orçamento salvo'),
    });

    await clickButton(i18n.t('budgets.actions.create'));
    const dialog = await budgetDialog();
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('budgets.fields.totalLimit')),
      { target: { value: '3000.50' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: new RegExp(i18n.t('budgets.actions.addCategoryLimit')),
      }),
    );
    await chooseOption(dialog, i18n.t('budgets.fields.category'), 'Mercado');
    fireEvent.change(
      within(dialog).getByLabelText(i18n.t('budgets.fields.limit')),
      { target: { value: '800' } },
    );
    save(dialog);

    await waitFor(() => {
      expect(sent('PUT /budgets/2026/10')).toHaveLength(1);
    });
    expect(requestBody(sent('PUT /budgets/2026/10')[0])).toEqual({
      totalLimit: '3000.5',
      categoryLimits: [{ categoryUuid: groceries.uuid, limit: '800' }],
    });
  });

  it('asks for at least one limit before saving', async () => {
    const { sent } = renderBudgets();

    await clickButton(i18n.t('budgets.actions.create'));
    const dialog = await budgetDialog();
    save(dialog);

    expect(
      await within(dialog).findByText(i18n.t('budgets.validation.empty')),
    ).toBeInTheDocument();
    expect(sent('PUT /budgets/2026/10')).toHaveLength(0);
  });

  it('copies the previous month into a new budget', async () => {
    const { sent } = renderBudgets({
      'GET /budgets/2026/9': envelope({ ...savedBudget, month: 9 }),
      'PUT /budgets/2026/10': envelope(savedBudget, 'Orçamento salvo'),
    });

    await clickButton(i18n.t('budgets.actions.copyPrevious'));
    const dialog = await budgetDialog();
    await waitFor(() => {
      expect(within(dialog).getByTitle('Mercado')).toBeInTheDocument();
    });
    save(dialog);

    await waitFor(() => {
      expect(sent('PUT /budgets/2026/10')).toHaveLength(1);
    });
    expect(requestBody(sent('PUT /budgets/2026/10')[0])).toEqual({
      totalLimit: '3000.00',
      categoryLimits: [{ categoryUuid: groceries.uuid, limit: '800.00' }],
    });
  });

  it('tells when the previous month has nothing to copy', async () => {
    renderBudgets({ 'GET /budgets/2026/9': envelope(noBudget(2026, 9)) });

    await clickButton(i18n.t('budgets.actions.copyPrevious'));

    expect(
      await screen.findByText(
        i18n.t('budgets.copy.empty', { month: septemberLabel() }),
      ),
    ).toBeInTheDocument();
  });

  it('shows overspending against the limits and deletes the budget after confirmation', async () => {
    const { sent } = renderBudgets({
      'GET /budgets/2026/10': envelope(savedBudget),
      'GET /dashboard': dashboardOfMonth(overspentDashboard),
      'DELETE /budgets/2026/10': envelope(null, 'Orçamento excluído'),
    });

    expect(
      await screen.findByText(
        i18n.t('dashboard.budget.overspent', { amount: money('200.00') }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        i18n.t('dashboard.budget.remaining', { amount: money('500.00') }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(i18n.t('dashboard.budget.guidance.daily')),
    ).toHaveTextContent(money('0.00'));

    await clickButton(i18n.t('budgets.actions.delete'));
    const confirmation = await findDialog(
      i18n.t('budgets.delete.title', { month: octoberLabel() }),
    );
    fireEvent.click(
      within(confirmation).getByRole('button', {
        name: i18n.t('budgets.actions.delete'),
      }),
    );

    await waitFor(() => {
      expect(sent('DELETE /budgets/2026/10')).toHaveLength(1);
    });
  });
});
