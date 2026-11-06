/**
 * HTTP Request Utilities
 *
 * Centralized HTTP request wrapper that:
 * - Adds SDK version headers to all requests
 * - Supports optional logging via Logger interface
 * - Tracks request duration for performance monitoring
 * - Provides consistent error handling
 *
 * @module utils/http
 */

import {
  type AuthRequestContext,
  Env,
  type LombardAuth,
  type RequestScope,
} from '@lombard.finance/sdk-common';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { getApiConfig } from '../common/api-config';
import type { Logger } from '../shared/context/types';
import { AuthErrorCode, ErrorCode, LombardError } from '../shared/errors';
import { SDK_RUNTIME, SDK_VERSION } from '../version';

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /** Request URL (full URL or path if baseURL provided) */
  url: string;

  /** HTTP method (defaults to GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Base URL for the request */
  baseURL?: string;

  /** Query parameters */
  params?: Record<string, unknown>;

  /** Request body (for POST/PUT/PATCH) */
  body?: unknown;

  /** Additional headers */
  headers?: Record<string, string>;

  /** Optional logger for request/response logging */
  logger?: Logger;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /**
   * Reads the caller's current wallet-auth JWT, or `undefined`.
   *
   * When it yields a token, and the request goes to an API gateway host (see
   * {@link mayCarryToken}), an `Authorization: Bearer <token>` header is added.
   * When it yields `undefined`, or is itself absent, **no header is sent** —
   * which is today's behaviour on every endpoint, none of which requires one.
   *
   * Read here rather than passed as a string so a token acquired between
   * building an action and calling it is still picked up. Comes from
   * `CoreContext.getAuthToken`, which comes from `LombardConfig`.
   */
  getAuthToken?: () => string | undefined;

  /**
   * How this request obtains a token, when one is needed.
   *
   * Preferred over {@link getAuthToken}: it is asynchronous, so the host can
   * refresh an expired token rather than handing back the stale one it already
   * holds.
   */
  auth?: LombardAuth;

  /**
   * Whether this request needs a caller identity. Defaults to `public`, which
   * is the safe default: an unlabelled request attaches a token when one
   * happens to be available and never fails for want of one. Either way a
   * token is attached only on a request to an API gateway host.
   */
  scope?: RequestScope;
}

/**
 * The hosts a wallet token may be sent to: every environment's API gateway,
 * v1 and v2.
 */
const TOKEN_HOSTS: ReadonlySet<string> = new Set(
  Object.values(Env).flatMap((env) => {
    const { baseApiUrl, baseApiV2Url } = getApiConfig(env);
    return [new URL(baseApiUrl).host, new URL(baseApiV2Url).host];
  }),
);

/**
 * Whether a wallet token may go to `url`: https, on an API gateway host.
 *
 * The token is the user's session with the gateway, and nothing else checks
 * it. A route elsewhere (the BFF, an explorer, a node) has no use for it, and
 * every host it reaches is one more place it can be logged or leaked from. A
 * relative URL is never one: in a browser it resolves against the page.
 */
function mayCarryToken(url: string): boolean {
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'https:' && TOKEN_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * The URL a request goes to, joined as axios joins it: an absolute `url`
 * stands alone, and a relative one meets `baseURL` at exactly one slash.
 * Concatenating them as they are gives a different host whenever `url` has
 * no leading slash, which is no basis for deciding where a token may go.
 */
function requestUrl(baseURL: string | undefined, url: string): string {
  if (!baseURL || /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)) return url;
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Takes the bearer out of an error about to leave the SDK.
 *
 * axios hangs the request config, headers included, on its error, and its
 * `toJSON()` writes that out, so an error a host logs, stores or reports
 * would carry the wallet token. In Node the sent request's raw header block
 * hangs off it as well.
 */
function redactAuthorization(error: unknown): void {
  if (typeof error !== 'object' || error === null) return;

  const { config, response, request } = error as {
    config?: { headers?: unknown };
    response?: { config?: { headers?: unknown } };
    request?: { _header?: unknown };
  };

  for (const headers of [config?.headers, response?.config?.headers]) {
    if (!headers || typeof headers !== 'object') continue;
    // AxiosHeaders matches case-insensitively; a plain object does not.
    (headers as { delete?: (name: string) => unknown }).delete?.(
      'Authorization',
    );
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'authorization') {
        delete (headers as Record<string, unknown>)[name];
      }
    }
  }

  if (request && typeof request._header === 'string') {
    request._header = request._header.replace(
      /^authorization:.*$/gim,
      'Authorization: [redacted]',
    );
  }
}

/**
 * HTTP response with timing information
 */
export interface HttpResponse<T> {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** Request duration in milliseconds */
  duration: number;

  /** Response headers */
  headers: Record<string, string>;
}

