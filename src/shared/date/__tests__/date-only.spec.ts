import { describe, expect, it } from 'vitest';
import { dateInputFormat, formatDateOnly } from '../date-only';

describe('formatDateOnly', () => {
  it('formats a calendar date without shifting it by time zone', () => {
    expect(formatDateOnly('2026-01-01', 'pt-BR')).toBe('01/01/2026');
    expect(formatDateOnly('2026-01-31', 'en')).toBe('1/31/2026');
  });
});

describe('dateInputFormat', () => {
  it('uses the date order of the language and falls back to pt-BR', () => {
    expect(dateInputFormat('pt-BR')).toBe('DD/MM/YYYY');
    expect(dateInputFormat('en')).toBe('MM/DD/YYYY');
    expect(dateInputFormat('fr')).toBe('DD/MM/YYYY');
  });
});
