import BigNumber from 'bignumber.js';
import { getContract } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { fromSatoshi } from '../../utils/satoshi';
import {
  EARN_VAULT, isEarnChain } from '../../vaults/lib/config';

export type IGetShareValueParameters = CommonParameters;

/**
 * @internal Internal helper used by `getEarnPosition` and `getSharesByAddressInternal`.
 * The public `getShareValue` function was removed in 5.0.0; the exchange rate
 * is included in the response from `getEarnPosition`.
 *
 * @returns {Promise<BigNumber>}
 */
export async function getShareValueInternal({
  chainId,
  rpcUrl }: IGetShareValueParameters): Promise<BigNumber> {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  try {
    const client = makePublicClient({ chainId, rpcUrl });

    const accountantContract = getContract({
      abi: vault.accountantContract.abi,
      address: vault.accountantContract.address,
      client });

    const exchangeRate = await accountantContract.read.getRate();
    return fromSatoshi(String(exchangeRate));
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    throw new Error(errorMessage);
  }
}
