/**
 * Solana shared utilities
 *
 * @module chains/solana/utils
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { SolanaChain } from '../../common/chains';
import {
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
} from '../../common/chains';

/**
 * Map a Lombard environment to the Solana network string expected by
 * sdk-solana functions (e.g. SolanaNetwork enum values).
 *
 * NOTE: SolanaUnstake.ts contains an identical copy pending a follow-up
 * cleanup PR (unstake was not part of this branch).
 */
export function envToSolanaNetwork(env: Env): string {
  switch (env) {
    case 'prod':
      return 'mainnet-beta';
    case 'testnet':
    case 'stage':
    case 'dev':
    case 'ibc':
    default:
      return 'devnet';
  }
}

export function envToSolanaChain(env: Env): SolanaChain {
  switch (env) {
    case 'prod':
      return SOLANA_MAINNET_CHAIN;
    case 'testnet':
    case 'stage':
    case 'dev':
    case 'ibc':
    default:
      return SOLANA_DEVNET_CHAIN;
  }
}
