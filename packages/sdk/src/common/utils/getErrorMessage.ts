import { AxiosError } from 'axios';

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
