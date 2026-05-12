import BigNumber from 'bignumber.js';
import { getContract } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { fromSatoshi } from '../../utils/satoshi';
import { EARN_VAULT, isEarnChain } from '../../vaults/lib/config';
import { getShareValueInternal } from '../getShareValue/getShareValue';

export interface IGetSharesByAddressParameters extends CommonParameters {
  /** The address of the share holder. */
  address: string;
}

interface IGetSharesByAddressResponse {
  /** The amount of share owned. */
  balance: BigNumber;
  /** The value of a single share unit */
  exchangeRate: BigNumber;
  /** The balance represented in BTC. */
  balanceLbtc: BigNumber;
}

/**
 * @internal Internal helper used by `getEarnPosition` and other internal
 * vault-reading paths. The public `getSharesByAddress` function was removed
 * in 5.0.0; consumers use `getEarnPosition` instead.
 *
 * @return {Promise<IGetSharesByAddressResponse>}
 */
export async function getSharesByAddressInternal({
  chainId,
  rpcUrl,
  address,
}: IGetSharesByAddressParameters): Promise<IGetSharesByAddressResponse> {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  try {
    const client = makePublicClient({ chainId, rpcUrl });

    const lensContract = getContract({
      abi: vault.lensContract.abi,
      address: vault.lensContract.address,
      client,
    });

    const balanceValue = await lensContract.read.balanceOf([
      address,
      vault.vaultContract.address,
    ]);

    const balance = fromSatoshi(String(balanceValue));

    const exchangeRate = await getShareValueInternal({
      chainId,
      rpcUrl,
    });

    return {
      balance,
      exchangeRate,
      balanceLbtc: balance.multipliedBy(exchangeRate),
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
