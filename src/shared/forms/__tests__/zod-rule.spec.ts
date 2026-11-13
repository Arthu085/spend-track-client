import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodRule } from '../zod-rule';

describe('zodRule', () => {
  it.each([
    ['a required string', z.string().min(1), true],
    ['a required enum', z.enum(['A', 'B']), true],
    ['an optional string', z.string().optional(), false],
    ['a nullish string', z.string().nullish(), false],
  ])('marks %s as required: %s', (_label, schema, required) => {
    expect(zodRule(schema).required).toBe(required);
  });
});
