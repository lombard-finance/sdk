import { Env } from '@lombard.finance/sdk-common';
import { AxiosError } from 'axios';

import { ChainId } from '../common/chains';
import { Token } from '../tokens/token-addresses';

/**
 * Retrieves the error message from the given error object.
 *
 * @param error - The error object.
 * @returns The error message as a string.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  const hasDataMessage = (err: unknown): err is { data: { message: string } } =>
    Boolean(
      err &&
      typeof err === 'object' &&
      'data' in err &&
      err.data &&
      typeof err.data === 'object' &&
      'message' in err.data &&
      err?.data?.message &&
      typeof err.data.message === 'string',
    );

  if (hasDataMessage(error)) {
    return error.data.message;
  }

  if (error instanceof Error) {
    return getAxiosErrorMessage(error as AxiosError);
  }

  return getErrorMessageFromObject(error);
}

function getAxiosErrorMessage(error: AxiosError): string {
  if (error.response) {
    return (error.response.data as { message: string }).message;
  }

  return error.message;
}

function getErrorMessageFromObject(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Unknown error';
}

export class TokenContractAddressNotFoundError extends Error {
  constructor(
    public readonly token: Token,
    public readonly chainId: ChainId,
    env?: Env,
  ) {
    const message = `Could not determine the ${token} contract address for given chain id: ${chainId} (env: ${env || 'undefined'})`;
    super(message);
  }
}

/**
 * Thrown when a v2 API route rejects the wallet JWT (expired, revoked, or
 * issued to a different address). Consumers catch this to trigger a re-login
 * instead of inspecting raw axios error shapes.
 */
export class UnauthorizedWalletJwtError extends Error {
  constructor(public readonly url: string) {
    super(`Wallet JWT rejected (${url})`);
    this.name = 'UnauthorizedWalletJwtError';
  }
}

/**
 * Thrown when a permit challenge cannot be redeemed because the wallet already
 * has an active stake-and-bake signature on file.
 *
 * A returning user is in this state for the lifetime of their previous permit,
 * so it is an ordinary branch rather than a failure: fall back to the plain
 * wallet challenge, which issues a JWT without a second permit.
 *
 * The API reports it as `{ code: 9, message: "an active signature is already
 * stored for this wallet…" }`. Typed here so callers can branch on it instead
 * of matching that string.
 */
export class ActivePermitExistsError extends Error {
  readonly code = 9;
  constructor(
    message = 'An active stake-and-bake signature already exists for this wallet',
    /** When the existing signature lapses, if the caller looked it up. */
    public readonly expiresAt?: string,
  ) {
    super(message);
    this.name = 'ActivePermitExistsError';
  }
}

export class UnsupportedTokenFlow extends Error {
  constructor(
    public readonly tokenIn: Token,
    public readonly tokenOut: Token | string,
    public readonly chainId: ChainId,
    env?: Env,
  ) {
    const message = `The flow of ${tokenIn} to ${tokenOut} on ${chainId} (env: ${env || 'undefined'}) is not supported`;
    super(message);
  }
}
