import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { formatMoney } from '@/shared/money/money';
import type { DashboardAmounts } from '../../domain/dashboard.schema';
import { CashFlowSummary } from '../components/cash-flow-summary';

const signedMoney = (amount: string) =>
  formatMoney(amount, i18n.language, 'exceptZero');

const signedPercent = (percent: number) =>
  new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    signDisplay: 'exceptZero',
  }).format(percent / 100);

const renderSummary = (income: DashboardAmounts, expenses: DashboardAmounts) =>
  render(<CashFlowSummary income={income} expenses={expenses} />);

const figure = (key: 'title' | 'savingsRate' | 'completed') =>
  screen.getByLabelText(i18n.t(`dashboard.net.${key}`));

describe('CashFlowSummary', () => {
  it('shows a positive net result with its savings rate and realized part', () => {
    renderSummary(
      { total: '5000.00', completed: '3000.00', pending: '2000.00' },
      { total: '1200.10', completed: '800.00', pending: '400.10' },
    );

    expect(figure('title')).toHaveTextContent(signedMoney('3799.90'));
    expect(figure('title')).toHaveClass('ant-typography-success');
    expect(figure('savingsRate')).toHaveTextContent(signedPercent(76));
    expect(figure('savingsRate')).toHaveClass('ant-typography-success');
    expect(figure('completed')).toHaveTextContent(signedMoney('2200.00'));
    expect(screen.getByLabelText(i18n.t('dashboard.income.title'))).toHaveClass(
      'ant-typography-success',
    );
  });

  it('marks a negative net result and savings rate as errors', () => {
    renderSummary(
      { total: '1000.00', completed: '1000.00', pending: '0.00' },
      { total: '1250.00', completed: '900.00', pending: '350.00' },
    );

    expect(figure('title')).toHaveTextContent(signedMoney('-250.00'));
    expect(figure('title')).toHaveClass('ant-typography-danger');
    expect(figure('savingsRate')).toHaveTextContent(signedPercent(-25));
    expect(figure('savingsRate')).toHaveClass('ant-typography-danger');
    expect(figure('completed')).toHaveTextContent(signedMoney('100.00'));
  });

  it('shows no savings rate without income', () => {
    renderSummary(
      { total: '0.00', completed: '0.00', pending: '0.00' },
      { total: '300.00', completed: '300.00', pending: '0.00' },
    );

    expect(figure('title')).toHaveTextContent(signedMoney('-300.00'));
    expect(figure('savingsRate')).toHaveTextContent('—');
    expect(figure('savingsRate')).not.toHaveTextContent('%');
  });
});
