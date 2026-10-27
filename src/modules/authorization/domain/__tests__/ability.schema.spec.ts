import { describe, expect, it } from 'vitest';
import {
  type Ability,
  abilitySchema,
  groupAbilitiesBySubject,
  hasAbility,
  isSameAbilitySet,
  toggleAbility,
} from '../ability.schema';

const abilities: Ability[] = [
  { action: 'READ', subject: 'USER' },
  { action: 'UPDATE', subject: 'ROLE' },
];

describe('hasAbility', () => {
  it('matches only the exact action and subject pair', () => {
    expect(hasAbility(abilities, { action: 'READ', subject: 'USER' })).toBe(
      true,
    );
    expect(hasAbility(abilities, { action: 'READ', subject: 'ROLE' })).toBe(
      false,
    );
    expect(hasAbility(abilities, { action: 'UPDATE', subject: 'USER' })).toBe(
      false,
    );
    expect(hasAbility([], { action: 'READ', subject: 'USER' })).toBe(false);
  });
});

describe('groupAbilitiesBySubject', () => {
  it('groups the supplied pairs in API order and skips empty subjects', () => {
    expect(
      groupAbilitiesBySubject([
        { action: 'UPDATE', subject: 'ROLE' },
        { action: 'DELETE', subject: 'USER' },
        { action: 'READ', subject: 'ROLE' },
        { action: 'CREATE', subject: 'USER' },
      ]),
    ).toEqual([
      { subject: 'ROLE', actions: ['UPDATE', 'READ'] },
      { subject: 'USER', actions: ['DELETE', 'CREATE'] },
    ]);
    expect(groupAbilitiesBySubject([])).toEqual([]);
  });
});

describe('isSameAbilitySet', () => {
  it('compares the pairs regardless of order', () => {
    expect(isSameAbilitySet(abilities, [...abilities].reverse())).toBe(true);
    expect(isSameAbilitySet(abilities, abilities.slice(1))).toBe(false);
    expect(
      isSameAbilitySet(abilities, [
        { action: 'READ', subject: 'USER' },
        { action: 'READ', subject: 'ROLE' },
      ]),
    ).toBe(false);
  });
});

describe('toggleAbility', () => {
  it('adds a granted pair once and removes a revoked one', () => {
    const readRole: Ability = { action: 'READ', subject: 'ROLE' };

    expect(toggleAbility(abilities, readRole, true)).toEqual([
      ...abilities,
      readRole,
    ]);
    expect(toggleAbility([...abilities, readRole], readRole, true)).toEqual([
      ...abilities,
      readRole,
    ]);
    expect(toggleAbility(abilities, abilities[0], false)).toEqual([
      abilities[1],
    ]);
  });
});

describe('abilitySchema', () => {
  it('accepts new backend subjects and actions without synthesizing combinations', () => {
    const ability = abilitySchema.parse({
      action: 'EXPORT',
      subject: 'REPORT',
      actionLabel: 'Export',
      subjectLabel: 'Reports',
    });
    expect(groupAbilitiesBySubject([ability, ability])).toEqual([
      { subject: 'REPORT', actions: ['EXPORT'] },
    ]);
    expect(hasAbility([ability], { action: 'READ', subject: 'REPORT' })).toBe(
      false,
    );
    expect(
      abilitySchema.safeParse({ action: '', subject: 'REPORT' }).success,
    ).toBe(false);
    expect(
      abilitySchema.safeParse({ action: 'READ', subject: 123 }).success,
    ).toBe(false);
  });
});
