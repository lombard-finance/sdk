import BigNumber from 'bignumber.js';
import { CommonParameters } from '../../common/parameters';
import { getLBTCContract } from '../../tokens/lbtc-contract';
import { determineEnv } from '../../utils/env';
import { getErrorMessage } from '../../utils/err';
import { fromSatoshi } from '../../utils/satoshi';

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
  try {
    const environment = env || determineEnv(chainId);

    const lbtcContract = getLBTCContract({ chainId, rpcUrl, env: environment });

    const rawFeeValue = await lbtcContract.read.getMintFee();
    const lbtcMintFee = fromSatoshi(String(rawFeeValue));
    return lbtcMintFee;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
