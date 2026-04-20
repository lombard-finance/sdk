import { AxiosError } from 'axios';

const ADBLOCKER_ERROR_CODE = 'ERR_NETWORK';

const ADBLOCK_ERROR_MSG =
  'This may be due to your Adblocker. Please disable any Adblocker and refresh the page to restore full functionality.';

/**
 * Handles the error from the mempool.space API.
 * If the error is due to an adblocker, it throws an error with a message to disable the adblocker.
 *
 * @param error Error object.
 *
 * @throws Error with the error message.
 */
export function handleMempoolApiError(error: unknown): never {
  const { code, message } = error as AxiosError;

  if (code === ADBLOCKER_ERROR_CODE) {
    throw new Error(ADBLOCK_ERROR_MSG);
  }

  throw new Error(message);
}
