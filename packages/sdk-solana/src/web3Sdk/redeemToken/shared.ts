import { Program } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';
import { Connection, PublicKey } from '@solana/web3.js';

import { IConfig } from '../../const/getConfig';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';

// ── Types ──

export interface RedeemForBtcParams {
  amount: string;
  btcAddress: string;
  /**
   * SPL token mint to redeem. Must equal the environment’s configured LBTC or
   * BTC.b mint; any other value fails before building a redemption transaction.
   */
  tokenMint: string;
  network: SolanaNetwork;
  /**
   * Optional environment override. When provided, used instead of
   * the default `networkToEnv[network]` mapping to resolve config.
   * Useful when multiple environments share the same Solana network
   * (e.g. both 'dev' and 'stage' use devnet).
   */
  env?: Env;
  rpcUrl?: string;
  debug?: boolean;
  /**
   * Skip preflight transaction simulation before broadcast.
   *
   * Defaults to `false` (simulation enabled). Set to `true` if preflight
   * simulation gives false negatives — for example, when the simulation node
   * has not yet seen the latest global nonce for the `outbound_message` PDA,
   * leading to a spurious `ConstraintSeeds (0x7d6)` failure even though the
   * transaction would land correctly on-chain.
   */
  skipPreflight?: boolean;
}

export type DebugLog = (...args: unknown[]) => void;

/**
 * Common context shared between BTC.b and LBTC redemption flows.
 */
export interface RedeemContext {
  provider: ISolanaWalletProvider;
  params: RedeemForBtcParams;
  env: Env;
  config: IConfig;
  connection: Connection;
  payer: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
  scriptPubKey: Buffer;
  assetRouterProgramId: PublicKey;
  mailboxProgramId: PublicKey;
  solanaRoutingChainId: Buffer;
  bitcoinRoutingChainId: Buffer;
  assetRouterProgram: Program;
  assetRouterConfigPDA: PublicKey;
  mailboxConfigPDA: PublicKey;
  arTreasury: PublicKey;
  mailboxTreasury: PublicKey;
  debugLog: DebugLog;
}

// ── Constants ──

/**
 * BTC native token address in Lombard protocol (to_token_address for BTC in token_route PDA).
 * BTC is represented as 0x...01 (32 bytes, value 1).
 */
export const BTC_NATIVE_TOKEN_ADDRESS = (() => {
  const buf = Buffer.alloc(32, 0);
  buf[31] = 1;
  return buf;
})();

// ── Helpers ──

export function validateAmount(amount: string): void {
  const U64_MAX = 18446744073709551615n;
  if (!/^\d+$/.test(amount)) {
    throw new Error(
      `Invalid amount "${amount}": must be a positive integer string (lamports, no decimals or signs)`,
    );
  }
  const parsedAmount = BigInt(amount);
  if (parsedAmount === 0n) {
    throw new Error('Amount must be greater than zero');
  }
  if (parsedAmount > U64_MAX) {
    throw new Error(
      `Amount ${amount} exceeds the u64 maximum (${U64_MAX})`,
    );
  }
}
