import { CommonParameters } from '../../common/parameters';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { getLBTCContract } from '../../tokens/lbtc-contract';
import { getErrorMessage } from '../../utils/err';
import BigNumber from 'bignumber.js';
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
  env = DEFAULT_ENV,
}: CommonParameters): Promise<BigNumber> {
  try {
    const lbtcContract = getLBTCContract({ chainId, rpcUrl, env });
    const totalSupply = await lbtcContract.read.totalSupply();
    return fromSatoshi(String(totalSupply));
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
