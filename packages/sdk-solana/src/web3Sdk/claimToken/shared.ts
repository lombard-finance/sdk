import { BN, Program } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { keccak256 } from 'js-sha3';
import { sha256 } from 'js-sha256';

import { IConfig } from '../../const/getConfig';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import { sendAndConfirmTransaction } from '../../utils';
import { parseSignaturesFromProof } from './utils/signatureUtils';

// ── PDA seeds ──

export const CONSORTIUM_SESSION_SEED = Buffer.from('session');
export const CONSORTIUM_CONFIG_SEED = Buffer.from('consortium_config');

// ── Payload selectors (first 4 bytes) ──

export const DEPOSIT_SELECTOR_V1 = Buffer.from([0xce, 0x25, 0xe7, 0xc2]);
export const GMP_MESSAGE_V1_SELECTOR = Buffer.from([0xe2, 0x88, 0xfb, 0x4a]);

// ── Types ──

export interface ClaimTokenParams {
  recipientAddress: string;
  /**
   * SPL token mint address (BTC.b or LBTC).
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
  /**
   * Raw payload hex string. Length depends on token type:
   * - BTC.B deposit: 196 bytes (selector ce25e7c2)
   * - LBTC GMP message: variable length (selector e288fb4a)
   */
  rawPayload: string;
  /**
   * Proof signature from the backend (hex-encoded, ABI-packed signatures).
   */
  proofSignature: string;
  /**
   * Bascule program address override. If not provided, read from on-chain config.
   */
  basculeProgram?: string;
  rpcUrl?: string;
  debug?: boolean;
  /**
   * Skip preflight transaction simulation before broadcast.
   *
   * Defaults to `false` (simulation enabled). Set to `true` if you encounter
   * false-negative preflight failures on devnet/testnet RPC nodes that lag
   * behind the confirmed state — for example, when a simulation node has not
   * yet observed a PDA created by the immediately preceding step in the same
   * multi-step flow (session, validated_payload, session_payload, message_info).
   *
   * On-chain errors are still surfaced through `confirmTransaction` regardless
   * of this flag.
   */
  skipPreflight?: boolean;
}

export interface AssetRouterConfig {
  paused: boolean;
  nativeMint: PublicKey;
  basculeProgramId: PublicKey | null;
  basculeGmpProgramId: PublicKey | null;
  ledgerChainId: Uint8Array;
}

export type DebugLog = (...args: unknown[]) => void;

/**
 * Common context shared between BTC.B and LBTC GMP flows.
 */
export interface ClaimContext {
  provider: ISolanaWalletProvider;
  params: ClaimTokenParams;
  env: Env;
  config: IConfig;
  connection: Connection;
  payloadBytes: Buffer;
  payloadHash: Buffer;
  payloadHashArray: number[];
  payer: PublicKey;
  assetRouterProgramId: PublicKey;
  consortiumProgramId: PublicKey;
  assetRouterProgram: Program;
  consortiumProgram: Program;
  consortiumConfigPDA: PublicKey;
  sessionPDA: PublicKey;
  validatedPayloadPDA: PublicKey;
  assetRouterConfigPDA: PublicKey;
  tokenAuthorityPDA: PublicKey;
  arConfig: AssetRouterConfig;
  debugLog: DebugLog;
}

// ── Consortium PDA helpers ──

export function getConsortiumConfigPDA(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [CONSORTIUM_CONFIG_SEED],
    programId,
  )[0];
}

/**
 * Derive the session PDA using the new seeds that include the ValSet epoch.
 * Seeds: ["session", epoch (8 bytes BE), payer, payloadHash]
 */
export function getConsortiumSessionPDA(
  programId: PublicKey,
  payer: PublicKey,
  payloadHash: Buffer,
  epoch: BN,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      CONSORTIUM_SESSION_SEED,
      epoch.toBuffer('be', 8),
      payer.toBytes(),
      payloadHash,
    ],
    programId,
  )[0];
}

/**
 * Fetch the current epoch from the on-chain consortium config account
 * using Anchor IDL-based deserialization.
 */
