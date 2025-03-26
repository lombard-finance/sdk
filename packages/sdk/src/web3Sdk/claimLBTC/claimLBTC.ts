import {
  BasculeDepositStatus,
  getBasculeDepositStatus,
} from '../getBasculeDepositStatus';
import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { IWeb3SendResult, Provider } from '../../provider';
import { IProviderBasedParams } from '../types';
import { getGasMultiplier } from '../utils/getGasMultiplier';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';
import { throwBasculeDepositStatusError } from '../getBasculeDepositStatus/utils/throwBasculeDepositStatusError';
import { BASCULE_SUPPORTED_CHAINS } from '../getBasculeDepositStatus/utils/const';

const INSUFFICIENT_FUNDS_PARTIAL_ERROR = 'insufficient funds';

const INSUFFICIENT_FUNDS_ERROR =
  'Insufficient funds for transfer. Make sure you have enough ETH to cover the gas cost.';

export interface IClaimLBTCParams extends IProviderBasedParams, IEnvParam {
  /**
   * Raw payload from deposit notarization.
   */
  data: string;
  /**
   * Signature from deposit notarization.
   */
  proofSignature: string;
}

const hexify = (hexString: string) =>
  hexString.startsWith('0x') ? hexString : `0x${hexString}`;
/**
 * Claims LBTC.
 *
 * @param {IClaimLBTCParams} params - The parameters for claiming LBTC.
 *
 * @returns {Promise<IWeb3SendResult>} transaction promise
 */
export async function claimLBTC({
  data,
  proofSignature,
  env,
  ...providerParams
}: IClaimLBTCParams): Promise<IWeb3SendResult> {
  const provider = new Provider(providerParams);

  if (BASCULE_SUPPORTED_CHAINS.includes(provider.chainId)) {
    const status = await getBasculeDepositStatus({
      env,
      rawPayload: data,
      ...providerParams,
    });

    if (status !== BasculeDepositStatus.REPORTED) {
      throwBasculeDepositStatusError(status);
    }
  }

  const tokenContract = getLbtcTokenContract(provider, env);

  const tx = tokenContract.methods.mint(hexify(data), hexify(proofSignature));

  try {
    const result = await provider.sendTransactionAsync(
      provider.account,
      tokenContract.options.address,
      {
        data: tx.encodeABI(),
        estimate: true,
        estimateFee: true,
        gasLimitMultiplier: getGasMultiplier(provider.chainId),
      },
    );

    return result;
  } catch (error) {
    console.log('error', error);
    const errorMessage = getErrorMessage(error);

    if (errorMessage.includes(INSUFFICIENT_FUNDS_PARTIAL_ERROR)) {
      throw new Error(INSUFFICIENT_FUNDS_ERROR);
    }

    throw new Error(errorMessage);
  }
}
