import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env.schema';

const validSource = {
  VITE_API_URL: 'https://api.example.com',
  VITE_APP_NAME: 'Acme Portal',
  VITE_APP_MARK: 'AP',
};

describe('parseEnv', () => {
  it('exposes the configuration with the API URL trimmed of trailing slashes', () => {
    expect(
      parseEnv({ ...validSource, VITE_API_URL: 'https://api.example.com//' }),
    ).toEqual({
      apiUrl: 'https://api.example.com',
      appName: 'Acme Portal',
      appMark: 'AP',
    });
  });

  it.each([
    ['https://app.example.com', 'https://app.example.com'],
    ['https://app.example.com/', 'https://app.example.com'],
    ['https://app.example.com///', 'https://app.example.com'],
    ['https://APP.example.com:443/', 'https://app.example.com'],
    ['https://app.example.com:8443//', 'https://app.example.com:8443'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['http://localhost:3000///', 'http://localhost:3000'],
    ['http://127.0.0.1:3000/', 'http://127.0.0.1:3000'],
    ['http://[::1]:3000//', 'http://[::1]:3000'],
  ])('normalizes the origin %s to %s', (value, origin) => {
    expect(parseEnv({ ...validSource, VITE_API_URL: value }).apiUrl).toBe(
      origin,
    );
  });

  it.each([
    ['VITE_API_URL', undefined],
    ['VITE_API_URL', ''],
    ['VITE_API_URL', 'not-a-url'],
    ['VITE_API_URL', 'ftp://api.example.com'],
    ['VITE_API_URL', 'https://app.example.com/api'],
    ['VITE_API_URL', 'https://app.example.com/api/'],
    ['VITE_API_URL', 'https://app.example.com/nested/api'],
    ['VITE_API_URL', 'https://app.example.com/api/..'],
    ['VITE_API_URL', 'https://app.example.com/%2e'],
    ['VITE_API_URL', 'http://localhost:3000/api'],
    ['VITE_API_URL', 'http://app.example.com'],
    ['VITE_API_URL', 'http://localhost.example.com'],
    ['VITE_API_URL', 'http://127.0.0.1.example.com'],
    ['VITE_API_URL', 'https://user:password@api.example.com'],
    ['VITE_API_URL', 'https://api.example.com?preview=true'],
    ['VITE_API_URL', 'https://api.example.com?'],
    ['VITE_API_URL', 'https://api.example.com#section'],
    ['VITE_API_URL', 'https://api.example.com#'],
    ['VITE_APP_NAME', undefined],
    ['VITE_APP_NAME', '  '],
    ['VITE_APP_MARK', undefined],
    ['VITE_APP_MARK', ''],
  ])('rejects %s set to %o', (key, value) => {
    expect(() => parseEnv({ ...validSource, [key]: value })).toThrow(
      new RegExp(key),
    );
  });
});
