/**
 * Auth errors surfaced by the SDK's HTTP layer.
 *
 * @module common/auth-errors
 */

/**
 * Thrown when a backend request is rejected with HTTP 401 — i.e. the wallet
 * JWT is missing, expired, or revoked. The SDK does NOT auto-refresh or retry
 * (re-authenticating means a wallet signature, which must be a deliberate user
 * action); it clears any SDK-held token and surfaces this so the app can
 * trigger a re-login at the right moment.
 */
export class UnauthorizedError extends Error {
  /** Request URL that returned 401, when known. */
  readonly url?: string;

  constructor(url?: string, cause?: unknown) {
    super(
      url ? `Unauthorized request (${url})` : 'Unauthorized request',
      cause === undefined ? undefined : { cause },
    );
    this.name = 'UnauthorizedError';
    this.url = url;
  }
}
