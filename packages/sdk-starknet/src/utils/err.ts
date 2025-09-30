import { extractErrorMessage } from '@lombard.finance/sdk-common/utils/err';
import { StarknetChainId } from './chains';
import { Token } from '../tokens/lib/tokens';

enum ErrorCode {
  NO_PROVIDER = 'NO_PROVIDER',
  NO_TOKEN = 'NO_TOKEN',
  UNSUPPORTED_TOKEN = 'UNSUPPORTED_TOKEN',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NO_STARKNET_WINDOW_OBJECT = 'NO_STARKNET_WINDOW_OBJECT',
  NO_PUBKEY = 'NO_PUBKEY',
  UNKNOWN_SIGNATURE_FORMAT = 'UNKNOWN_SIGNATURE_FORMAT',
  UNEXPECTED_OUTPUT_SCRIPT = 'UNEXPECTED_OUTPUT_SCRIPT',
  UNSUPPORTED_WALLET = 'UNSUPPORTED_WALLET',
}

export class StarknetSdkError extends Error {
  constructor(
    /** The error message */
    message: string,
    /** The error code */
    readonly code: ErrorCode | string,
    /** The optional error options */
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  static wrap(
    error: unknown,
    code = ErrorCode.UNKNOWN_ERROR,
    customMessage = 'Unknown error occurred.',
  ) {
    if (error instanceof StarknetSdkError) return error;

    const message = extractErrorMessage(error);
    const options: ErrorOptions | undefined =
      error instanceof Error ? { cause: error } : undefined;

    return new StarknetSdkError(message || customMessage, code, options);
  }
}

export const ERR_NO_PROVIDER = (chainId: StarknetChainId | undefined) =>
  new StarknetSdkError(
    `Could not determine the RPC provider for given chain: ${chainId || 'undefined'}`,
    ErrorCode.NO_PROVIDER,
  );

export const ERR_NO_TOKEN = (token: Token | undefined) =>
  new StarknetSdkError(
    `Could not retrieve the token information for given token: ${token || 'undefined'}`,
    ErrorCode.NO_TOKEN,
  );

export const ERR_UNSUPPORTED_TOKEN = (token: Token | undefined) =>
  new StarknetSdkError(
    `The token ${token || 'undefined'} is not supported.`,
    ErrorCode.UNSUPPORTED_TOKEN,
  );

export const ERR_NO_STARKNET_WINDOW_OBJECT = () =>
  new StarknetSdkError(
    'No Starknet window object detected',
    ErrorCode.NO_STARKNET_WINDOW_OBJECT,
  );

export const ERR_NO_PUBKEY = (account: string, chainId: StarknetChainId) =>
  new StarknetSdkError(
    `Could not retrieve pubKey for ${account} on ${chainId}`,
    ErrorCode.NO_PUBKEY,
  );

export const ERR_UNKNOWN_SIGNATURE_FORMAT = () =>
  new StarknetSdkError(
    'Unknown signature format, known formats are [r, s], [version, r, s], [version, type, r, s, ...]',
    ErrorCode.UNKNOWN_SIGNATURE_FORMAT,
  );

export const ERR_UNEXPECTED_OUTPUT_SCRIPT = () =>
  new StarknetSdkError(
    'The output script for provided BTC address is invalid',
    ErrorCode.UNEXPECTED_OUTPUT_SCRIPT,
  );

export const ERR_UNSUPPORTED_WALLET = (walletName?: string) =>
  new StarknetSdkError(
    `The wallet ${walletName || ''} is not supported`,
    ErrorCode.UNSUPPORTED_WALLET,
  );
