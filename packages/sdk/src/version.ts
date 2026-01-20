/**
 * SDK Version and Metadata
 *
 * Provides SDK version information for:
 * - HTTP request headers (X-SDK-Version)
 * - Error context for debugging
 * - User-agent identification
 *
 * The SDK_VERSION is injected at build time by Vite's `define` config.
 * In development/tests, it falls back to 'development'.
 *
 * @module version
 */

/**
 * SDK version string
 *
 * Injected at build time from package.json via Vite define.
 * Format: semver (e.g., "3.7.4")
 *
 * @example
 * ```typescript
 * import { SDK_VERSION } from '@lombard.finance/sdk';
 * console.log(`Using Lombard SDK v${SDK_VERSION}`);
 * ```
 */
declare const __SDK_VERSION__: string;
export const SDK_VERSION: string =
  typeof __SDK_VERSION__ !== 'undefined' ? __SDK_VERSION__ : 'development';

/**
 * SDK package name
 *
 * The npm package name for the SDK.
 */
export const SDK_NAME = '@lombard.finance/sdk';

/**
 * SDK runtime environment
 *
 * Detects whether running in browser, Node.js, or unknown environment.
 */
export const SDK_RUNTIME: 'browser' | 'node' | 'unknown' = (() => {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return 'browser';
  }
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }
  return 'unknown';
})();

