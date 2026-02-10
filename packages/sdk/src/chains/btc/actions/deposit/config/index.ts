/**
 * BTC Deposit Chain Configuration Registry
 *
 * BTC Deposit: BTC → BTC.b (wrapped BTC without yield)
 *
 * @module chains/btc/actions/deposit/config
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain } from '../../../../../core';
import { evmDepositConfig } from './evm';

export type {
  DepositChainConfig,
  DepositFeeAuthConfig,
  DepositRouteDefinition,
  FeeAuthResult,
  SignatureResult,
  StoredFeeSignature,
} from './types';

/**
 * All deposit configs (currently only EVM)
 */
export const depositConfig = evmDepositConfig;

/**
 * Check if destination chain is supported
 */
export function isDestChainSupported(chain: Chain): boolean {
  return depositConfig.destChains.includes(chain);
}

/**
 * Check if assetOut is supported for BTC Deposit
 * BTC Deposit should only produce BTC.b
 */
export function isAssetOutSupported(assetOut: AssetId): boolean {
  return depositConfig.supportedAssetsOut.includes(assetOut);
}

/**
 * Check if route is available for given source chain and environment
 */
export function isRouteAvailable(
  sourceChain: Chain | undefined,
  env: Env,
): boolean {
  if (!sourceChain) return true;
  return depositConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
