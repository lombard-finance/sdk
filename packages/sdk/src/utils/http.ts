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

import type { LombardAuth, RequestScope } from '@lombard.finance/sdk-common';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import type { Logger } from '../shared/context/types';
import { AuthErrorCode, LombardError } from '../shared/errors';
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
   * When it yields a token, an `Authorization: Bearer <token>` header is added.
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
   * happens to be available and never fails for want of one.
   */
  scope?: RequestScope;
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
  const fullUrl = baseURL ? `${baseURL}${url}` : url;
  const authContext = { url: fullUrl, scope };

  // An explicit Authorization header wins over anything resolved here, so a
  // low-level caller that already holds a token — `revokeWalletToken` sending
  // the token it is revoking, or a caller passing `walletJwt` — is unaffected.
  const callerSuppliedAuth = 'Authorization' in headers;

  async function resolveToken(): Promise<string | undefined> {
    if (callerSuppliedAuth) return undefined;
    if (auth) return auth.getToken(authContext);
    return getAuthToken?.();
  }

  let authToken = await resolveToken();

  // A user-scoped request with no token cannot succeed. Failing here turns a
  // 401 the caller has to interpret into a precondition they can check, and
  // saves a round trip.
  if (scope === 'userScoped' && !authToken && !callerSuppliedAuth) {
    throw new LombardError(
      AuthErrorCode.MISSING_TOKEN,
      `${fullUrl} needs a wallet token and none was available. Supply ` +
        `\`auth\` on the SDK config, or sign in before calling this.`,
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
      url: baseURL ? `${baseURL}${url}` : url,
      params,
      hasBody: !!body,
    });
  }

  /**
   * Sends the request, retrying once on a 401 for a user-scoped call.
   *
   * One retry, not a loop: asking the host again distinguishes a token that had
   * simply expired — the common case at a seven-day lifetime — from one that was
   * revoked or issued to another address. A second rejection means the session
   * is genuinely gone, so `onUnauthorized` fires and the error surfaces.
   */
  async function send(): Promise<AxiosResponse<T>> {
    try {
      return await axios(buildConfig(authToken));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const canRetry =
        scope === 'userScoped' &&
        status === 401 &&
        !!auth &&
        !callerSuppliedAuth;

      if (!canRetry) throw error;

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

      try {
        return await axios(buildConfig(refreshed));
      } catch (retryError) {
        const retryStatus = (retryError as { response?: { status?: number } })
          ?.response?.status;

        if (retryStatus === 401) {
          auth.onUnauthorized?.(authContext);
          throw new LombardError(
            AuthErrorCode.UNAUTHORIZED,
            `${fullUrl} rejected a freshly obtained wallet token. The session ` +
              `is no longer valid.`,
            { url: fullUrl, scope },
          );
        }

        throw retryError;
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
        url: baseURL ? `${baseURL}${url}` : url,
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
        url: baseURL ? `${baseURL}${url}` : url,
        status: axiosError?.response?.status,
        duration: Math.round(duration),
        message: axiosError?.message || String(error),
      });
    }

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
