import BigNumber from 'bignumber.js';
import { CommonParameters } from '../../common/parameters';
import { determineEnv } from '../../utils/env';
import { fromSatoshi } from '../../utils/satoshi';
import { makePublicClient } from '../../clients/public-client';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';

/**
 * Gets LBTC minting fee amount.
 *
 * @param {CommonParameters} parameters - The parameters.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @return {Promise<BigNumber>}
 */
export async function getLBTCMintingFee({
  chainId,
  rpcUrl,
  env,
}: CommonParameters): Promise<BigNumber> {
  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, environment);

  const rawFeeValue = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'getMintFee',
  });

  const lbtcMintFee = fromSatoshi(String(rawFeeValue));
  return lbtcMintFee;
}
