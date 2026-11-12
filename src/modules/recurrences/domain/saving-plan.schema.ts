import { z } from 'zod';
import { investmentTypeSchema } from '@/modules/investments/domain/investment.schema';
import {
  transactionAccountSchema,
  transactionStateSchema,
} from '@/modules/transactions/domain/transaction.schema';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import {
  centsToMoney,
  isPositiveMoney,
  moneySchema,
  moneyToCents,
  sumMoney,
} from '@/shared/money/money';
import {
  additionalContributionStrategySchema,
  recurrenceFrequencySchema,
  recurrenceStateSchema,
} from './recurrence.schema';

export const savingPlanSchema = z.object({
  recurrence: z.object({
    uuid: z.string(),
    description: z.string(),
    frequency: recurrenceFrequencySchema,
    frequencyLabel: z.string(),
    amount: moneySchema,
    state: recurrenceStateSchema,
    stateLabel: z.string(),
  }),
  investment: z.object({
    uuid: z.string(),
    name: z.string(),
    type: investmentTypeSchema,
    typeLabel: z.string(),
    status: recordStatusSchema,
  }),
  account: transactionAccountSchema,
  month: z.iso.date(),
  actualBalance: moneySchema,
  plannedTransactions: moneySchema,
  otherInvestmentMovements: moneySchema,
  cardObligations: moneySchema,
  balanceBeforeContribution: moneySchema,
  minimumRetainedBalance: moneySchema,
  distributable: moneySchema,
  shortfall: moneySchema,
  additionalContribution: additionalContributionStrategySchema,
  additionalContributionLabel: z.string(),
  mandatory: z.object({
    planned: moneySchema,
    completed: moneySchema,
    plannedOccurrences: z.array(
      z.object({
        uuid: z.string(),
        date: z.iso.date(),
        amount: moneySchema,
        overdue: z.boolean(),
      }),
    ),
  }),
  suggestedAdditional: moneySchema,
  additional: z
    .object({
      movementUuid: z.string(),
      amount: moneySchema,
      state: transactionStateSchema,
      stateLabel: z.string(),
      suggestedAmount: moneySchema,
    })
    .nullable(),
  canAcceptAdditional: z.boolean(),
});

export type SavingPlan = z.infer<typeof savingPlanSchema>;
export type SavingPlanOccurrence =
  SavingPlan['mandatory']['plannedOccurrences'][number];

export const resultingTotalOf = ({
  mandatory,
  additional,
  suggestedAdditional,
}: Pick<SavingPlan, 'mandatory' | 'additional' | 'suggestedAdditional'>) =>
  sumMoney([
    mandatory.completed,
    mandatory.planned,
    additional?.amount ?? suggestedAdditional,
  ]);

export const retainedBalanceOf = ({
  balanceBeforeContribution,
  mandatory,
  suggestedAdditional,
}: Pick<
  SavingPlan,
  'balanceBeforeContribution' | 'mandatory' | 'suggestedAdditional'
>) =>
  centsToMoney(
    moneyToCents(balanceBeforeContribution) -
      moneyToCents(mandatory.planned) -
      moneyToCents(suggestedAdditional),
  );

export const accountsWithOverlappingSuggestions = (
  plans: Pick<SavingPlan, 'account' | 'suggestedAdditional'>[],
): string[] => {
  const suggesting = plans.filter(({ suggestedAdditional }) =>
    isPositiveMoney(suggestedAdditional),
  );

  return [
    ...new Set(
      suggesting
        .filter(
          ({ account }) =>
            suggesting.filter((plan) => plan.account.uuid === account.uuid)
              .length > 1,
        )
        .map(({ account }) => account.name),
    ),
  ];
};

export interface PlannedContribution {
  plan: SavingPlan;
  occurrence: SavingPlanOccurrence;
}

export const nextPlannedContributionOf = (
  plans: SavingPlan[],
  investmentUuid: string,
): PlannedContribution | undefined =>
  plans
    .filter((plan) => plan.investment.uuid === investmentUuid)
    .flatMap((plan) =>
      plan.mandatory.plannedOccurrences.map((occurrence) => ({
        plan,
        occurrence,
      })),
    )
    .sort((left, right) =>
      left.occurrence.date.localeCompare(right.occurrence.date),
    )[0];
