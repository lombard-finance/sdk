/**
 * BTC Destination Configuration for Starknet Withdraw
 *
 * Handles withdrawing LBTC from Starknet to BTC on Bitcoin.
 *
 * @module chains/starknet/actions/withdraw/config/btc
 */

import { Env } from '@lombard.finance/sdk-common';

import { Chain } from '../../../../../core';
import { bitcoinAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * Starknet → BTC configuration
 */
export const starknetToBtcConfig: ChainConfig = {
  chainType: 'starknet',

  routes: [
    {
      sourceChains: [Chain.STARKNET_MAINNET],
      destChain: Chain.BITCOIN_MAINNET,
      envs: [Env.prod],
    },
    {
      sourceChains: [Chain.STARKNET_SEPOLIA],
      destChain: Chain.BITCOIN_SIGNET,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * Check if withdraw to BTC is supported from this Starknet chain
 */
export function isBtcWithdrawSupported(sourceChain: Chain, env: Env): boolean {
  return starknetToBtcConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
