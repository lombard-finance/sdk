/**
 * Solana Withdraw Chain Configuration Registry
 *
 * @module chains/solana/actions/withdraw-lbtc/config
 */

export {
  isWithdrawSupported,
  solanaToBtcbConfig,
  solanaToBtcConfig,
} from './btc';
export type { ChainConfig, RouteDefinition } from './types';