/**
 * SDK headers added to all requests
 *
 * These headers help with:
 * - Backend analytics (tracking SDK version usage)
 * - Debugging (correlating errors with SDK version)
 * - Support (identifying client environment)
 */
export function getSdkHeaders(): Record<string, string> {
  return {
    'X-SDK-Version': SDK_VERSION,
    'X-SDK-Runtime': SDK_RUNTIME,
  };
}

/**
 * The wallet token a request would carry: `auth` when given, otherwise the
 * deprecated `getAuthToken`.
 *
 * Exported for a caller that chooses a route by whether a token is available
 * before sending anything, so it decides the same way the request will.
 */
export async function resolveAuthToken(
  { auth, getAuthToken }: Pick<HttpRequestOptions, 'auth' | 'getAuthToken'>,
  context: AuthRequestContext,
): Promise<string | undefined> {
  if (auth) return auth.getToken(context);
  return getAuthToken?.();
}

/**
 * The `auth` options for a request whose token the caller has already
 * resolved with {@link resolveAuthToken}, so the host is not asked twice.
 *
 * The first `getToken`, the one the request makes before sending, answers
 * with `token`. Any later one, the retry after a 401, goes to the host's own
 * `getToken`, so a refreshed token still replaces a stale one, and
 * `onUnauthorized` still reaches the host.
 */
export function reuseResolvedToken(
  { auth, getAuthToken }: Pick<HttpRequestOptions, 'auth' | 'getAuthToken'>,
  token: string,
): Pick<HttpRequestOptions, 'auth' | 'getAuthToken'> {
  // The deprecated reader is called once per request and never retried.
  if (!auth) return getAuthToken ? { getAuthToken: () => token } : {};

  let unused: string | undefined = token;
  return {
    auth: {
      getToken(context) {
        const first = unused;
        unused = undefined;
        return first !== undefined
          ? Promise.resolve(first)
          : auth.getToken(context);
      },
      // Called through `auth` so a host implementing it as a method keeps its
      // `this`.
      onUnauthorized: (context) => auth.onUnauthorized?.(context),
    },
  };
}

/**
 * The path part of a URL, for a message that names a call without quoting the
 * whole thing. Tolerates a relative URL, which callers do pass.
 */
function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/**
 * Make an HTTP request with SDK headers and optional logging
 *
 * @param options - Request options
 * @returns Promise resolving to response with timing data
 *
 * @example
 * ```typescript
 * // Simple GET request
 * const { data, duration } = await httpRequest({
 *   url: 'https://api.lombard.finance/deposits',
 *   params: { address: '0x...' },
 * });
 *
 * // With logging
 * const { data } = await httpRequest({
 *   url: '/api/v1/points',
 *   baseURL: 'https://mainnet.prod.lombard.finance',
 *   logger: myLogger,
 * });
 * ```
 */
