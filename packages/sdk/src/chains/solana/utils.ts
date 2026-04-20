/**
 * Solana shared utilities
 *
 * @module chains/solana/utils
 */

import type { Env } from '@lombard.finance/sdk-common';

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
      return 'testnet';
    case 'stage':
    case 'dev':
    case 'ibc':
    default:
      return 'devnet';
  }
}
