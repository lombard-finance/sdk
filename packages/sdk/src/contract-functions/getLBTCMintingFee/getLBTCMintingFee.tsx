import BigNumber from 'bignumber.js';
import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { determineEnv } from '../../utils/env';
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
export async function getLBTCMintingFee(
  props: CommonParameters,
): Promise<BigNumber> {
  return getMintingFee({ token: Token.LBTC, ...props });
}

/** Gets LBTC burn commission (fee) amount. */
export async function getLBTCBurningFee(props: CommonParameters) {
  return getBurningFee({ token: Token.LBTC, ...props });
}

export async function getMintingFee({
  token,
  chainId,
  rpcUrl,
  env,
}: { token: Token } & CommonParameters) {
  if (![Token.LBTC, Token.BTCK].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const lbtcContract = getTokenContractInfo(token, chainId, environment);

  const rawFeeValue = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'getMintFee',
  });

  return fromSatoshi(String(rawFeeValue));
}

export async function getBurningFee({
  token,
  chainId,
  rpcUrl,
  env,
}: { token: Token } & CommonParameters) {
  if (![Token.LBTC, Token.BTCK].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const lbtcContract = getTokenContractInfo(token, chainId, environment);

  const rawFeeValue = await publicClient.readContract({
    abi: lbtcContract.abi,
    address: lbtcContract.address,
    functionName: 'getBurnCommission',
  });

  return fromSatoshi(String(rawFeeValue));
}