export async function fetchCurrentEpoch(
  consortiumProgram: Program,
  consortiumConfigPDA: PublicKey,
): Promise<BN> {
  // Anchor converts all IDL names to camelCase before building the namespace
  // and decoding accounts, so field access uses camelCase keys.
  const accountNs = consortiumProgram.account as unknown as Record<
    string,
    { fetch: (address: PublicKey) => Promise<unknown> }
  >;
  const raw = (await accountNs.config.fetch(consortiumConfigPDA)) as {
    currentEpoch: BN;
  };
  return raw.currentEpoch;
}

// ── fetchAssetRouterConfig ──

/**
 * Fetch and deserialize Asset Router `Config` account via Anchor IDL.
 *
 * IDL layout (fields used by SDK):
 *   paused:             bool
 *   native_mint:        pubkey
 *   bascule:            Option<pubkey>  (classic bascule for BTC.B)
 *   bascule_gmp:        Option<pubkey>  (bascule for LBTC GMP)
 *   ledger_lchain_id:   [u8; 32]
 */
export async function fetchAssetRouterConfig(
  assetRouterProgram: Program,
  configPDA: PublicKey,
): Promise<AssetRouterConfig> {
  // Anchor camelCases IDL names, so `native_mint` → `nativeMint`,
  // `bascule_gmp` → `basculeGmp`, `ledger_lchain_id` → `ledgerLchainId`.
  const accountNs = assetRouterProgram.account as unknown as Record<
    string,
    { fetch: (address: PublicKey) => Promise<unknown> }
  >;
  const raw = (await accountNs.config.fetch(configPDA)) as {
    paused: boolean;
    nativeMint: PublicKey;
    bascule: PublicKey | null;
    basculeGmp: PublicKey | null;
    ledgerLchainId: number[];
  };

  return {
    paused: raw.paused,
    nativeMint: raw.nativeMint,
    basculeProgramId: raw.bascule ?? null,
    basculeGmpProgramId: raw.basculeGmp ?? null,
    ledgerChainId: new Uint8Array(raw.ledgerLchainId),
  };
}

// ── Consortium session ──

/**
 * Execute the consortium session flow: create_session, post_signatures, finalize_session.
 * Skips steps that are already completed on-chain.
 */
