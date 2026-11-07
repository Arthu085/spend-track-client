import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('browser environment startup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_APP_NAME', 'Acme Portal');
    vi.stubEnv('VITE_APP_MARK', 'AP');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['https://app.example.com///', 'https://app.example.com'],
    ['http://localhost:3000/', 'http://localhost:3000'],
  ])('starts with the normalized origin %s', async (value, origin) => {
    vi.stubEnv('VITE_API_URL', value);

    const { env } = await import('../env.config');

    expect(env.apiUrl).toBe(origin);
  });

  it.each([
    'https://app.example.com/api',
    'http://app.example.com',
    'https://user:password@app.example.com',
    'https://app.example.com?preview=true',
    'https://app.example.com#section',
    'ftp://app.example.com',
  ])('rejects %s before startup', async (value) => {
    vi.stubEnv('VITE_API_URL', value);

    await expect(import('../env.config')).rejects.toThrow(/VITE_API_URL/);
  });
});
