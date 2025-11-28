import { AxiosError } from 'axios';

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
  const hasDataMessage = (err: unknown): err is { data: { message: string } } =>
    typeof err === 'object' &&
    err !== null &&
    'data' in err &&
    typeof (err as { data?: unknown }).data === 'object' &&
    (err as { data?: unknown }).data !== null &&
    'message' in ((err as { data?: unknown }).data as object) &&
    typeof (
      (err as { data?: { message?: unknown } }).data as { message?: unknown }
    ).message === 'string';

  if (hasDataMessage(error)) {
    return error.data.message;
  }

  // Handle standard Error objects and Axios errors
  if (error instanceof Error) {
    if ('isAxiosError' in error && error.isAxiosError) {
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