export async function httpRequest<T = unknown>(
  options: HttpRequestOptions,
): Promise<HttpResponse<T>> {
  const {
    url,
    method = 'GET',
    baseURL,
    params,
    body,
    headers = {},
    logger,
    timeout = 30000,
    getAuthToken,
    auth,
    scope = 'public',
  } = options;

  const startTime = performance.now();
  const fullUrl = requestUrl(baseURL, url);
  const authContext = { url: fullUrl, scope };

  // An explicit Authorization header wins over anything resolved here, so a
  // low-level caller that already holds a token — `revokeWalletToken` sending
  // the token it is revoking, or a caller passing `walletJwt` — is unaffected.
  const callerSuppliedAuth = Object.keys(headers).some(
    (name) => name.toLowerCase() === 'authorization',
  );

  // Off the gateway a public request goes without a token, and one that
  // needs a token, or carries one, is not sent: that is a route wired to the
  // wrong host, not a session to repair.
  const tokenAllowed = mayCarryToken(fullUrl);
  if (!tokenAllowed && (callerSuppliedAuth || scope === 'userScoped')) {
    throw new LombardError(
      ErrorCode.INVALID_CONFIGURATION,
      `A wallet token is sent only to the Lombard API gateway, which ` +
        `${pathOf(fullUrl)} is not on, so it was not sent.`,
      { url: fullUrl, scope },
    );
  }

  async function resolveToken(): Promise<string | undefined> {
    if (callerSuppliedAuth || !tokenAllowed) return undefined;
    return resolveAuthToken({ auth, getAuthToken }, authContext);
  }

  let authToken = await resolveToken();

  // A user-scoped request with no token cannot succeed. Failing here turns a
  // 401 the caller has to interpret into a precondition they can check, and
  // saves a round trip.
  if (scope === 'userScoped' && !authToken && !callerSuppliedAuth) {
    throw new LombardError(
      AuthErrorCode.MISSING_TOKEN,
      // Says the request was not sent. Leading with the URL read as a report
      // of a failed call, which sent readers into the network panel looking
      // for one — nothing is sent on this path. The full URL stays in details.
      `No wallet token was available, so ${pathOf(fullUrl)} was not sent. ` +
        `Supply \`auth\` on the SDK config, or sign in before calling this.`,
      { url: fullUrl, scope },
    );
  }

  const buildHeaders = (token: string | undefined) => ({
    ...getSdkHeaders(),
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  });

  const buildConfig = (token: string | undefined): AxiosRequestConfig => ({
    url,
    method,
    baseURL,
    params,
    data: body,
    headers: buildHeaders(token),
    timeout,
  });

  // Log request if logger provided
  if (logger) {
    logger.debug('HTTP Request', {
      method,
      url: fullUrl,
      params,
      hasBody: !!body,
    });
  }

  /**
   * Sends the request, retrying once on a 401 for a user-scoped call.
   *
   * One retry, not an open loop: asking the host again distinguishes a token
   * that had simply expired — the common case at a seven-day lifetime — from one
   * that was revoked or issued to another address. A second rejection means the
   * session is genuinely gone, so `onUnauthorized` fires and the error
   * surfaces.
   */
  async function send(): Promise<AxiosResponse<T>> {
    // Two attempts at most, and one call site. A second attempt happens only
    // when the host handed back a token we have not tried yet.
    for (let attempt = 0; ; attempt += 1) {
      try {
        // The URL is composed from the SDK's own api-config hosts plus a
        // fixed path; a caller supplies neither, so there is no SSRF surface.
        // Suppressed on this line rather than the one above because the
        // rule-id form was not being honoured.
        return await axios(buildConfig(authToken)); // nosemgrep
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;

        const retryable =
          attempt === 0 &&
          scope === 'userScoped' &&
          status === 401 &&
          !!auth &&
          !callerSuppliedAuth;

        if (!retryable) {
          // A 401 on the second attempt means the session is gone rather than
          // stale: the token that failed was one the host had just minted.
          if (attempt > 0 && status === 401) {
            auth?.onUnauthorized?.(authContext);
            throw new LombardError(
              AuthErrorCode.UNAUTHORIZED,
              `${fullUrl} rejected a freshly obtained wallet token. The session ` +
                `is no longer valid.`,
              { url: fullUrl, scope },
            );
          }

          throw error;
        }

        const refreshed = await auth.getToken(authContext);

        if (!refreshed || refreshed === authToken) {
          // Nothing new to try. Re-asking with the same token would just fail
          // again, so report it rather than spend another round trip.
          auth.onUnauthorized?.(authContext);
          throw new LombardError(
            AuthErrorCode.UNAUTHORIZED,
            `${fullUrl} rejected the wallet token, and no new token was available.`,
            { url: fullUrl, scope },
          );
        }

        authToken = refreshed;
      }
    }
  }

  try {
    const response: AxiosResponse<T> = await send();
    const duration = performance.now() - startTime;

    // Log successful response
    if (logger) {
      logger.debug('HTTP Response', {
        method,
        url: fullUrl,
        status: response.status,
        duration: Math.round(duration),
      });
    }

    return {
      data: response.data,
      status: response.status,
      duration,
      headers: response.headers as Record<string, string>,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    // Log error
    if (logger) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      logger.error('HTTP Error', {
        method,
        url: fullUrl,
        status: axiosError?.response?.status,
        duration: Math.round(duration),
        message: axiosError?.message || String(error),
      });
    }

    redactAuthorization(error);
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function httpGet<T = unknown>(
  url: string,
  options: Omit<HttpRequestOptions, 'url' | 'method' | 'body'> = {},
): Promise<HttpResponse<T>> {
  return httpRequest<T>({ ...options, url, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function httpPost<T = unknown>(
  url: string,
  body?: unknown,
  options: Omit<HttpRequestOptions, 'url' | 'method' | 'body'> = {},
): Promise<HttpResponse<T>> {
  return httpRequest<T>({ ...options, url, method: 'POST', body });
}

/**
 * Convenience method for PUT requests
 */
export async function httpPut<T = unknown>(
  url: string,
  body?: unknown,
  options: Omit<HttpRequestOptions, 'url' | 'method' | 'body'> = {},
): Promise<HttpResponse<T>> {
  return httpRequest<T>({ ...options, url, method: 'PUT', body });
}

/**
 * Convenience method for DELETE requests
 */
export async function httpDelete<T = unknown>(
  url: string,
  options: Omit<HttpRequestOptions, 'url' | 'method' | 'body'> = {},
): Promise<HttpResponse<T>> {
  return httpRequest<T>({ ...options, url, method: 'DELETE' });
}
