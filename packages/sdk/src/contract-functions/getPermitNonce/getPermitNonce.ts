import { CommonParameters } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { determineEnv } from '../../utils/env';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { getLBTCContract } from '../../tokens/lbtc-contract';
import { Address } from 'viem';

export interface IGetPermitNonceParams extends CommonParameters {
  /**
   * Owner address to check permit nonce for
   */
  owner: Address;
}

/**
 * Get permit nonce for a specific owner address from LBTC contract.
 * This nonce is used in EIP-2612 permit operations.
 *
 * @param {IGetPermitNonceParams} parameters - The parameters.
 * @param {Address} parameters.owner - The account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 */
export async function getPermitNonce({
  owner,
  chainId,
  rpcUrl,
  env = DEFAULT_ENV,
}: IGetPermitNonceParams): Promise<string> {
  try {
    const environment = env || determineEnv(chainId);
    const lbtcContract = getLBTCContract({ chainId, rpcUrl, env: environment });
    const nonce = await lbtcContract.read.nonces([owner]);
    return String(nonce);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
