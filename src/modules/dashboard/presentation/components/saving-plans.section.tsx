import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
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
import { DetailsLabel } from './details-collapse';

interface PlanFigureProps {
  label: string;
  children: ReactNode;
  detail?: string;
}

const PlanFigure = ({ label, children, detail }: PlanFigureProps) => (
  <Flex vertical style={{ flex: '1 1 160px' }}>
    <Typography.Text type="secondary">{label}</Typography.Text>
    {children}
    {detail && <Typography.Text type="secondary">{detail}</Typography.Text>}
  </Flex>
);

const PlanAmount = ({ label, amount }: { label: string; amount: string }) => (
  <PlanFigure label={label}>
    <MoneyText amount={amount} strong aria-label={label} />
  </PlanFigure>
);

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
  const hasActions =
    mandatory.plannedOccurrences.length > 0 ||
    canAcceptAdditional ||
    additional !== null;

  return (
    <Card size="small" role="group" aria-label={recurrence.description}>
      <Flex vertical gap="middle">
        <Flex vertical>
          <Typography.Text strong>{recurrence.description}</Typography.Text>
          <Typography.Text type="secondary">
            {t('dashboard.savingPlans.route', {
              account: account.name,
              investment: investment.name,
            })}
          </Typography.Text>
        </Flex>
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
        <Flex gap="large" wrap>
          <PlanFigure label={t('dashboard.savingPlans.mandatory')}>
            <Typography.Text strong>
              {t('dashboard.savingPlans.mandatoryDetail', {
                planned: money(mandatory.planned),
                completed: money(mandatory.completed),
              })}
            </Typography.Text>
          </PlanFigure>
          {additional ? (
            <PlanFigure
              label={t('dashboard.savingPlans.additional')}
              detail={t('dashboard.savingPlans.additionalOf', {
                amount: money(additional.suggestedAmount),
              })}
            >
              <Space size="small" wrap>
                <MoneyText
                  amount={additional.amount}
                  strong
                  aria-label={t('dashboard.savingPlans.additional')}
                />
                <Tag>{additional.stateLabel}</Tag>
              </Space>
            </PlanFigure>
          ) : (
            <PlanAmount
              label={t('dashboard.savingPlans.suggested')}
              amount={suggestedAdditional}
            />
          )}
          <PlanAmount
            label={t('dashboard.savingPlans.total')}
            amount={resultingTotalOf(plan)}
          />
          <PlanAmount
            label={t('dashboard.savingPlans.balanceForRemaining')}
            amount={plan.balanceBeforeContribution}
          />
          <PlanFigure
            label={t('dashboard.savingPlans.retained')}
            detail={t('dashboard.savingPlans.retainedMinimum', {
              amount: money(minimumRetainedBalance),
            })}
          >
            <MoneyText
              amount={retainedBalanceOf(plan)}
              strong
              aria-label={t('dashboard.savingPlans.retained')}
            />
          </PlanFigure>
        </Flex>
        {isPositiveMoney(cardObligations) && (
          <Typography.Text type="secondary">
            {t('dashboard.savingPlans.cardNote', {
              amount: money(cardObligations),
              account: account.name,
            })}
          </Typography.Text>
        )}
        {hasActions && (
          <Flex gap="small" align="center" wrap>
            {mandatory.plannedOccurrences.map((occurrence) => (
              <Space key={occurrence.uuid} size="small" wrap>
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
        )}
      </Flex>
    </Card>
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

export const SavingPlansLabel = ({ plans }: { plans: SavingPlan[] }) => {
  const { t } = useTranslation();
  const toConfirm = plans.flatMap(
    ({ mandatory }) => mandatory.plannedOccurrences,
  );
  const overdue = toConfirm.filter(({ overdue }) => overdue).length;

  return (
    <DetailsLabel
      title={t('dashboard.savingPlans.title')}
      counts={[
        {
          key: 'count',
          label: t('dashboard.savingPlans.count', { count: plans.length }),
        },
        toConfirm.length > 0 && {
          key: 'toConfirm',
          color: 'warning',
          label: t('dashboard.savingPlans.toConfirm', {
            count: toConfirm.length,
          }),
        },
        overdue > 0 && {
          key: 'overdue',
          color: 'error',
          label: t('dashboard.savingPlans.overdue', { count: overdue }),
        },
      ]}
    />
  );
};

export const SavingPlansSection = ({ plans }: { plans: SavingPlan[] }) => {
  const { t } = useTranslation();
  const confirming = useModalTarget<ConfirmingTarget>();
  const accepting = useModalTarget<string>();
  const acceptingPlan = plans.find(
    (plan) => plan.recurrence.uuid === accepting.target,
  );

  if (plans.length === 0) {
    return null;
  }

  return (
    <Flex vertical gap="small">
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
          onAccept={(target) => accepting.show(target.recurrence.uuid)}
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
        plan={acceptingPlan}
        onClose={accepting.close}
      />
    </Flex>
  );
};
