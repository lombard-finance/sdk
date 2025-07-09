import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Address } from 'viem';
import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { determineEnv } from '../../utils/env';

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
  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, environment);

  const nonce = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'nonces',
    args: [owner],
  });

  return String(nonce);
}
