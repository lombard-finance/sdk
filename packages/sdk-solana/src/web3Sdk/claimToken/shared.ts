import { BN, Program } from "@coral-xyz/anchor";
import { Env } from "@lombard.finance/sdk-common";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak256 } from "js-sha3";
import { sha256 } from "js-sha256";

import { IConfig } from "../../const/getConfig";
import { ISolanaWalletProvider, SolanaNetwork } from "../../types";
import { sendAndConfirmTransaction } from "../../utils";
import { parseSignaturesFromProof } from "../claimLBTC/utils/signatureUtils";

// ── PDA seeds ──

export const CONSORTIUM_SESSION_SEED = Buffer.from("session");
export const CONSORTIUM_CONFIG_SEED = Buffer.from("consortium_config");

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
      epoch.toBuffer("be", 8),
      payer.toBytes(),
      payloadHash,
    ],
    programId,
  )[0];
}

/**
 * Fetch the current epoch from the on-chain consortium config account.
 *
 * Borsh layout of Consortium Config:
 *   discriminator:   8 bytes  (offset 0)
 *   admin:          32 bytes  (offset 8)
 *   pending_admin:  32 bytes  (offset 40)
 *   current_epoch:   8 bytes  (offset 72, u64 LE)
 */
export async function fetchCurrentEpoch(
  connection: Connection,
  consortiumConfigPDA: PublicKey,
): Promise<BN> {
  const accountInfo = await connection.getAccountInfo(consortiumConfigPDA);
  if (!accountInfo) {
    throw new Error(
      `Consortium config account not found at ${consortiumConfigPDA.toBase58()}`,
    );
  }

  const EPOCH_OFFSET = 72; // 8 (discriminator) + 32 (admin) + 32 (pending_admin)
  const MIN_SIZE = EPOCH_OFFSET + 8;
  if (accountInfo.data.length < MIN_SIZE) {
    throw new Error(
      `Consortium config data too short: expected >= ${MIN_SIZE} bytes, got ${accountInfo.data.length}`,
    );
  }

  const epochLe = accountInfo.data.readBigUInt64LE(EPOCH_OFFSET);
  return new BN(epochLe.toString());
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
  // ledger_lchain_id ends at offset 266 — the last field we read
  const MIN_SIZE = 266;
  if (data.length < MIN_SIZE) {
    throw new Error(
      `Asset Router config account data too short: expected >= ${MIN_SIZE} bytes, got ${data.length}`,
    );
  }

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

  return {
    paused,
    nativeMint,
    basculeProgramId,
    basculeGmpProgramId,
    ledgerChainId,
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

  debugLog("Session PDA:", sessionPDA.toBase58(), "exists:", !!sessionAccount);
  debugLog(
    "ValidatedPayload PDA:",
    validatedPayloadPDA.toBase58(),
    "exists:",
    !!validatedPayloadAccount,
  );

  if (validatedPayloadAccount) {
    debugLog("ValidatedPayload exists — skipping all consortium steps");
    return;
  }

  // Step 1: create_session
  if (!sessionAccount) {
    debugLog("Step 1: create_session...");
    const createSessionTx = await consortiumProgram.methods
      .createSession(payloadHashArray)
      .accounts({
        payer: provider.publicKey,
        config: consortiumConfigPDA,
        session: sessionPDA,
        validatedPayload: validatedPayloadPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: createSessionTx,
      connection,
      provider,
      debugLabel: "Consortium create_session",
      skipPreflight: params.skipPreflight ?? false,
    });
    debugLog("create_session completed");
  } else {
    debugLog("Session already exists, skipping create_session");
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
    debugLog("Step 2: post_session_signatures...");
    const { signatures: parsedSigs, indices } = parseSignaturesFromProof(
      params.proofSignature,
    );

    if (parsedSigs.length === 0 || indices.length === 0) {
      throw new Error("No valid signatures found in the proof");
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
      debugLabel: "Consortium post_session_signatures",
      skipPreflight: params.skipPreflight ?? false,
    });
    debugLog("post_session_signatures completed");
  } else {
    debugLog("Signatures already posted (weight > 0), skipping step 2");
  }

  // Step 3: finalize_session
  debugLog("Step 3: finalize_session...");
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
    debugLabel: "Consortium finalize_session",
    skipPreflight: params.skipPreflight ?? false,
  });
  debugLog("finalize_session completed — ValidatedPayload created");
}

// ── Helpers ──

export function computePayloadHash(payloadBytes: Buffer): Buffer {
  return Buffer.from(sha256(payloadBytes as unknown as Uint8Array), "hex");
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
  return new Uint8Array(Buffer.from(hash, "hex"));
}
