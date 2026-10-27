import { describe, expect, it } from 'vitest';
import { resolveLanguage, toLanguage } from '../language';

describe('resolveLanguage', () => {
  it.each([
    [['pt-BR'], 'pt-BR'],
    [['pt-br'], 'pt-BR'],
    [['pt-PT'], 'pt-BR'],
    [['en-US', 'pt-BR'], 'en'],
    [['fr-FR', 'en-GB'], 'en'],
    [['fr-FR'], 'pt-BR'],
    [[], 'pt-BR'],
  ])('resolves %o to %s', (preferred, expected) => {
    expect(resolveLanguage(preferred)).toBe(expected);
  });
});

describe('toLanguage', () => {
  it('keeps supported languages and falls back otherwise', () => {
    expect(toLanguage('en')).toBe('en');
    expect(toLanguage('fr')).toBe('pt-BR');
    expect(toLanguage(undefined)).toBe('pt-BR');
  });
});
