/**
 * Shared HTTP client
 *
 * A per-environment axios instance that automatically attaches the wallet JWT
 * as `Authorization: Bearer <token>` when one is available (see
 * [auth-token](./auth-token.ts)). This is the transport half of the auth
 * design: the app owns the token, the SDK owns attaching it.
 *
 * Why a dedicated instance instead of the global `axios`:
 * - The request interceptor must not leak onto the app's own `axios` usage.
 * - Keying by `Env` lets the interceptor know which environment's token to
 *   resolve without threading it through every call site.
 *
 * No `baseURL` is baked in — call sites keep passing `baseURL`/absolute URLs
 * exactly as before, so adopting the client is a one-line swap.
 *
 * @module common/http-client
 */

import { DEFAULT_ENV, type Env } from '@lombard.finance/sdk-common';
import axios, { type AxiosInstance } from 'axios';

import { UnauthorizedError } from './auth-errors';
import { notifyAuthError, resolveAuthToken, setStoredAuthToken } from './auth-token';

const clients = new Map<Env, AxiosInstance>();

/**
 * Get the shared authed axios instance for an environment.
 *
 * The instance is created lazily and cached. Its request interceptor attaches
 * the resolved auth token unless the call already set an `Authorization`
 * header (e.g. token revocation, which passes the JWT explicitly).
 *
 * `env` is optional and normalized to {@link DEFAULT_ENV}, matching the rest
 * of the SDK's `IEnvParam` handling.
 */
export function getHttpClient(env: Env | undefined): AxiosInstance {
  const key = env ?? DEFAULT_ENV;
  const existing = clients.get(key);
  if (existing) {
    return existing;
  }

  const client = axios.create();

  client.interceptors.request.use(async (config) => {
    // Respect an explicitly-provided Authorization header.
    if (!config.headers.has('Authorization')) {
      const token = await resolveAuthToken(key);
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  });

  // On 401: drop any SDK-held token, notify the app's handler, and surface a
  // typed UnauthorizedError. The SDK never auto-refreshes/retries — re-auth is
  // a deliberate user action the app triggers.
  client.interceptors.response.use(undefined, (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setStoredAuthToken(key, undefined);
      notifyAuthError(key);
      return Promise.reject(new UnauthorizedError(error.config?.url, error));
    }
    return Promise.reject(error);
  });

  clients.set(key, client);
  return client;
}

/** Reset the cached clients. Intended for tests. @internal */
export function resetHttpClients(): void {
  clients.clear();
}
