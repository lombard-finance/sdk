import { AxiosError } from 'axios';
import { ErrorCode, SdkError } from '../types/errors';

/**
 * Creates a standardized SDK error object
 * @param code Error code from ErrorCode enum
 * @param message Human-readable error message
 * @param originalError Original error that was caught (if any)
 * @param data Additional data related to the error
 * @returns A standardized SdkError object
 */
export function createSdkError(
  code: ErrorCode | string,
  message: string,
  originalError?: unknown,
  data?: Record<string, unknown>,
): SdkError {
  return {
    code: typeof code === 'string' ? code : code,
    message,
    originalError,
    data,
  };
}

/**
 * Helper function to determine if an error is an SDK error
 * @param error Error to check
 * @returns Boolean indicating if the error is an SDK error
 */
export function isSdkError(error: unknown): error is SdkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as SdkError).code === 'string' &&
    typeof (error as SdkError).message === 'string'
  );
}

/**
 * Extract a readable error message from any error object
 * @param error Error object to extract message from
 * @returns A readable error message string
 */
export function extractErrorMessage(error: unknown): string {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Check for data.message pattern
  const hasDataMessage = (err: any): err is { data: { message: string } } =>
    err?.data?.message && typeof err.data.message === 'string';

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
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
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
    const responseData = error.response.data as any;
    if (responseData && typeof responseData === 'object') {
      if (responseData.message && typeof responseData.message === 'string') {
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

/**
 * Wraps an error in an SDK error if it's not already one
 * @param error Error to wrap
 * @param defaultCode Default error code to use if not an SDK error
 * @param defaultMessage Default error message to use if not an SDK error
 * @returns An SDK error
 */
export function wrapError(
  error: unknown,
  defaultCode: ErrorCode | string = ErrorCode.UNKNOWN_ERROR,
  defaultMessage: string = 'An unknown error occurred',
): SdkError {
  if (isSdkError(error)) {
    return error;
  }

  const message = extractErrorMessage(error) || defaultMessage;

  return createSdkError(defaultCode, message, error);
}

/**
 * Convert an error to a readable string for display
 * @param error Error to convert to string
 * @returns A readable error message string
 */
export function errorToString(error: unknown): string {
  if (isSdkError(error)) {
    return error.message;
  }

  return extractErrorMessage(error);
}
