import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient, shouldRetryQuery } from '../query-client.config';

const httpError = (status: number) => {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse = {
    status,
    statusText: String(status),
    data: {},
    headers: new AxiosHeaders(),
    config,
  };

  return new AxiosError('failed', undefined, config, null, response);
};

describe('shouldRetryQuery', () => {
  it('never retries client errors', () => {
    expect(shouldRetryQuery(0, httpError(401))).toBe(false);
    expect(shouldRetryQuery(0, httpError(404))).toBe(false);
  });

  it('retries server and network errors up to the limit', () => {
    expect(shouldRetryQuery(0, httpError(503))).toBe(true);
    expect(shouldRetryQuery(1, new Error('offline'))).toBe(true);
    expect(shouldRetryQuery(2, httpError(503))).toBe(false);
  });
});

describe('createQueryClient', () => {
  const failWith = (status: number) => () => Promise.reject(httpError(status));

  it('reports queries and mutations rejected with 401 as unauthorized', async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient({ onUnauthorized });

    await client
      .fetchQuery({ queryKey: ['me'], queryFn: failWith(401) })
      .catch(() => undefined);
    await client
      .getMutationCache()
      .build(client, { mutationFn: failWith(401) })
      .execute(undefined)
      .catch(() => undefined);

    expect(onUnauthorized).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledWith(client);
  });

  it('ignores other errors', async () => {
    const onUnauthorized = vi.fn();
    const client = createQueryClient({ onUnauthorized });

    await client
      .fetchQuery({ queryKey: ['me'], queryFn: failWith(404) })
      .catch(() => undefined);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
