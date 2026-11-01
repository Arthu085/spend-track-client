import { describe, expect, it } from 'vitest';
import {
  formatMonthLabel,
  monthDateRange,
  monthRefOfDate,
  parseMonthRef,
  shiftMonth,
} from '../month-ref';

describe('parseMonthRef', () => {
  it('reads a month only when both search params are valid', () => {
    expect(parseMonthRef('2026', '11')).toEqual({ year: 2026, month: 11 });
    expect(parseMonthRef('2026', null)).toBeUndefined();
    expect(parseMonthRef(null, '11')).toBeUndefined();
    expect(parseMonthRef('2026', '13')).toBeUndefined();
    expect(parseMonthRef('1999', '1')).toBeUndefined();
    expect(parseMonthRef('2026', '1.5')).toBeUndefined();
  });
});

describe('shiftMonth', () => {
  it('crosses year boundaries in both directions', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
  });
});

describe('formatMonthLabel', () => {
  it('names the month in the given language', () => {
    expect(formatMonthLabel({ year: 2026, month: 3 }, 'en')).toBe('March 2026');
    expect(formatMonthLabel({ year: 2026, month: 3 }, 'pt-BR')).toBe(
      'março de 2026',
    );
  });
});

describe('monthRefOfDate', () => {
  it('reads the month of a calendar date', () => {
    expect(monthRefOfDate('2026-10-29')).toEqual({ year: 2026, month: 10 });
  });
});

describe('monthDateRange', () => {
  it('spans the first to the last day of the month', () => {
    expect(monthDateRange({ year: 2026, month: 10 })).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(monthDateRange({ year: 2028, month: 2 })).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });
});
