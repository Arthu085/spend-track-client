import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { getApiErrorMessage, getHttpStatus } from '../api-error';

const config = { headers: new AxiosHeaders() };

const responseError = (status: number, data: unknown) => {
  const response: AxiosResponse = {
    status,
    statusText: String(status),
    data,
    headers: new AxiosHeaders(),
    config,
  };

  return new AxiosError(
    'failed',
    AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    response,
  );
};

describe('getApiErrorMessage', () => {
  it('returns the localized message sent by the API', () => {
    const error = responseError(409, {
      statusCode: 409,
      error: 'Conflict',
      message: 'Email already in use',
    });

    expect(getApiErrorMessage(error)).toBe('Email already in use');
  });

  it('falls back when the body is not an API error', () => {
    expect(
      getApiErrorMessage(responseError(502, '<html>Bad Gateway</html>')),
    ).toBe(i18n.t('apiErrors.unexpected'));
  });

  it('includes the audit reference alongside the API message', () => {
    const auditId = 'a7c5d193-9c6a-470e-a4c9-7b94a0cbe35c';
    const message = 'An unexpected error occurred';

    expect(getApiErrorMessage(responseError(500, { message, auditId }))).toBe(
      `${message} ${i18n.t('apiErrors.auditReference', { auditId })}`,
    );
  });

  it.each([null, 42, {}, '', '   '])(
    'keeps the API message when the audit reference is invalid: %j',
    (auditId) => {
      expect(
        getApiErrorMessage(responseError(500, { message: 'Failed', auditId })),
      ).toBe('Failed');
    },
  );

  it('reports timeouts and network failures', () => {
    const timeout = new AxiosError('timeout', AxiosError.ECONNABORTED, config);
    const network = new AxiosError('offline', AxiosError.ERR_NETWORK, config);

    expect(getApiErrorMessage(timeout)).toBe(i18n.t('apiErrors.timeout'));
    expect(getApiErrorMessage(network)).toBe(i18n.t('apiErrors.network'));
  });

  it('falls back for non-HTTP errors', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe(
      i18n.t('apiErrors.unexpected'),
    );
  });
});

describe('getHttpStatus', () => {
  it('reads the response status of HTTP errors only', () => {
    expect(getHttpStatus(responseError(404, {}))).toBe(404);
    expect(getHttpStatus(new Error('boom'))).toBeUndefined();
  });
});
