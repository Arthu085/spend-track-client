import { describe, expect, it } from 'vitest';
import { buildSavingPlan } from '@/test/saving-plan-fixture';
import {
  accountsWithOverlappingSuggestions,
  resultingTotalOf,
  retainedBalanceOf,
  savingPlanSchema,
} from '../saving-plan.schema';

const noOccurrences = { plannedOccurrences: [] };

describe('saving plan figures', () => {
  it('accepts a plan as the API returns it', () => {
    expect(savingPlanSchema.safeParse(buildSavingPlan()).success).toBe(true);
  });

  it.each([
    ['before anything is confirmed', buildSavingPlan()],
    [
      'after the mandatory contribution is confirmed',
      buildSavingPlan({
        balanceBeforeContribution: '800.00',
        mandatory: { planned: '0.00', completed: '700.00', ...noOccurrences },
      }),
    ],
    [
      'after the additional contribution is accepted as planned',
      buildSavingPlan({
        balanceBeforeContribution: '900.00',
        suggestedAdditional: '0.00',
        additional: {
          movementUuid: 'movement',
          amount: '600.00',
          state: 'PLANNED',
          stateLabel: 'Prevista',
          suggestedAmount: '600.00',
        },
      }),
    ],
  ])('keeps the total and the retained balance %s', (_stage, plan) => {
    expect(resultingTotalOf(plan)).toBe('1300.00');
    expect(retainedBalanceOf(plan)).toBe('200.00');
  });

  it('shows a negative retained balance when the mandatory contribution does not fit', () => {
    expect(
      retainedBalanceOf(
        buildSavingPlan({
          balanceBeforeContribution: '500.00',
          suggestedAdditional: '0.00',
        }),
      ),
    ).toBe('-200.00');
  });
});

describe('accountsWithOverlappingSuggestions', () => {
  const other = { uuid: 'other', name: 'Itaú', status: 'ACTIVE' as const };

  it('names an account only when several of its plans suggest something', () => {
    expect(
      accountsWithOverlappingSuggestions([
        buildSavingPlan(),
        buildSavingPlan(),
        buildSavingPlan({ account: other }),
      ]),
    ).toEqual(['Nubank']);
  });

  it('ignores plans without a suggestion', () => {
    expect(
      accountsWithOverlappingSuggestions([
        buildSavingPlan(),
        buildSavingPlan({ suggestedAdditional: '0.00' }),
      ]),
    ).toEqual([]);
  });
});
