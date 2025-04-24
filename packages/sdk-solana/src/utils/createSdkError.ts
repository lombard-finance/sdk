import { ErrorCode } from '../types/errors';

/**
 * Error parameters
 */
export interface ErrorParams {
  /**
   * Error code
   */
  code: ErrorCode | string;

  /**
   * Error message
   */
  message: string;

  /**
   * Optional original error
   */
  cause?: any;

  /**
   * Optional additional data
   */
  data?: any;
}

/**
 * Creates an SDK error
 * @param params Error parameters
 * @returns SDK error
 */
export function createSdkError(params: ErrorParams): Error {
  const { code, message, cause, data } = params;

  const error = new Error(message);

  // Add properties to the error
  Object.defineProperties(error, {
    code: {
      value: code,
      enumerable: true,
      writable: false,
    },
    originalError: {
      value: cause,
      enumerable: true,
      writable: false,
    },
    data: {
      value: data,
      enumerable: true,
      writable: false,
    },
  });

  return error;
}