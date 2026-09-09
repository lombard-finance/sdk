/**
 * Guards for the parameters that decide what a signature authorises.
 *
 * Shared by every signing path rather than living next to one of them: an
 * amount and an expiry are wrong in the same ways wherever they are passed, and
 * a check that exists on one route and not its sibling is the shape these
 * mistakes keep arriving in.
 *
 * @module shared/validation/signing
 */

import BigNumber from 'bignumber.js';

import { now, toUnix } from '../../utils/time';
import { LombardError, ValidationErrorCode } from '../errors';

/**
 * How far ahead a signature expiry may be set.
 *
 * Generous enough that no real authorisation window comes near it, and small
 * enough to catch a millisecond timestamp, which lands tens of thousands of
 * years out.
 */
export const MAX_EXPIRY_HORIZON_DAYS = 365;
const MAX_EXPIRY_HORIZON_SECONDS = MAX_EXPIRY_HORIZON_DAYS * 24 * 60 * 60;

/**
 * Rejects an expiry that cannot become a usable on-chain deadline.
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
 * worse than a throw: the signature is produced and stored, and the failure only
 * appears when it is used on chain, far from the call site.
 *
 * A value far in the future does not surface at all. `Date.now()` unconverted
 * is a positive safe integer in the future, so it clears both checks above and
 * sets a deadline tens of thousands of years out. The signature is produced,
 * stored and stands: an authorisation that never lapses, from one missing
 * division.
 *
 * @param expiry - The timestamp to check.
 * @param paramName - The caller-facing name to use in the message.
 */
export function assertValidExpiry(
  expiry: number,
  paramName = 'expiry',
): void {
  if (!Number.isSafeInteger(expiry) || expiry <= 0) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `${paramName} must be a positive whole number of seconds since the ` +
        `epoch, received ${String(expiry)}. It is an absolute UNIX timestamp ` +
        `in seconds — a fractional value usually means milliseconds, or ` +
        `Date.now() / 1000 without Math.floor.`,
    );
  }

  const nowSeconds = toUnix(now());
  if (expiry <= nowSeconds) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `${paramName} must be in the future, received ${String(expiry)} with ` +
        `the current time at ${String(nowSeconds)}. It is an absolute UNIX ` +
        `timestamp in seconds, not a duration — for seven days from now use ` +
        `Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60.`,
    );
  }

  if (expiry > nowSeconds + MAX_EXPIRY_HORIZON_SECONDS) {
    // `Date.now()` unconverted is the whole reason for this bound: it is a
    // positive safe integer in the future, so it clears both checks above and
    // lands the deadline tens of thousands of years out. The signature is
    // produced and stored, and what the user has actually granted is an
    // authorisation that never lapses. Name that case directly when the
    // magnitude matches, since the fix is one `Math.floor(x / 1000)`.
    const looksLikeMilliseconds = expiry > nowSeconds * 900;
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      looksLikeMilliseconds
        ? `${paramName} looks like milliseconds: ${String(expiry)} is ~1000x ` +
            `the current time in seconds (${String(nowSeconds)}), which would ` +
            `set the deadline to ${describeYear(expiry)}. It is an absolute ` +
            `UNIX timestamp in seconds — divide by 1000.`
        : `${paramName} must be at most ${String(MAX_EXPIRY_HORIZON_DAYS)} ` +
            `days ahead, received ${String(expiry)} with the current time at ` +
            `${String(nowSeconds)}, which is ${describeYear(expiry)}. A ` +
            `deadline that far out is an authorisation that effectively never ` +
            `lapses.`,
    );
  }
}

/**
 * Rejects an amount that is not a whole number of token base units.
 *
 * Every other public write helper in the SDK takes a human-readable amount and
 * converts it, so a caller reaching a base-unit parameter with `'0.001'` is the
 * expected mistake. It has no downstream symptom: the value divides, rounds
 * down to zero and signs, authorising nothing while reporting success.
 *
 * @param value - The amount to check, in base units.
 * @param paramName - The caller-facing name to use in the message.
 * @param unitHint - What the base unit is on this route, for the message.
 */
export function assertPositiveBaseUnits(
  value: BigNumber.Value,
  paramName: string,
  unitHint: string,
): void {
  const amount = new BigNumber(value);

  if (!amount.isFinite() || amount.isLessThanOrEqualTo(0)) {
    throw new LombardError(
      ValidationErrorCode.INVALID_AMOUNT,
      `${paramName} must be greater than zero, received ` +
        `${String(value)}. It is ${unitHint}.`,
    );
  }

  if (!amount.isInteger()) {
    throw new LombardError(
      ValidationErrorCode.INVALID_AMOUNT,
      `${paramName} must be a whole number of base units, received ` +
        `${String(value)}. It is ${unitHint}, not a human-readable amount — ` +
        `0.001 BTC is 100000, not 0.001.`,
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
