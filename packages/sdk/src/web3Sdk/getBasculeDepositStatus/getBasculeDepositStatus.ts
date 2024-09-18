import { isHexStrict } from 'web3-validator';

import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getBasculeTokenContract } from '../utils/getBasculeTokenContract';

const NO_DEPOSIT_ID_ERROR =
  'No deposit ID provided. Please provide a deposit ID as an argument.';

const INVALID_DEPOSIT_ID_ERROR =
  'Invalid deposit ID. Expected a 0x-prefixed 32-byte hex string.';

// Deposit status enum
export enum BasculeDepositStatus {
  UNREPORTED = 0, // potentially pending
  REPORTED = 1,
  WITHDRAWN = 2,
}

export interface ICheckBasculeDepositStatusParams
  extends IProviderBasedParams,
    IEnvParam {
  /**
   * id of the transaction.
   */
  txId?: string;
}

/**
 * Check bascule contract deposit status.
 *
 * @param {ICheckBasculeDepositStatusParams} params - The parameters to get status base on Bascule contract.
 *
 * @returns {Promise<BasculeDepositStatus>} Deposit status promise
 */
export async function getBasculeDepositStatus({
  txId,
  env,
  ...providerParams
}: ICheckBasculeDepositStatusParams): Promise<BasculeDepositStatus> {
  if (!txId) {
    throw new Error(NO_DEPOSIT_ID_ERROR);
  }

  if (!isHexStrict(txId)) {
    throw new Error(INVALID_DEPOSIT_ID_ERROR);
  }

  const provider = new Provider(providerParams);
  const basculeContract = getBasculeTokenContract(provider, env);

  try {
    const status: bigint = await basculeContract.methods
      .depositHistory(Buffer.from(txId.replace(/^0x/, ''), 'hex'))
      .call();

    const depositStatus: BasculeDepositStatus = Number(status);

    return depositStatus;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    throw new Error(errorMessage);
  }
}
