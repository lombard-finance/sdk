import { AxiosError } from 'axios';

/** ErrorOptions type for ES2022 compatibility */
interface ErrorOptions {
  cause?: unknown;
}

export enum ErrorCode {
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DEPOSIT_REJECTED = 'DEPOSIT_REJECTED',
  REDEEM_REJECTED = 'REDEEM_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_MESSAGE_ERROR = 'INVALID_MESSAGE_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NO_ACCOUNT_ERROR = 'NO_ACCOUNT_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  SIGNING_REJECTED = 'SIGNING_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  UNSTAKE_REJECTED = 'UNSTAKE_REJECTED',
}

interface CreateSdkErrorParameters {
  code: ErrorCode | string;
  message: string;
  options?: ErrorOptions;
}

export class SolanaSdkError extends Error {
  /** The cause of the error (for error chaining) */
  cause?: unknown;

  constructor(
    /** The error message */
    message: string,
    /** The error code */
    readonly code: ErrorCode | string,
    /** The optional error options */
    options?: ErrorOptions,
  ) {
    super(message);
    this.name = 'SolanaSdkError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  static create({ code, message, options }: CreateSdkErrorParameters) {
    return new SolanaSdkError(message, code, options);
  }

  static wrap(
    error: unknown,
    code = ErrorCode.UNKNOWN_ERROR,
    customMessage = 'Unknown error occurred.',
  ) {
    if (error instanceof SolanaSdkError) return error;

    const message = extractErrorMessage(error);
    const options: ErrorOptions | undefined =
      error instanceof Error ? { cause: error } : undefined;

    return new SolanaSdkError(message || customMessage, code, options);
  }
}

/**
 * Extract a readable error message from any error object
 * @param error Error object to extract message from
 * @returns A readable error message string
 */
function extractErrorMessage(error: unknown): string {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Check for data.message pattern
  // biome-ignore lint/suspicious/noExplicitAny: unknown err
  const hasDataMessage = (
    err: unknown,
  ): err is { data: { message: string } } => {
    const error = err as { data?: { message?: string } };

    return Boolean(
      error?.data?.message && typeof error.data.message === 'string',
    );
  };

  if (hasDataMessage(error)) {
    return error.data.message;
  }

  // Handle standard Error objects and Axios errors
  if (error instanceof Error) {
    if (
      'isAxiosError' in error &&
      (error as unknown as AxiosError).isAxiosError
    ) {
      return extractAxiosErrorMessage(error as unknown as AxiosError);
    }
    return error.message;
  }

  // Handle generic objects with a message property
  if (error !== null && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    // Try to convert object to a readable string
    try {
      return JSON.stringify(error);
    } catch {
      // If JSON.stringify fails, return a generic message
      return 'Unknown error object';
    }
  }

  return 'Unknown error';
}

/**
 * Extract error message from an Axios error
 * @param error Axios error object
 * @returns Error message from the Axios error
 */
function extractAxiosErrorMessage(error: AxiosError): string {
  if (error.response) {
    const responseData = error.response.data;
    if (responseData && typeof responseData === 'object') {
      if (
        'message' in responseData &&
        responseData.message &&
        typeof responseData.message === 'string'
      ) {
        return responseData.message;
      }
      try {
        return JSON.stringify(responseData);
      } catch {
        return 'Error in API response';
      }
    }
    return `HTTP error ${error.response.status}: ${error.response.statusText}`;
  }

  if (error.message) {
    return error.message;
  }

  return 'Network error';
}
