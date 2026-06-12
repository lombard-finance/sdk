import { Env } from '@lombard.finance/sdk-common';
import {
  type AxiosAdapter,
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UnauthorizedError } from '../../../common/auth-errors';
import {
  clearAuthErrorHandler,
  clearAuthTokenProvider,
  getStoredAuthToken,
  registerAuthErrorHandler,
  registerAuthTokenProvider,
  setStoredAuthToken,
} from '../../../common/auth-token';
import { getHttpClient, resetHttpClients } from '../../../common/http-client';

const ENV = Env.prod;

/**
 * Capturing adapter: records the request config (after interceptors have run)
 * and returns an empty 200, so we can assert on the attached headers without a
 * network mock dependency.
 */
function capture(): {
  adapter: AxiosAdapter;
  config: () => InternalAxiosRequestConfig;
} {
  let captured: InternalAxiosRequestConfig | undefined;
  const adapter: AxiosAdapter = async (config) => {
    captured = config;
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse;
  };
  return {
    adapter,
    config: () => {
      if (!captured) throw new Error('adapter was not called');
      return captured;
    },
  };
}

const authHeader = (c: InternalAxiosRequestConfig): unknown =>
  c.headers.get('Authorization');

/**
 * Adapter that rejects with an AxiosError carrying the given status — a custom
 * adapter must reject itself (axios only applies validateStatus in its own
 * adapters), so this mimics a real error response.
 */
function failWithStatus(status: number): AxiosAdapter {
  return async (config) => {
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
      data: {},
      status,
      statusText: '',
      headers: {},
      config,
    } as AxiosResponse);
  };
}

describe('authed http client (Variant A)', () => {
  beforeEach(() => {
    resetHttpClients();
    clearAuthTokenProvider(ENV);
    setStoredAuthToken(ENV, undefined);
  });

  afterEach(() => {
    clearAuthTokenProvider(ENV);
    clearAuthErrorHandler(ENV);
    setStoredAuthToken(ENV, undefined);
  });

  it('on 401: rejects with UnauthorizedError, clears the stored token, and calls the handler', async () => {
    setStoredAuthToken(ENV, 'stored-jwt');
    const onAuthError = vi.fn();
    registerAuthErrorHandler(ENV, onAuthError);

    const adapter = failWithStatus(401);

    await expect(
      getHttpClient(ENV).get('/protected', { adapter }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(onAuthError).toHaveBeenCalledWith(ENV);
    expect(getStoredAuthToken(ENV)).toBeUndefined();
  });

  it('does not transform non-401 errors', async () => {
    await expect(
      getHttpClient(ENV).get('/x', { adapter: failWithStatus(500) }),
    ).rejects.not.toBeInstanceOf(UnauthorizedError);
  });

  it('sends no Authorization header when no token is available', async () => {
    const cap = capture();
    await getHttpClient(ENV).get('/x', { adapter: cap.adapter });
    expect(authHeader(cap.config())).toBeFalsy();
  });

  it('attaches the provider token as a Bearer header', async () => {
    registerAuthTokenProvider(ENV, () => 'provider-jwt');
    const cap = capture();
    await getHttpClient(ENV).get('/x', { adapter: cap.adapter });
    expect(authHeader(cap.config())).toBe('Bearer provider-jwt');
  });

  it('awaits async providers', async () => {
    registerAuthTokenProvider(ENV, async () => 'async-jwt');
    const cap = capture();
    await getHttpClient(ENV).get('/x', { adapter: cap.adapter });
    expect(authHeader(cap.config())).toBe('Bearer async-jwt');
  });

  it('prefers the provider over the internally-stored token', async () => {
    setStoredAuthToken(ENV, 'stored-jwt');
    registerAuthTokenProvider(ENV, () => 'provider-jwt');
    const cap = capture();
    await getHttpClient(ENV).get('/x', { adapter: cap.adapter });
    expect(authHeader(cap.config())).toBe('Bearer provider-jwt');
  });

  it('falls back to the internal store when the provider yields nothing', async () => {
    setStoredAuthToken(ENV, 'stored-jwt');
    registerAuthTokenProvider(ENV, () => undefined);
    const cap = capture();
    await getHttpClient(ENV).get('/x', { adapter: cap.adapter });
    expect(authHeader(cap.config())).toBe('Bearer stored-jwt');
  });

  it('does not override an explicit Authorization header', async () => {
    registerAuthTokenProvider(ENV, () => 'provider-jwt');
    const cap = capture();
    await getHttpClient(ENV).post(
      '/x',
      {},
      { adapter: cap.adapter, headers: { Authorization: 'Bearer explicit-jwt' } },
    );
    expect(authHeader(cap.config())).toBe('Bearer explicit-jwt');
  });
});
