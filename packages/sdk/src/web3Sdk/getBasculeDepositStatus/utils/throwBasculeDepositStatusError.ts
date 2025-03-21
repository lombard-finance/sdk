import { BasculeDepositStatus } from '../getBasculeDepositStatus';

export function throwBasculeDepositStatusError(status: BasculeDepositStatus) {
  let errorMessage = '';

  switch (status) {
    case BasculeDepositStatus.UNREPORTED:
      errorMessage = 'Checking Minting Status, try again in 30 seconds.';
      break;

    case BasculeDepositStatus.WITHDRAWN:
      errorMessage =
        'Funds have been withdrawn. Minting is currently disabled.';
      break;

    default:
      errorMessage = 'Unknown Error';
  }

  throw new Error(errorMessage, { cause: true });
}
