/**
 * EVM Chain Configuration for Withdraw
 *
 * Handles withdrawing vault shares from DeFi protocols.
 *
 * @module chains/evm/actions/withdraw-vault/config/evm
 */

import { Env } from '@lombard.finance/sdk-common';

import { Chain, DeployProtocol } from '../../../../../core';
import { evmAddressSchema } from '../../../../../shared/validation';
import type { WithdrawChainConfig } from './types';

/**
 * EVM withdraw configuration
 *
 * Withdraw support mirrors deploy support:
 * - Veda: Ethereum, Base, BSC (prod only)
 */
export const evmWithdrawConfig: WithdrawChainConfig = {
  chainType: 'evm',

  routes: [
    // Veda - Ethereum, Base, BSC
    {
      sourceChains: [Chain.ETHEREUM, Chain.BASE, Chain.BSC],
      protocols: [DeployProtocol.Veda],
      envs: [Env.prod],
    },
  ],

  addressSchema: evmAddressSchema,
};

/**
 * Check if a withdraw route is supported
 */
export function isWithdrawSupported(
  chain: Chain,
  protocol: DeployProtocol,
  env: Env,
): boolean {
  return evmWithdrawConfig.routes.some(
    (route) =>
      route.sourceChains.includes(chain) &&
      route.protocols.includes(protocol) &&
      route.envs.includes(env),
  );
}
