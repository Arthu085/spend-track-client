import {
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  csrfResponse,
  requestKey,
  respond,
  type StubResponse,
  stubHttpRoutes,
} from '@/test/http-stub';
import { createHttpClient } from '../create-http-client';

// Each handler answers one request in order, so tests assert the exact call sequence.
const setup = (
  ...handlers: ((config: InternalAxiosRequestConfig) => StubResponse)[]
) => {
  const requests: InternalAxiosRequestConfig[] = [];
  const adapter = vi.fn<AxiosAdapter>((config) => {
    requests.push(config);
    const handler = handlers.shift();

    if (!handler) {
      throw new Error(`Unexpected request: ${config.method} ${config.url}`);
    }

    return respond(config, handler(config));
  });
  const client = createHttpClient({
    baseURL: 'http://api.test/api',
    getLanguage: () => 'en',
  });
  client.defaults.adapter = adapter;

  return { client, requests };
};

const createClient = () =>
  createHttpClient({
    baseURL: 'http://api.test/api',
    getLanguage: () => 'en',
  });

const unauthorizedOnce = () => {
  let calls = 0;

  return (): StubResponse => ({ status: calls++ === 0 ? 401 : 200 });
};

const csrfHeaderOf = (config: InternalAxiosRequestConfig) =>
  AxiosHeaders.from(config.headers).get('x-csrf-token');

describe('createHttpClient', () => {
  it('sends credentials and the current language without fetching a CSRF token on safe methods', async () => {
    const { client, requests } = setup(() => ({ status: 200 }));

    await client.get('/users/me');

    expect(requests).toHaveLength(1);
    expect(requests[0].withCredentials).toBe(true);
    expect(AxiosHeaders.from(requests[0].headers).get('Accept-Language')).toBe(
      'en',
    );
    expect(csrfHeaderOf(requests[0])).toBeUndefined();
  });

  it('bootstraps one CSRF token for concurrent unsafe requests', async () => {
    const { client, requests } = setup(
      () => csrfResponse('token-1'),
      () => ({ status: 200 }),
      () => ({ status: 200 }),
    );

    await Promise.all([client.post('/a'), client.delete('/b')]);

    expect(requests.map((request) => request.url)).toEqual([
      '/auth/csrf',
      '/a',
      '/b',
    ]);
    expect(csrfHeaderOf(requests[1])).toBe('token-1');
    expect(csrfHeaderOf(requests[2])).toBe('token-1');
  });

  it('uses the latest token returned in a response header', async () => {
    const { client, requests } = setup(
      () => csrfResponse('token-1'),
      () => ({ status: 200, headers: { 'x-csrf-token': 'token-2' } }),
      () => ({ status: 200 }),
    );

    await client.post('/auth/login');
    await client.post('/users');

    expect(csrfHeaderOf(requests[2])).toBe('token-2');
  });

  it('retries an unsafe request once with a fresh token after a 403', async () => {
    const { client, requests } = setup(
      () => csrfResponse('stale'),
      () => ({ status: 403 }),
      () => csrfResponse('fresh'),
      () => ({ status: 201 }),
    );

    const response = await client.post('/users');

    expect(response.status).toBe(201);
    expect(requests.map((request) => request.url)).toEqual([
      '/auth/csrf',
      '/users',
      '/auth/csrf',
      '/users',
    ]);
    expect(csrfHeaderOf(requests[3])).toBe('fresh');
  });

  it('rejects when the retried request is forbidden again', async () => {
    const { client, requests } = setup(
      () => csrfResponse('token-1'),
      () => ({ status: 403 }),
      () => csrfResponse('token-2'),
      () => ({ status: 403 }),
    );

    await expect(client.post('/users')).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(requests).toHaveLength(4);
  });

  it('does not replay a 403 when the session still has the same token', async () => {
    const { client, requests } = setup(
      () => csrfResponse('token-1'),
      () => ({ status: 403 }),
      () => csrfResponse('token-1'),
    );

    await expect(client.post('/auth/login')).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(requests.map(requestKey)).toEqual([
      'GET /auth/csrf',
      'POST /auth/login',
      'GET /auth/csrf',
    ]);
  });

  it('does not retry forbidden safe requests', async () => {
    const { client, requests } = setup(() => ({ status: 403 }));

    await expect(client.get('/users')).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(requests).toHaveLength(1);
  });

  it('drops the CSRF token on demand so the next unsafe request bootstraps a new one', async () => {
    const { client, requests } = setup(
      () => csrfResponse('token-1'),
      () => ({ status: 200 }),
      () => csrfResponse('token-2'),
      () => ({ status: 200 }),
    );

    await client.post('/auth/logout');
    client.clearCsrfToken();
    await client.post('/auth/login');

    expect(csrfHeaderOf(requests[3])).toBe('token-2');
  });
});

describe('createHttpClient session refresh', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
  });

  it('refreshes the session and retries a request answered with 401', async () => {
    const client = createClient();
    const requests = stubHttpRoutes(client, {
      'GET /users/me': unauthorizedOnce(),
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 200 },
    });

    const response = await client.get('/users/me');

    expect(response.status).toBe(200);
    expect(requests.map(requestKey)).toEqual([
      'GET /users/me',
      'GET /auth/csrf',
      'POST /auth/refresh',
      'GET /users/me',
    ]);
  });

  it('shares one refresh between concurrent requests answered with 401', async () => {
    const client = createClient();
    const requests = stubHttpRoutes(client, {
      'GET /a': unauthorizedOnce(),
      'GET /b': unauthorizedOnce(),
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 200 },
    });

    await Promise.all([client.get('/a'), client.get('/b')]);

    expect(
      requests.filter((request) => request.url === '/auth/refresh'),
    ).toHaveLength(1);
    expect(requests.filter((request) => request.url === '/a')).toHaveLength(2);
    expect(requests.filter((request) => request.url === '/b')).toHaveLength(2);
  });

  it('rejects with the original 401 when the refresh fails', async () => {
    const client = createClient();
    const requests = stubHttpRoutes(client, {
      'GET /users/me': { status: 401 },
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 401 },
    });

    await expect(client.get('/users/me')).rejects.toMatchObject({
      config: { url: '/users/me' },
      response: { status: 401 },
    });
    expect(requests.map(requestKey)).toEqual([
      'GET /users/me',
      'GET /auth/csrf',
      'POST /auth/refresh',
    ]);
  });

  it('keeps the session when the refresh fails without a sign-out answer', async () => {
    const client = createClient();
    const requests = stubHttpRoutes(client, {
      'GET /users/me': { status: 401 },
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 503 },
    });

    await expect(client.get('/users/me')).rejects.toMatchObject({
      config: { url: '/auth/refresh' },
      response: { status: 503 },
    });
    expect(requests.at(-1)?.timeout).toBe(0);
  });

  it('does not refresh when the login itself is rejected', async () => {
    const client = createClient();
    const requests = stubHttpRoutes(client, {
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/login': { status: 401 },
    });

    await expect(client.post('/auth/login')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(requests.map(requestKey)).toEqual([
      'GET /auth/csrf',
      'POST /auth/login',
    ]);
  });

  it('holds a cross-tab Web Lock while refreshing', async () => {
    const request = vi.fn(
      (_name: string, task: () => Promise<unknown>): Promise<unknown> => task(),
    );
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });
    const client = createClient();
    stubHttpRoutes(client, {
      'GET /users/me': unauthorizedOnce(),
      'GET /auth/csrf': csrfResponse('token-1'),
      'POST /auth/refresh': { status: 200 },
    });

    await client.get('/users/me');

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith('auth-session', expect.any(Function));
  });
});
