/**
 * Solana Stake Action
 *
 * @module chains/solana/actions/deposit-btcb
 */

export { createSolanaStake } from './factory';
export { SolanaDepositBtcb } from './SolanaDepositBtcb';
export type {
  ISolanaDepositBtcb,
  SolanaDepositBtcbParams,
  SolanaDepositBtcbPrepareParams,
  SolanaDepositBtcbProgress,
} from './types';
