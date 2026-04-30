/**
 * BTC Destination Configuration for Sui Unstake
 *
 * Handles unstaking LBTC from Sui to BTC on Bitcoin.
 *
 * @module chains/sui/actions/unstake/config/btc
 */

import { Env } from '@lombard.finance/sdk-common';

import { Chain } from '../../../../../core';
import { bitcoinAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * Sui → BTC configuration
 */
export const suiToBtcConfig: ChainConfig = {
  chainType: 'sui',

  routes: [
    {
      sourceChains: [Chain.SUI_MAINNET],
      destChain: Chain.BITCOIN_MAINNET,
      envs: [Env.prod] },
    {
      sourceChains: [Chain.SUI_TESTNET],
      destChain: Chain.BITCOIN_SIGNET,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc] },
  ],

  recipientSchema: bitcoinAddressSchema };

/**
 * Check if unstake to BTC is supported from this Sui chain
 */
export function isBtcUnstakeSupported(sourceChain: Chain, env: Env): boolean {
  return suiToBtcConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
