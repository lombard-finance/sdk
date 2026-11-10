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
 * - Bitcoin Earn: Ethereum, Base, BSC (prod only)
 *
 * Every route here is one `EvmDeploy` can deposit, because the action refuses
 * anything this table does not list. Silo is not one: its deposits go
 * through stake and bake, and this class approves and deposits into the Earn
 * vault, which has no deployment on Avalanche.
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

  routes: [
    // Bitcoin Earn - Ethereum
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.ETHEREUM],
      protocols: [DeployProtocol.BitcoinEarn],
      envs: [Env.prod],
    },
    // Bitcoin Earn - Base
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.BASE],
      protocols: [DeployProtocol.BitcoinEarn],
      envs: [Env.prod],
    },
    // Bitcoin Earn - BSC
    {
      asset: AssetId.LBTC,
      sourceChains: [Chain.BSC],
      protocols: [DeployProtocol.BitcoinEarn],
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
    (route) =>
      route.asset === asset &&
      route.sourceChains.includes(chain) &&
      route.protocols.includes(protocol) &&
      route.envs.includes(env),
  );
}
