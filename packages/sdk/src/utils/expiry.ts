import { LombardError, ValidationErrorCode } from '../shared/errors';
import { now, toUnix } from './time';

/**
 * How far ahead a permit deadline may be set.
 *
 * Generous enough that no real authorisation window comes near it, and small
 * enough to catch a millisecond timestamp, which lands tens of thousands of
 * years out.
 */
export const MAX_EXPIRY_HORIZON_DAYS = 365;
const MAX_EXPIRY_HORIZON_SECONDS = MAX_EXPIRY_HORIZON_DAYS * 24 * 60 * 60;

/**
 * Rejects an expiry that cannot become a usable permit deadline.
 *
 * The parameter is an absolute UNIX timestamp in **seconds**, and three
 * mistakes follow from that, each worse than the last.
 *
 * A fractional value is almost always milliseconds, or `Date.now() / 1000`
 * without a `Math.floor`, and `BigInt()` would reject it with a message naming
 * neither the parameter nor the unit.
 *
 * A value in the past is almost always a relative duration — `7 * 24 * 60 * 60`
 * puts the deadline in 1970 — or a timestamp that has gone stale. That one is
 * worse than a throw: the permit signs, the signature is stored, and the
 * failure only appears when the permit is used on chain, far from the call site.
 *
 * A value far in the future does not surface at all. `Date.now()` unconverted
 * is a positive safe integer in the future, so it clears both checks above and
 * sets a deadline tens of thousands of years out. The permit signs, stores and
 * stands: a spending allowance to the vault spender that never lapses, from one
 * missing division.
 */
export function assertValidExpiry(
  expiry: number,
  subject = 'permit deadline',
): void {
  if (!Number.isSafeInteger(expiry) || expiry <= 0) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `expiry must be a positive whole number of seconds since the epoch, ` +
        `received ${String(expiry)}. It is an absolute UNIX timestamp in ` +
        `seconds — a fractional value usually means milliseconds, or ` +
        `Date.now() / 1000 without Math.floor.`,
    );
  }

  const nowSeconds = toUnix(now());
  if (expiry <= nowSeconds) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `expiry must be in the future, received ${String(expiry)} with the ` +
        `current time at ${String(nowSeconds)}. It is an absolute UNIX ` +
        `timestamp in seconds, not a duration — for seven days from now use ` +
        `Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60.`,
    );
  }

  if (expiry > nowSeconds + MAX_EXPIRY_HORIZON_SECONDS) {
    // `Date.now()` unconverted is the whole reason for this bound: it is a
    // positive safe integer in the future, so it clears both checks above and
    // lands the deadline tens of thousands of years out. The permit signs and
    // is stored, and what the user has actually granted is an allowance to the
    // vault spender that never lapses. Name that case directly when the
    // magnitude matches, since the fix is one `Math.floor(x / 1000)`.
    const looksLikeMilliseconds = expiry > nowSeconds * 900;
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      looksLikeMilliseconds
        ? `expiry looks like milliseconds: ${String(expiry)} is ~1000x the ` +
            `current time in seconds (${String(nowSeconds)}), which would set ` +
            `the ${subject} to ${describeYear(expiry)}. It is an absolute ` +
            `UNIX timestamp in seconds — divide by 1000.`
        : `expiry must be at most ${String(MAX_EXPIRY_HORIZON_DAYS)} days ` +
            `ahead, received ${String(expiry)} with the current time at ` +
            `${String(nowSeconds)}, which is ${describeYear(expiry)}. A permit ` +
            `that far out is an authorisation that effectively ` +
            `never lapses.`,
    );
  }
}

/** The year a UNIX-second timestamp falls in, for an error message. */
function describeYear(expirySeconds: number): string {
  const asDate = new Date(expirySeconds * 1000);
  return Number.isNaN(asDate.getTime())
    ? 'a date that cannot be represented'
    : `the year ${String(asDate.getUTCFullYear())}`;
}
