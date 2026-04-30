import BigNumber from 'bignumber.js';
import { Address, getContract, isAddress } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { fromSatoshi } from '../../utils/satoshi';
import {
  BTCE_VAULT,
  BtceVaultChain,
  isBtceVaultChain,
} from '../../vaults/lib/config';
import { getSharesByAddress } from '../getSharesByAddress/getSharesByAddress';

export interface IGetEarnPositionParameters extends CommonParameters {
  /**
   * The address of the position holder.
   */
  address: string;
}

export interface IGetEarnPositionResponse {
  /** Direct underlying-share balance held at the address. */
  underlyingShares: BigNumber;
  /** Raw BTCe wrapper shares held at the address. */
  btceShares: BigNumber;
  /** BTCe shares converted to underlying-share equivalent via the wrapper's convertToAssets. */
  btceSharesInUnderlying: BigNumber;
  /** underlyingShares + btceSharesInUnderlying (both in underlying-share units). */
  totalShares: BigNumber;
  /** Current underlying-share value, in LBTC, from the Veda accountant. */
  exchangeRate: BigNumber;
  /** totalShares * exchangeRate, expressed in LBTC. */
  position: BigNumber;
  /**
   * @deprecated Renamed to `underlyingShares` in 4.8.0; will be removed in 5.0.0.
   */
  lbtcvShares: BigNumber;
  /**
   * @deprecated Renamed to `btceSharesInUnderlying` in 4.8.0; will be removed in 5.0.0.
   */
  btceSharesInLbtcv: BigNumber;
}

const ZERO = new BigNumber(0);

/**
 * Gets the user's full Bitcoin Earn position (direct underlying shares + BTCe)
 * on a single chain, valued in LBTC.
 *
 * BTCe is an ERC4626 wrapper around the Veda vault's underlying share token.
 * The function reads both balances, converts BTCe shares to underlying-share
 * equivalent via the wrapper's `convertToAssets`, sums the two values in
 * underlying-share units, and applies the Veda accountant's share value to
 * express the total in LBTC.
 *
 * Conversion through `convertToAssets` is mandatory rather than naive 1:1
 * summation: the wrapper is a 1:1 pass-through today, but ERC4626 vaults can
 * accrue fees or rebases that move the share-to-asset ratio over time.
 *
 * On chains where BTCe is not deployed (e.g. Corn) the BTCe leg is skipped
 * and the result reports zero BTCe shares with a position equal to the
 * underlying-share leg alone.
 *
 * Errors from either leg propagate to the caller, since silently returning
 * zero would understate the user's balance and is unsafe for an SDK consumed
 * by partner integrators quoting balances to end users.
 *
 * @param {IGetEarnPositionParameters} parameters - The parameters.
 * @param {string} parameters.address - The address of the position holder.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @return {Promise<IGetEarnPositionResponse>}
 */
export async function getEarnPosition({
  chainId,
  rpcUrl,
  address,
}: IGetEarnPositionParameters): Promise<IGetEarnPositionResponse> {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  const btceSupported = isBtceVaultChain(chainId);

  const [sharesResult, btceBalanceRaw] = await Promise.all([
    getSharesByAddress({ chainId, rpcUrl, address }),
    btceSupported
      ? readBtceBalance({ chainId, rpcUrl, address })
      : Promise.resolve(0n),
  ]);

  let btceShares = ZERO;
  let btceSharesInUnderlying = ZERO;

  if (btceSupported && btceBalanceRaw > 0n) {
    btceShares = fromSatoshi(String(btceBalanceRaw));
    const underlyingEquivalentRaw = await readBtceConvertToAssets({
      chainId,
      rpcUrl,
      shares: btceBalanceRaw,
    });
    btceSharesInUnderlying = fromSatoshi(String(underlyingEquivalentRaw));
  }

  const underlyingShares = sharesResult.balance;
  const exchangeRate = sharesResult.exchangeRate;
  const totalShares = underlyingShares.plus(btceSharesInUnderlying);
  const position = totalShares.multipliedBy(exchangeRate);

  return {
    underlyingShares,
    btceShares,
    btceSharesInUnderlying,
    totalShares,
    exchangeRate,
    position,
    // Deprecated aliases retained for 4.x backward compatibility; removed in 5.0.0.
    lbtcvShares: underlyingShares,
    btceSharesInLbtcv: btceSharesInUnderlying,
  };
}

async function readBtceBalance({
  chainId,
  rpcUrl,
  address,
}: {
  chainId: BtceVaultChain;
  rpcUrl?: string;
  address: Address;
}): Promise<bigint> {
  const client = makePublicClient({ chainId, rpcUrl });
  const btceContract = getContract({
    abi: BTCE_VAULT.abi,
    address: BTCE_VAULT.contracts[chainId],
    client,
  });
  return (await btceContract.read.balanceOf([address])) as bigint;
}

async function readBtceConvertToAssets({
  chainId,
  rpcUrl,
  shares,
}: {
  chainId: BtceVaultChain;
  rpcUrl?: string;
  shares: bigint;
}): Promise<bigint> {
  const client = makePublicClient({ chainId, rpcUrl });
  const btceContract = getContract({
    abi: BTCE_VAULT.abi,
    address: BTCE_VAULT.contracts[chainId],
    client,
  });
  return (await btceContract.read.convertToAssets([shares])) as bigint;
}
