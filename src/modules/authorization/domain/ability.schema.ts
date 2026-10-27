import { z } from 'zod';

export const actionSchema = z.string().min(1);

export const subjectSchema = z.string().min(1);

export const abilitySchema = z.object({
  action: actionSchema,
  subject: subjectSchema,
  actionLabel: z.string().optional(),
  subjectLabel: z.string().optional(),
});

export type Action = z.infer<typeof actionSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Ability = z.infer<typeof abilitySchema>;

export interface SubjectAbilities {
  subject: Subject;
  actions: Action[];
}

export const hasAbility = (
  abilities: readonly Ability[],
  required: Ability,
): boolean =>
  abilities.some(
    ({ action, subject }) =>
      action === required.action && subject === required.subject,
  );

export const isSameAbilitySet = (
  left: readonly Ability[],
  right: readonly Ability[],
): boolean =>
  left.length === right.length &&
  left.every((ability) => hasAbility(right, ability));

export const toggleAbility = (
  abilities: readonly Ability[],
  ability: Ability,
  granted: boolean,
): Ability[] => {
  const others = abilities.filter(
    ({ action, subject }) =>
      action !== ability.action || subject !== ability.subject,
  );

  return granted ? [...others, ability] : others;
};

export const groupAbilitiesBySubject = (
  abilities: readonly Ability[],
): SubjectAbilities[] => {
  const groups = new Map<Subject, Set<Action>>();

  for (const { action, subject } of abilities) {
    const actions = groups.get(subject) ?? new Set<Action>();
    actions.add(action);
    groups.set(subject, actions);
  }

  return Array.from(groups, ([subject, actions]) => ({
    subject,
    actions: [...actions],
  }));
};
