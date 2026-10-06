import type { AxiosError } from 'axios';

import { getErrorMessage } from '../../utils/err';

/**
 * Why the v2 stake-and-bake permit routes refused a request.
 *
 * - `CAP_REACHED`: the owner already has the maximum number of pending permits
 *   for the token; complete or replace one first.
 * - `OUT_OF_SEQUENCE`: the nonce is not the next one in the token's sequence;
 *   `expectedNonce` carries the one the API expects.
 * - `NONCE_CONSUMED`: the nonce was already spent on chain or by a claim.
 * - `BEING_CLAIMED`: the permit is being claimed right now; retry later.
 * - `UNKNOWN_SPENDER`: the spender is not a stake-and-bake contract on the chain.
 * - `TOKEN_NOT_STAKED`: the permit's token is not the one the spender stakes.
 * - `ALLOWANCE_TOO_LOW`: approve mode; the spender's allowance does not cover
 *   the sum of the owner's pending deposits.
 * - `FORBIDDEN`: the permit owner is not the address the request is made for.
 * - `UNKNOWN`: any other refusal; read `message`.
 */
export type StakeAndBakePermitErrorCode =
  | 'CAP_REACHED'
  | 'OUT_OF_SEQUENCE'
  | 'NONCE_CONSUMED'
  | 'BEING_CLAIMED'
  | 'UNKNOWN_SPENDER'
  | 'TOKEN_NOT_STAKED'
  | 'ALLOWANCE_TOO_LOW'
  | 'FORBIDDEN'
  | 'UNKNOWN';

/**
 * A refusal from the v2 stake-and-bake permit routes. `message` is the API's
 * own text, unmodified.
 */
export class StakeAndBakePermitError extends Error {
  constructor(
    public readonly code: StakeAndBakePermitErrorCode,
    message: string,
    public readonly details: {
      /** HTTP status of the refusal, absent for a refusal raised locally. */
      status?: number;
      /** `OUT_OF_SEQUENCE` only: the nonce the API expects next. */
      expectedNonce?: string;
    } = {},
  ) {
    super(message);
    this.name = 'StakeAndBakePermitError';
  }

  /** HTTP status of the refusal, absent for a refusal raised locally. */
  get status(): number | undefined {
    return this.details.status;
  }

  /** `OUT_OF_SEQUENCE` only: the nonce the API expects next. */
  get expectedNonce(): string | undefined {
    return this.details.expectedNonce;
  }
}

const OUT_OF_SEQUENCE_PATTERN = /out of sequence\D*?(\d+)/i;

/**
 * Classifies a refusal by its message first and its status second. The
 * message is what tells the 400s apart; a status alone is only trusted where
 * it means one thing (409, 412).
 */
export function classifyStakeAndBakePermitError(
  status: number | undefined,
  message: string,
): {
  code: StakeAndBakePermitErrorCode;
  expectedNonce?: string;
} {
  const text = message.toLowerCase();

  const outOfSequence = OUT_OF_SEQUENCE_PATTERN.exec(message);
  if (outOfSequence) {
    return { code: 'OUT_OF_SEQUENCE', expectedNonce: outOfSequence[1] };
  }
  if (text.includes('out of sequence')) {
    return { code: 'OUT_OF_SEQUENCE' };
  }
  if (
    text.includes('complete or replace') ||
    /\d+\s+of\s+\d+\s+pending/.test(text)
  ) {
    return { code: 'CAP_REACHED' };
  }
  if (text.includes('being claimed')) {
    return { code: 'BEING_CLAIMED' };
  }
  if (text.includes('already consumed') || text.includes('already used')) {
    return { code: 'NONCE_CONSUMED' };
  }
  if (text.includes('is not staked by')) {
    return { code: 'TOKEN_NOT_STAKED' };
  }
  if (text.includes('allowance')) {
    return { code: 'ALLOWANCE_TOO_LOW' };
  }
  if (text.includes('spender')) {
    return { code: 'UNKNOWN_SPENDER' };
  }

  if (status === 409) return { code: 'NONCE_CONSUMED' };
  if (status === 412) return { code: 'BEING_CLAIMED' };
  if (status === 403) return { code: 'FORBIDDEN' };

  return { code: 'UNKNOWN' };
}

/** The HTTP status of an axios rejection, read off its shape. */
export function getResponseStatus(error: unknown): number | undefined {
  return (error as AxiosError | undefined)?.response?.status;
}

/**
 * Turns an HTTP refusal into a `StakeAndBakePermitError`. A rejection without
 * a response (timeout, network) is not a refusal and becomes a plain `Error`.
 */
export function toStakeAndBakePermitError(error: unknown): Error {
  const message = getErrorMessage(error);
  const status = getResponseStatus(error);

  if (status === undefined) {
    return new Error(message);
  }

  const { code, expectedNonce } = classifyStakeAndBakePermitError(
    status,
    message,
  );
  return new StakeAndBakePermitError(code, message, {
    status,
    ...(expectedNonce !== undefined ? { expectedNonce } : {}),
  });
}
