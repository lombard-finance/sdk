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

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import type { Logger } from '../shared/context/types';
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
    'X-SDK-Runtime': SDK_RUNTIME };
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
    timeout = 30000 } = options;

  const startTime = performance.now();

  // Merge SDK headers with custom headers
  const mergedHeaders = {
    ...getSdkHeaders(),
    'Content-Type': 'application/json',
    ...headers };

  const config: AxiosRequestConfig = {
    url,
    method,
    baseURL,
    params,
    data: body,
    headers: mergedHeaders,
    timeout };

  // Log request if logger provided
  if (logger) {
    logger.debug('HTTP Request', {
      method,
      url: baseURL ? `${baseURL}${url}` : url,
      params,
      hasBody: !!body });
  }

  try {
    const response: AxiosResponse<T> = await axios(config);
    const duration = performance.now() - startTime;

    // Log successful response
    if (logger) {
      logger.debug('HTTP Response', {
        method,
        url: baseURL ? `${baseURL}${url}` : url,
        status: response.status,
        duration: Math.round(duration) });
    }

    return {
      data: response.data,
      status: response.status,
      duration,
      headers: response.headers as Record<string, string> };
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
        message: axiosError?.message || String(error) });
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

