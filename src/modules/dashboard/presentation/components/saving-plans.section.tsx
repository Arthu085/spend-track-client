import {
  Alert,
  Button,
  Card,
  Descriptions,
  Flex,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { investmentMovementsPath } from '@/core/router/app-routes';
import {
  accountsWithOverlappingSuggestions,
  resultingTotalOf,
  retainedBalanceOf,
  type SavingPlan,
  type SavingPlanOccurrence,
} from '@/modules/recurrences/domain/saving-plan.schema';
import { AcceptAdditionalContributionModal } from '@/modules/recurrences/presentation/components/accept-additional-contribution.modal';
import { OccurrenceFormModal } from '@/modules/recurrences/presentation/components/occurrence-form.modal';
import { formatDateOnly } from '@/shared/date/date-only';
import { useModalTarget } from '@/shared/forms/use-modal-target';
import { formatMoney, isPositiveMoney } from '@/shared/money/money';
import { MoneyText } from '@/shared/money/money-text';

interface SavingPlanCardProps {
  plan: SavingPlan;
  onConfirm: (plan: SavingPlan, occurrence: SavingPlanOccurrence) => void;
  onAccept: (plan: SavingPlan) => void;
}

const SavingPlanCard = ({ plan, onConfirm, onAccept }: SavingPlanCardProps) => {
  const { t, i18n } = useTranslation();
  const money = (amount: string) => formatMoney(amount, i18n.language);
  const {
    recurrence,
    investment,
    account,
    mandatory,
    additional,
    shortfall,
    suggestedAdditional,
    cardObligations,
    minimumRetainedBalance,
    canAcceptAdditional,
  } = plan;
  const labelled = (key: string, label: string, amount: string) => ({
    key,
    label,
    children: <MoneyText amount={amount} aria-label={label} />,
  });

  return (
    <div role="group" aria-label={recurrence.description}>
      <Card size="small" title={recurrence.description}>
        <Flex vertical gap="small">
          <Typography.Text type="secondary">
            {t('dashboard.savingPlans.route', {
              account: account.name,
              investment: investment.name,
            })}
          </Typography.Text>
          {isPositiveMoney(shortfall) && (
            <Alert
              type="error"
              showIcon
              title={t('dashboard.savingPlans.shortfall', {
                amount: money(shortfall),
                account: account.name,
              })}
            />
          )}
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, lg: 3 }}
            items={[
              labelled(
                'balanceBefore',
                t('dashboard.savingPlans.balanceBefore'),
                plan.balanceBeforeContribution,
              ),
              {
                key: 'mandatory',
                label: t('dashboard.savingPlans.mandatory'),
                children: t('dashboard.savingPlans.mandatoryDetail', {
                  planned: money(mandatory.planned),
                  completed: money(mandatory.completed),
                }),
              },
              additional
                ? {
                    key: 'additional',
                    label: t('dashboard.savingPlans.additional'),
                    children: (
                      <Space size="small" wrap>
                        <MoneyText
                          amount={additional.amount}
                          aria-label={t('dashboard.savingPlans.additional')}
                        />
                        <Tag>{additional.stateLabel}</Tag>
                        <Typography.Text type="secondary">
                          {t('dashboard.savingPlans.additionalOf', {
                            amount: money(additional.suggestedAmount),
                          })}
                        </Typography.Text>
                      </Space>
                    ),
                  }
                : labelled(
                    'suggested',
                    t('dashboard.savingPlans.suggested'),
                    suggestedAdditional,
                  ),
              labelled(
                'total',
                t('dashboard.savingPlans.total'),
                resultingTotalOf(plan),
              ),
              {
                key: 'retained',
                label: t('dashboard.savingPlans.retained'),
                children: (
                  <Space size="small" wrap>
                    <MoneyText
                      amount={retainedBalanceOf(plan)}
                      aria-label={t('dashboard.savingPlans.retained')}
                    />
                    <Typography.Text type="secondary">
                      {t('dashboard.savingPlans.retainedMinimum', {
                        amount: money(minimumRetainedBalance),
                      })}
                    </Typography.Text>
                  </Space>
                ),
              },
            ]}
          />
          {isPositiveMoney(cardObligations) && (
            <Typography.Text type="secondary">
              {t('dashboard.savingPlans.cardNote', {
                amount: money(cardObligations),
                account: account.name,
              })}
            </Typography.Text>
          )}
          <Flex gap="small" align="center" wrap>
            {mandatory.plannedOccurrences.map((occurrence) => (
              <Space key={occurrence.uuid} size="small">
                <Button
                  size="small"
                  onClick={() => onConfirm(plan, occurrence)}
                >
                  {t('dashboard.savingPlans.confirmOccurrence', {
                    amount: money(occurrence.amount),
                    date: formatDateOnly(occurrence.date, i18n.language),
                  })}
                </Button>
                {occurrence.overdue && (
                  <Tag color="error">{t('transactions.overdue')}</Tag>
                )}
              </Space>
            ))}
            {canAcceptAdditional && (
              <Button
                size="small"
                type="primary"
                onClick={() => onAccept(plan)}
              >
                {t('dashboard.savingPlans.accept')}
              </Button>
            )}
            {additional && (
              <Link to={investmentMovementsPath(investment.uuid)}>
                {t('dashboard.savingPlans.viewMovements')}
              </Link>
            )}
          </Flex>
        </Flex>
      </Card>
    </div>
  );
};

interface ConfirmingTarget {
  plan: SavingPlan;
  occurrence: SavingPlanOccurrence;
}

const contributionOf = (recurrence?: SavingPlan['recurrence']) => ({
  uuid: recurrence?.uuid ?? '',
  type: 'INVESTMENT_CONTRIBUTION' as const,
  description: recurrence?.description ?? '',
  endDate: null,
  creditCard: null,
});

export const SavingPlansSection = ({ plans }: { plans: SavingPlan[] }) => {
  const { t } = useTranslation();
  const confirming = useModalTarget<ConfirmingTarget>();
  const accepting = useModalTarget<SavingPlan>();

  if (plans.length === 0) {
    return null;
  }

  return (
    <Flex vertical gap="small">
      <Typography.Text strong>
        {t('dashboard.savingPlans.title')}
      </Typography.Text>
      <Typography.Text type="secondary">
        {t('dashboard.savingPlans.hint')}
      </Typography.Text>
      {accountsWithOverlappingSuggestions(plans).map((account) => (
        <Alert
          key={account}
          type="warning"
          showIcon
          title={t('dashboard.savingPlans.overlap', { account })}
        />
      ))}
      {plans.map((plan) => (
        <SavingPlanCard
          key={plan.recurrence.uuid}
          plan={plan}
          onConfirm={(target, occurrence) => {
            confirming.show({ plan: target, occurrence });
          }}
          onAccept={accepting.show}
        />
      ))}
      <OccurrenceFormModal
        open={confirming.open}
        recurrence={contributionOf(confirming.target?.plan.recurrence)}
        target={
          confirming.target && {
            action: 'confirm',
            occurrence: confirming.target.occurrence,
          }
        }
        onClose={confirming.close}
      />
      <AcceptAdditionalContributionModal
        open={accepting.open}
        plan={accepting.target}
        onClose={accepting.close}
      />
    </Flex>
  );
};
