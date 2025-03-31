import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getBasculeTokenContract } from '../utils/getBasculeTokenContract';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';
import { ZERO_ADDRESS } from '../../common/const';

const NO_DEPOSIT_ID_ERROR =
  'No deposit ID provided. Please provide a deposit ID as an argument.';

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
   * raw_payload of the transaction.
   */
  rawPayload?: string;
}

/**
 * Check bascule contract deposit status.
 *
 * @param {ICheckBasculeDepositStatusParams} params - The parameters to get status base on Bascule contract.
 *
 * @returns {Promise<BasculeDepositStatus>} Deposit status promise
 */
export async function getBasculeDepositStatus({
  rawPayload,
  env,
  ...providerParams
}: ICheckBasculeDepositStatusParams) {
  if (!rawPayload) {
    throw new Error(NO_DEPOSIT_ID_ERROR);
  }

  const provider = new Provider(providerParams);

  const tokenContract = getLbtcTokenContract(provider, env);

  const basculeAddress: string = await tokenContract.methods.Bascule().call();

  if (basculeAddress === ZERO_ADDRESS) {
    return BasculeDepositStatus.REPORTED;
  }

  const basculeContract = getBasculeTokenContract(provider, basculeAddress);

  try {
    const legacyHash = provider
      .getReadWeb3()
      .utils.keccak256(
        Buffer.from(rawPayload.slice(8), 'hex') as unknown as Uint8Array,
      );

    const status: bigint = await basculeContract.methods
      .depositHistory(legacyHash)
      .call();

    const depositStatus: BasculeDepositStatus = Number(status);

    return depositStatus;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    throw new Error(errorMessage);
  }
}
