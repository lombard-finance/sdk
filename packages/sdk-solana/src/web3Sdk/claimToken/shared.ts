import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { sha256 } from 'js-sha256';
import { keccak256 } from 'js-sha3';

import { IConfig } from '../../const/getConfig';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import { sendAndConfirmTransaction } from '../../utils';
import { parseSignaturesFromProof } from '../claimLBTC/utils/signatureUtils';

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

// ── parseAssetRouterConfig ──

/**
 * Parse Asset Router config from raw account bytes.
 * Equivalent to Go's `getPausedAndBasculeFromConfig(data)`.
 *
 * On-chain layout (discriminator 8 bytes, then fields):
 *   admin:              Pubkey  (offset   8, 32 bytes)
 *   pending_admin:      Pubkey  (offset  40, 32 bytes)
 *   treasury:           Pubkey  (offset  72, 32 bytes)
 *   paused:             bool    (offset 104,  1 byte)
 *   native_mint:        Pubkey  (offset 105, 32 bytes)
 *   mailbox:            Pubkey  (offset 137, 32 bytes)
 *   bascule_enabled:    bool    (offset 169,  1 byte)
 *   bascule_program:    Pubkey  (offset 170, 32 bytes)  <- not in IDL
 *   bascule_gmp_program:Pubkey  (offset 202, 32 bytes)  <- not in IDL
 *   ledger_lchain_id:   [u8;32] (offset 234, 32 bytes)
 *   bitcoin_lchain_id:  [u8;32] (offset 266, 32 bytes)
 */
export function parseAssetRouterConfig(data: Buffer): AssetRouterConfig {
  const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));

  const paused = data[104] !== 0;
  const nativeMint = new PublicKey(data.subarray(105, 137));

  const basculeProgramKey = new PublicKey(data.subarray(170, 202));
  const basculeProgramId = basculeProgramKey.equals(ZERO_PUBKEY)
    ? null
    : basculeProgramKey;

  const basculeGmpProgramKey = new PublicKey(data.subarray(202, 234));
  const basculeGmpProgramId = basculeGmpProgramKey.equals(ZERO_PUBKEY)
    ? null
    : basculeGmpProgramKey;

  const ledgerChainId = new Uint8Array(data.subarray(234, 266));

  return { paused, nativeMint, basculeProgramId, basculeGmpProgramId, ledgerChainId };
}

// ── Consortium session ──

/**
 * Execute the consortium session flow: create_session, post_signatures, finalize_session.
 * Skips steps that are already completed on-chain.
 */
export async function executeConsortiumSession(ctx: ClaimContext): Promise<void> {
  const {
    provider, connection, consortiumProgram,
    consortiumConfigPDA, sessionPDA, validatedPayloadPDA,
    payloadHashArray, params, debugLog,
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
        // @ts-ignore — Anchor may not resolve PDA types from IDL
        session: sessionPDA,
        validatedPayload: validatedPayloadPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: createSessionTx,
      connection,
      provider,
      debugLabel: 'Consortium create_session',
      skipPreflight: true,
    });
    debugLog('create_session completed');
  } else {
    debugLog('Session already exists, skipping create_session');
  }

  // Step 2: post_session_signatures
  const freshSession =
    sessionAccount ?? (await connection.getAccountInfo(sessionPDA));
  let sessionSigned = false;
  if (freshSession && freshSession.data.length >= 8 + 8 + 4 + 8) {
    const vecLen = freshSession.data.readUInt32LE(8 + 8);
    const weightOffset = 8 + 8 + 4 + vecLen;
    if (freshSession.data.length >= weightOffset + 8) {
      sessionSigned = freshSession.data.readBigUInt64LE(weightOffset) > 0n;
    }
  }

  if (!sessionSigned) {
    debugLog('Step 2: post_session_signatures...');
    const { signatures: parsedSigs, indices } =
      parseSignaturesFromProof(params.proofSignature);

    if (parsedSigs.length === 0 || indices.length === 0) {
      throw new Error('No valid signatures found in the proof');
    }

    const signatures = parsedSigs.map(sig => Array.from(sig));

    const postSigsTx = await consortiumProgram.methods
      .postSessionSignatures(payloadHashArray, signatures, indices)
      .accounts({
        payer: provider.publicKey,
        config: consortiumConfigPDA,
        // @ts-ignore
        session: sessionPDA,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: postSigsTx,
      connection,
      provider,
      debugLabel: 'Consortium post_session_signatures',
      skipPreflight: true,
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
      // @ts-ignore
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
    skipPreflight: true,
  });
  debugLog('finalize_session completed — ValidatedPayload created');
}

// ── Helpers ──

export function computePayloadHash(payloadBytes: Buffer): Buffer {
  return Buffer.from(
    sha256(payloadBytes as unknown as Uint8Array),
    'hex',
  );
}

/**
 * Compute bascule deposit ID from raw 196-byte BTC.B payload.
 *
 * keccak256( [0u8;32] || "\x03SOL" || recipient(32) || amount(8) || txid(32) || vout(4) )
 * Payload offsets: recipient 36-68, amount 68-76, txid 76-108, vout 108-112.
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
