/**
 * BTC DepositAndDeploy Configuration
 *
 * Exports configuration for BTC → BTC.b → Vault operations.
 * Uses DEFI_REGISTRY as the single source of truth for protocol validation.
 *
 * @module chains/btc/actions/depositAndDeploy/config
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain } from '../../../../../core';
import { DEFI_REGISTRY,DefiProtocol } from '../../../../../defi';
import { evmDepositAndDeployConfig } from './evm';
import type { DepositAndDeployChainConfig } from './types';

export type {
  DepositAndDeployAuthResult,
  DepositAndDeployChainConfig,
  DepositAndDeployRouteDefinition } from './types';

/**
 * The default config for DepositAndDeploy
 * Currently only EVM (Avalanche + Silo) is supported
 */
export const depositAndDeployConfig: DepositAndDeployChainConfig =
  evmDepositAndDeployConfig;

/**
 * Check if a destination chain is supported for deposit and deploy
 */
export function isDestChainSupported(destChain: Chain): boolean {
  return depositAndDeployConfig.destChains.includes(destChain);
}

/**
 * Check if assetOut is supported for DepositAndDeploy
 * DepositAndDeploy should only produce BTC.b
 */
export function isAssetOutSupported(assetOut: AssetId): boolean {
  return depositAndDeployConfig.supportedAssetsOut.includes(assetOut);
}

/**
 * Check if a protocol is supported for deposit and deploy
 * Uses DEFI_REGISTRY as the single source of truth
 */
export function isProtocolSupported(protocol: string): boolean {
  // Check if protocol exists in DEFI_REGISTRY
  return protocol in DEFI_REGISTRY;
}

/**
 * Get the vault key for a protocol
 * Returns the protocol key if valid, throws if not supported
 *
 * @param protocol - Protocol identifier from DefiProtocol
 * @returns The vault key for API calls
 * @throws If protocol is not in DEFI_REGISTRY
 */
export function getVaultKey(protocol: string): string {
  if (!isProtocolSupported(protocol)) {
    const supportedProtocols = Object.keys(DEFI_REGISTRY).join(', ');
    throw new Error(
      `Unsupported protocol: ${protocol}. ` +
        `Supported protocols: ${supportedProtocols}`,
    );
  }
  // Protocol keys in DEFI_REGISTRY match DefiProtocol values
  return protocol;
}

/**
 * Get list of supported protocols for DepositAndDeploy
 * This returns protocols that support BTC.b (for DepositAndDeploy)
 */
export function getSupportedProtocols(assetId: AssetId): DefiProtocol[] {
  return Object.entries(DEFI_REGISTRY)
    .filter(([_, tokenMap]) => assetId in tokenMap)
    .map(([protocol]) => protocol as DefiProtocol);
}
/**
 * Check if a route is available for a given source chain and environment
 */
export function isRouteAvailable(sourceChain: Chain, env: Env): boolean {
  return depositAndDeployConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}

/**
 * Check if a protocol supports a specific chain for deposit and deploy
 */
export function isProtocolChainSupported(
  protocol: string,
  chainId: number,
  env: Env,
): boolean {
  const protocolRegistry = DEFI_REGISTRY[protocol as DefiProtocol];
  if (!protocolRegistry) return false;

  // Check BTCb token (used by DepositAndDeploy)
  const btcbRegistry =
    protocolRegistry['BTCb' as keyof typeof protocolRegistry];
  if (!btcbRegistry) return false;

  const envRegistry = btcbRegistry[env];
  if (!envRegistry) return false;

  return chainId in envRegistry;
}
