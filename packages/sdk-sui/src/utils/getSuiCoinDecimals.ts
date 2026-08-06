/**
 * Coin decimals over gRPC, replacing the JSON-RPC `suix_getCoinMetadata`.
 *
 * @module utils/getSuiCoinDecimals
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { isGrpcNotFoundError } from './isGrpcNotFoundError';

/**
 * Reads a coin's decimals from its on-chain metadata. Returns `undefined` when
 * the metadata is not published (e.g. testnet deployments), which is how the
 * JSON-RPC `getCoinMetadata` answered with `null`; the caller picks the
 * fallback. A node failure still throws, so an outage cannot silently degrade
 * a caller into wrong decimals.
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
