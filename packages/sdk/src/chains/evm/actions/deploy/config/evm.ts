/**
 * EVM Chain Configuration for Deploy
 *
 * Handles deploying L-Assets to DeFi protocols.
 *
 * @module chains/evm/actions/deploy/config/evm
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain, DeployProtocol } from '../../../../../core';
import { evmAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * EVM deploy configuration
 *
 * Protocol availability:
 * - Veda: Ethereum, Base, BSC, Corn (prod only)
 * - Silo: Avalanche (prod only)
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

  routes: [
    // Veda - Ethereum
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.ETHEREUM],
      protocols: [DeployProtocol.Veda],
      envs: [Env.prod],
    },
    // Veda - Base
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.BASE],
      protocols: [DeployProtocol.Veda],
      envs: [Env.prod],
    },
    // Veda - BSC
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.BSC],
      protocols: [DeployProtocol.Veda],
      envs: [Env.prod],
    },
    // Veda - Corn
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.CORN],
      protocols: [DeployProtocol.Veda],
      envs: [Env.prod],
    },
    // Silo - Avalanche
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.AVALANCHE],
      protocols: [DeployProtocol.Silo],
      envs: [Env.prod],
    },
  ],

  addressSchema: evmAddressSchema,
};

/**
 * Check if a deploy route is supported
 */
export function isDeploySupported(
  asset: AssetId,
  chain: Chain,
  protocol: DeployProtocol,
  env: Env,
): boolean {
  return evmConfig.routes.some(
    route =>
      route.asset === asset &&
      route.sourceChains.includes(chain) &&
      route.protocols.includes(protocol) &&
      route.envs.includes(env),
  );
}
