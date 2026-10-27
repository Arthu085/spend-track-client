import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env.config';

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
    ['VITE_API_URL', undefined],
    ['VITE_API_URL', ''],
    ['VITE_API_URL', 'not-a-url'],
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
