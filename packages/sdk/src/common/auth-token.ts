/**
 * Auth token registry
 *
 * Holds the bridge between the app-owned JWT lifecycle and the SDK's HTTP
 * layer. The app supplies a token provider via `createConfig({ getAuthToken })`
 * (Variant A); the shared HTTP client ([http-client](./http-client.ts)) reads
 * the token through {@link resolveAuthToken} and attaches it as a Bearer
 * header.
 *
 * The SDK never decides where the token is stored or when it is refreshed —
 * the provider callback is the single source of truth. An internal in-memory
 * store is kept only as a fallback for the optional `persist` flag on the
 * wallet-verify flow, so the simple case works with zero app code.
 *
 * Keyed by `Env` because each environment talks to a different backend and
 * therefore holds a different token.
 *
 * @module common/auth-token
 */

import { DEFAULT_ENV, type Env } from '@lombard.finance/sdk-common';

/**
 * Resolves the current auth token for a given environment.
 *
 * Return the JWT to attach as `Authorization: Bearer <token>`, or
 * `undefined`/`null` to send the request unauthenticated. The provider owns
 * the token lifecycle: when the token is missing, expired, or being
 * refreshed, return a falsy value so public endpoints keep working.
 *
 * May be async (e.g. reading from an async store or awaiting a refresh).
 */
export type AuthTokenProvider = (
  env: Env,
) => string | undefined | null | Promise<string | undefined | null>;

// App-supplied providers, one per env. A Map (not a plain object) avoids the
// dynamic-key object-injection lint applied elsewhere in the config layer.
const providers = new Map<Env, AuthTokenProvider>();

// Fallback store written by the wallet-verify `persist` flag.
const internalStore = new Map<Env, string>();

/**
 * Register the app's token provider for an environment. Replaces any existing
 * provider for that env. Called by the SDK when `getAuthToken` is configured.
 */
export function registerAuthTokenProvider(
  env: Env | undefined,
  provider: AuthTokenProvider,
): void {
  providers.set(env ?? DEFAULT_ENV, provider);
}

/** Remove the registered provider for an environment. */
export function clearAuthTokenProvider(env: Env | undefined): void {
  providers.delete(env ?? DEFAULT_ENV);
}

/**
 * Persist a token in the SDK's internal store (fallback used by the optional
 * `persist` flag on wallet verify). Passing a falsy token clears it.
 */
export function setStoredAuthToken(
  env: Env | undefined,
  token: string | undefined | null,
): void {
  const key = env ?? DEFAULT_ENV;
  if (token) {
    internalStore.set(key, token);
  } else {
    internalStore.delete(key);
  }
}

/** Read the internally-stored token, if any. */
export function getStoredAuthToken(env: Env | undefined): string | undefined {
  return internalStore.get(env ?? DEFAULT_ENV);
}

/**
 * Resolve the token to attach to a request for the given environment.
 *
 * Precedence: the app-supplied provider wins; the internal store is a fallback
 * for callers that opted into `persist`. Returns `undefined` when neither
 * yields a token, so the request is sent unauthenticated.
 */
export async function resolveAuthToken(
  env: Env | undefined,
): Promise<string | undefined> {
  const key = env ?? DEFAULT_ENV;
  const provider = providers.get(key);
  if (provider) {
    const token = await provider(key);
    if (token) {
      return token;
    }
  }
  return internalStore.get(key);
}
