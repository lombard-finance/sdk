/**
 * EVM Chain Configuration for Stake
 *
 * Handles staking LBTC to DeFi protocols on EVM chains.
 *
 * Protocol availability:
 * - Bitcoin Earn: Ethereum, Base, BSC (prod only)
 * - Silo: Avalanche (prod only)
 *
 * @module chains/evm/actions/deposit-btcb/config/evm
 */

import { Env } from '@lombard.finance/sdk-common';

import { Chain, DeployProtocol } from '../../../../../core';
import { evmAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * EVM chain configuration for stake operations
 *
 * Supports staking LBTC to Bitcoin Earn and Silo protocols.
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

  routes: [
    // Bitcoin Earn - Ethereum
    {
      sourceChains: [Chain.ETHEREUM],
      destChains: [Chain.ETHEREUM],
      protocols: [DeployProtocol.BitcoinEarn],
      envs: [Env.prod],
    },
    // Bitcoin Earn - Base
    {
      sourceChains: [Chain.BASE],
      destChains: [Chain.BASE],
      protocols: [DeployProtocol.BitcoinEarn],
      envs: [Env.prod],
    },
    // Bitcoin Earn - BSC
    {
      sourceChains: [Chain.BSC],
      destChains: [Chain.BSC],
      protocols: [DeployProtocol.BitcoinEarn],
      envs: [Env.prod],
    },
    // Silo - Avalanche
    {
      sourceChains: [Chain.AVALANCHE],
      destChains: [Chain.AVALANCHE],
      protocols: [DeployProtocol.Silo],
      envs: [Env.prod],
    },
  ],

  addressSchema: evmAddressSchema,
};

/**
 * Check if a source chain is supported for stake
 */
export function isSourceChainSupported(chain: Chain, env: Env): boolean {
  return evmConfig.routes.some(
    (route) => route.sourceChains.includes(chain) && route.envs.includes(env),
  );
}

/**
 * Check if a protocol is supported for a given chain
 */
export function isProtocolSupported(
  chain: Chain,
  protocol: DeployProtocol,
  env: Env,
): boolean {
  return evmConfig.routes.some(
    (route) =>
      route.sourceChains.includes(chain) &&
      route.protocols.includes(protocol) &&
      route.envs.includes(env),
  );
}
