import { CommonParameters } from '../../common/parameters';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { fromSatoshi } from '../../utils/satoshi';
import { makePublicClient } from '../../clients/public-client';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';

/**
 * Get the total supply of LBTC tokens.
 *
 * @param {CommonParameters} parameters - The parameters.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @return {Promise<BigNumber>}
 */
export async function getLBTCTotalSupply({
  chainId,
  rpcUrl,
  env = DEFAULT_ENV,
}: CommonParameters): Promise<BigNumber> {
  const publicClient = makePublicClient({ chainId, rpcUrl });
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, env);

  const totalSupplyRaw = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'totalSupply',
  });

  return fromSatoshi(String(totalSupplyRaw));
}
