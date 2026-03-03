/**
 * Solana Stake Action
 *
 * @module chains/solana/actions/stake
 */

export { createSolanaStake, solanaStake } from './factory';
export { SolanaStake } from './SolanaStake';
export type {
  ISolanaStake,
  SolanaStakeParams,
  SolanaStakePrepareParams,
  SolanaStakeProgress,
} from './types';
