/**
 * BTC StakeAndDeploy Chain Configuration Registry
 *
 * BTC StakeAndDeploy: BTC → LBTC → DeFi vault
 * Uses DEFI_REGISTRY as the single source of truth for protocol validation.
 *
 * @module chains/btc/actions/stakeAndDeploy/config
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain } from '../../../../../core';
import { DEFI_REGISTRY, DefiProtocol } from '../../../../../defi';
import { Token } from '../../../../../tokens/token-addresses';
import { evmStakeAndDeployConfig } from './evm';

export type {
  StakeAndBakeAuthResult,
  StakeAndDeployChainConfig,
  StakeAndDeployRouteDefinition,
} from './types';

/**
 * Config (currently EVM only)
 */
export const stakeAndDeployConfig = evmStakeAndDeployConfig;

/**
 * Check if destination chain is supported
 */
export function isDestChainSupported(chain: Chain): boolean {
  return stakeAndDeployConfig.destChains.includes(chain);
}

/**
 * Check if assetOut is supported
 * StakeAndDeploy should only produce LBTC
 */
export function isAssetOutSupported(assetOut: AssetId): boolean {
  return stakeAndDeployConfig.supportedAssetsOut.includes(assetOut);
}

/**
 * Check if route is available
 */
export function isRouteAvailable(
  sourceChain: Chain | undefined,
  env: Env,
): boolean {
  if (!sourceChain) return true;
  return stakeAndDeployConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}

/**
 * Check if protocol is supported for stake and deploy
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
 * Get list of supported protocols for StakeAndDeploy
 * This returns protocols that support LBTC or BTC (for StakeAndDeploy from BTC)
 *
 * TODO: Update this to match against asset and chain
 */
export function getSupportedProtocols(assetId: AssetId): DefiProtocol[] {
  return Object.entries(DEFI_REGISTRY)
    .filter(([_, tokenMap]) => assetId in tokenMap)
    .map(([protocol]) => protocol as DefiProtocol);
}

/**
 * Check if a protocol supports a specific chain for stake and deploy
 */
export function isProtocolChainSupported(
  protocol: string,
  chainId: number,
  env: Env,
): boolean {
  const protocolRegistry = DEFI_REGISTRY[protocol as DefiProtocol];
  if (!protocolRegistry) return false;

  // Check LBTC token first, then BTC
  const lbtcRegistry =
    protocolRegistry[Token.LBTC as keyof typeof protocolRegistry];
  const btcRegistry = protocolRegistry['BTC' as keyof typeof protocolRegistry];

  const tokenRegistry = lbtcRegistry || btcRegistry;
  if (!tokenRegistry) return false;

  const envRegistry = tokenRegistry[env];
  if (!envRegistry) return false;

  return chainId in envRegistry;
}
