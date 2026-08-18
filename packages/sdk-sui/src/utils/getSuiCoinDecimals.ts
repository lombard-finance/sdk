/**
 * Coin decimals over gRPC, replacing the JSON-RPC `suix_getCoinMetadata`.
 *
 * @module utils/getSuiCoinDecimals
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { ERROR_COIN_METADATA_NOT_FUND, LBTC_DECIMALS } from '../const';
import { isGrpcNotFoundError } from './isGrpcNotFoundError';

/**
 * Reads a coin's decimals from its on-chain metadata. Returns `undefined` when
 * no metadata is published for the type, which is how the JSON-RPC
 * `getCoinMetadata` answered with `null`; see {@link resolveSuiCoinDecimals}
 * for what standing in for it is allowed. A node failure still throws, so an
 * outage cannot silently degrade a caller into wrong decimals.
 */
export async function getSuiCoinDecimals(
  client: SuiGrpcClient,
  coinType: string,
): Promise<number | undefined> {
  try {
    const { response } = await client.stateService.getCoinInfo({ coinType });

    return response.metadata?.decimals;
  } catch (error) {
    if (isGrpcNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

/**
 * Coin types the {@link LBTC_DECIMALS} fallback may stand in for. Every LBTC
 * deployment is `<package>::lbtc::LBTC`.
 */
const LBTC_TYPE_SUFFIX = '::lbtc::LBTC';

/**
 * Decimals to scale an amount of `coinType` by, falling back to
 * {@link LBTC_DECIMALS} when `CoinMetadata` is missing for an LBTC deployment.
 * LBTC decimals are fixed by the contract, so that one coin is safe to assume;
 * every deployment in the config does publish metadata today, so the fallback
 * only covers one that stops (see the live test).
 *
 * Any other coin fails instead. The caller chooses `coinType`, and assuming
 * eight decimals for a coin that does not have them would put an amount out by
 * a power of ten with nothing on screen to say so.
 */
export async function resolveSuiCoinDecimals(
  client: SuiGrpcClient,
  coinType: string,
): Promise<number> {
  const decimals = await getSuiCoinDecimals(client, coinType);

  if (decimals !== undefined) {
    return decimals;
  }

  if (!coinType.endsWith(LBTC_TYPE_SUFFIX)) {
    throw ERROR_COIN_METADATA_NOT_FUND;
  }

  return LBTC_DECIMALS;
}
