import i18n from '@/core/i18n/i18n.config';
import type { Ability } from '../../domain/ability.schema';

export const getActionLabel = ({
  action,
  actionLabel,
}: Pick<Ability, 'action' | 'actionLabel'>): string =>
  actionLabel ??
  new Map(
    Object.entries(i18n.t('authorization.actions', { returnObjects: true })),
  ).get(action) ??
  action;

export const getSubjectLabel = ({
  subject,
  subjectLabel,
}: Pick<Ability, 'subject' | 'subjectLabel'>): string =>
  subjectLabel ??
  new Map(
    Object.entries(i18n.t('authorization.subjects', { returnObjects: true })),
  ).get(subject) ??
  subject;
