import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { loginFormSchema, newPasswordSchema } from '../auth.schemas';

const firstMessage = (value: string) =>
  newPasswordSchema.safeParse(value).error?.issues[0]?.message;

const strongPasswordMessage = () =>
  i18n.t('validation.strongPassword', { min: 8 });

describe('newPasswordSchema', () => {
  it('accepts a password with every character class', () => {
    expect(newPasswordSchema.safeParse('Str0ng-pass').success).toBe(true);
  });

  it.each([
    ['a lowercase letter', 'STR0NG-PASS'],
    ['an uppercase letter', 'str0ng-pass'],
    ['a digit', 'Strong-pass'],
    ['a symbol', 'Str0ngPass'],
  ])('rejects a password without %s', (_class, value) => {
    expect(firstMessage(value)).toBe(strongPasswordMessage());
  });

  it('treats non-ASCII letters as symbols', () => {
    expect(newPasswordSchema.safeParse('Senha1ção').success).toBe(true);
    expect(newPasswordSchema.safeParse('SENHA1ÇÃO').success).toBe(false);
  });

  it.each([
    ['a short password', 'Sh0r-t'],
    ['a short weak password', 'short'],
  ])('shows the full rule for %s', (_case, value) => {
    expect(firstMessage(value)).toBe(strongPasswordMessage());
  });

  it('keeps the maximum length', () => {
    expect(firstMessage(`Aa1-${'a'.repeat(125)}`)).toBe(
      i18n.t('validation.maxLength', { max: 128 }),
    );
  });
});

describe('loginFormSchema', () => {
  it('still accepts a weak password for existing accounts', () => {
    expect(
      loginFormSchema.safeParse({
        email: 'ada@example.com',
        password: 'password',
      }).success,
    ).toBe(true);
  });
});
