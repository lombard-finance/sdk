import { SANCTIONED_ADDRESS } from '../api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
import { LombardError, ValidationErrorCode } from '../shared/errors';

export function ensureNotSanctionedAddress(address: string): void {
  if (address === SANCTIONED_ADDRESS) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      'Destination address is under sanctions',
    );
  }
}
