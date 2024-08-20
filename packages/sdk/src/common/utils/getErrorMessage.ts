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

function getErrorMessageFromObject(error: any): string {
  if (error?.message) {
    return error.message;
  }

  return 'Unknown error';
}
