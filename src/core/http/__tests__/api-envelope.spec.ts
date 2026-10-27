import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  parseApiData,
  parseApiResponse,
  parsePaginatedResponse,
} from '../api-envelope';

const itemSchema = z.object({ uuid: z.string() });

describe('parseApiResponse', () => {
  it('returns the parsed data with the localized message', () => {
    expect(
      parseApiResponse(itemSchema, {
        data: { uuid: 'a', extra: true },
        meta: { message: 'Criado com sucesso' },
      }),
    ).toEqual({ data: { uuid: 'a' }, meta: { message: 'Criado com sucesso' } });
  });

  it('accepts a null body and no message, as a delete may return', () => {
    expect(parseApiResponse(z.null(), { data: null, meta: {} })).toEqual({
      data: null,
      meta: {},
    });
  });

  it('rejects a body without the envelope', () => {
    expect(() => parseApiResponse(itemSchema, { uuid: 'a' })).toThrow();
  });
});

describe('parsePaginatedResponse', () => {
  it('returns the items with the pagination meta', () => {
    expect(
      parsePaginatedResponse(itemSchema, {
        data: [{ uuid: 'a' }, { uuid: 'b' }],
        meta: { total: 12, page: 2, limit: 10, message: 'OK' },
      }),
    ).toEqual({
      data: [{ uuid: 'a' }, { uuid: 'b' }],
      meta: { total: 12, page: 2, limit: 10, message: 'OK' },
    });
  });

  it('rejects a response without pagination meta', () => {
    expect(() =>
      parsePaginatedResponse(itemSchema, { data: [], meta: {} }),
    ).toThrow();
  });

  it('rejects items that do not match the schema', () => {
    expect(() =>
      parsePaginatedResponse(itemSchema, {
        data: [{ id: 1 }],
        meta: { total: 1, page: 1, limit: 20 },
      }),
    ).toThrow();
  });
});

describe('parseApiData', () => {
  it('returns only the parsed data', () => {
    expect(parseApiData(itemSchema, { data: { uuid: 'a' }, meta: {} })).toEqual(
      { uuid: 'a' },
    );
  });
});
