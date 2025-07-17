import BigNumber from 'bignumber.js';
import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { determineEnv } from '../../utils/env';
import { fromSatoshi } from '../../utils/satoshi';

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
  env,
}: CommonParameters): Promise<BigNumber> {
  const environment = env || determineEnv(chainId);
  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, environment);

  const totalSupplyRaw = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'totalSupply',
  });

  return fromSatoshi(String(totalSupplyRaw));
}