export async function executeConsortiumSession(
  ctx: ClaimContext,
): Promise<void> {
  const {
    provider,
    connection,
    consortiumProgram,
    consortiumConfigPDA,
    sessionPDA,
    validatedPayloadPDA,
    payloadHashArray,
    params,
    debugLog,
  } = ctx;

  const validatedPayloadAccount =
    await connection.getAccountInfo(validatedPayloadPDA);
  const sessionAccount = await connection.getAccountInfo(sessionPDA);

  debugLog('Session PDA:', sessionPDA.toBase58(), 'exists:', !!sessionAccount);
  debugLog(
    'ValidatedPayload PDA:',
    validatedPayloadPDA.toBase58(),
    'exists:',
    !!validatedPayloadAccount,
  );

  if (validatedPayloadAccount) {
    debugLog('ValidatedPayload exists — skipping all consortium steps');
    return;
  }

  // Step 1: create_session
  if (!sessionAccount) {
    debugLog('Step 1: create_session...');
    const createSessionTx = await consortiumProgram.methods
      .createSession(payloadHashArray)
      .accounts({
        payer: provider.publicKey,
        config: consortiumConfigPDA,
        session: sessionPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: createSessionTx,
      connection,
      provider,
      debugLabel: 'Consortium create_session',
      skipPreflight: params.skipPreflight ?? true,
    });
    debugLog('create_session completed');
  } else {
    debugLog('Session already exists, skipping create_session');
  }

  // Step 2: post_session_signatures.
  // Session raw layout: discriminator(8) | signed: Vec<bool> (4 LE len + N bytes) | weight: u64 LE | trailing bytes.
  // Manual parse: Anchor coder rejects extra trailing bytes that exist in the on-chain account.
  let sessionSigned = false;
  const freshSessionAccount = sessionAccount
    ? sessionAccount
    : await connection.getAccountInfo(sessionPDA);
  if (freshSessionAccount) {
    try {
      const data = freshSessionAccount.data;
      if (data.length < 20) {
        throw new Error(`session account too short: ${data.length}`);
      }
      const signedLen = data.readUInt32LE(8);
      const weightOffset = 12 + signedLen;
      if (data.length < weightOffset + 8) {
        throw new Error(
          `session data truncated: need ${weightOffset + 8}, got ${data.length}`,
        );
      }
      const weight = data.readBigUInt64LE(weightOffset);
      let signedCount = 0;
      for (let i = 0; i < signedLen; i++) {
        if (data[12 + i] !== 0) signedCount += 1;
      }
      sessionSigned = weight > 0n;
      debugLog(
        'Session weight:',
        weight.toString(),
        'signed count:',
        signedCount,
        'of',
        signedLen,
      );
    } catch (err) {
      debugLog(
        'Failed to parse session for signature check:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  if (!sessionSigned) {
    debugLog('Step 2: post_session_signatures...');
    const { signatures: parsedSigs, indices } = parseSignaturesFromProof(
      params.proofSignature,
    );

    if (parsedSigs.length === 0 || indices.length === 0) {
      throw new Error('No valid signatures found in the proof');
    }

    const signatures = parsedSigs.map((sig) => Array.from(sig));

    const postSigsTx = await consortiumProgram.methods
      .postSessionSignatures(payloadHashArray, signatures, indices)
      .accounts({
        payer: provider.publicKey,
        config: consortiumConfigPDA,
        session: sessionPDA,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: postSigsTx,
      connection,
      provider,
      debugLabel: 'Consortium post_session_signatures',
      skipPreflight: params.skipPreflight ?? true,
    });
    debugLog('post_session_signatures completed');
  } else {
    debugLog('Signatures already posted (weight > 0), skipping step 2');
  }

  // Step 3: finalize_session
  debugLog('Step 3: finalize_session...');
  const finalizeSessionTx = await consortiumProgram.methods
    .finalizeSession(payloadHashArray)
    .accounts({
      payer: provider.publicKey,
      config: consortiumConfigPDA,
      session: sessionPDA,
      validatedPayload: validatedPayloadPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  await sendAndConfirmTransaction({
    instruction: finalizeSessionTx,
    connection,
    provider,
    debugLabel: 'Consortium finalize_session',
    skipPreflight: params.skipPreflight ?? true,
  });
  debugLog('finalize_session completed — ValidatedPayload created');
}

// ── Helpers ──

export function computePayloadHash(payloadBytes: Buffer): Buffer {
  return Buffer.from(sha256(payloadBytes as unknown as Uint8Array), 'hex');
}

/**
 * BTC.B deposit payload embeds the SPL associated token account at bytes 36–68
 * (not the wallet owner). On-chain `mint_from_payload` requires that account
 * pubkey to match the payload exactly.
 *
 * @returns The recipient token account from the payload (verified against the wallet's ATA).
 */
export async function assertBtcbDepositRecipientMatchesWallet({
  payloadBytes,
  mint,
  tokenProgramId,
  recipientWallet,
}: {
  payloadBytes: Buffer;
  mint: PublicKey;
  tokenProgramId: PublicKey;
  recipientWallet: string;
}): Promise<PublicKey> {
  const payloadRecipient = new PublicKey(payloadBytes.subarray(36, 68));
  const expectedAta = await getAssociatedTokenAddress(
    mint,
    new PublicKey(recipientWallet),
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  if (!expectedAta.equals(payloadRecipient)) {
    throw new Error(
      `Recipient mismatch: payload expects token account ${payloadRecipient.toBase58()} ` +
        `but ATA for wallet ${recipientWallet} is ${expectedAta.toBase58()}.`,
    );
  }

  return payloadRecipient;
}

/**
 * Compute bascule deposit ID from raw 196-byte BTC.B payload.
 *
 * keccak256( [0u8;32] || "\x03SOL" || recipient_token_account(32) || amount(8) || txid(32) || vout(4) )
 * Payload offsets: recipient ATA 36-68, amount 68-76, txid 76-108, vout 108-112.
 */
export function computeDepositIdFromPayload(payloadBytes: Buffer): Uint8Array {
  const prefix = Buffer.alloc(32, 0);
  const chainId = Buffer.from([0x03, 0x53, 0x4f, 0x4c]);

  const dataToHash = Buffer.concat([
    prefix,
    chainId,
    payloadBytes.subarray(36, 68),
    payloadBytes.subarray(68, 76),
    payloadBytes.subarray(76, 108),
    payloadBytes.subarray(108, 112),
  ]);

  const hash = keccak256(new Uint8Array(dataToHash));
  return new Uint8Array(Buffer.from(hash, 'hex'));
}
