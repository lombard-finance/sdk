import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { sha256 } from 'js-sha256';
import { keccak256 } from 'js-sha3';

import { getConfig, networkToEnv } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getAssetRouterIdl } from '../../idl/getAssetRouterIdl';
import { getConsortiumIdl } from '../../idl/getConsortiumIdl';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import { sendAndConfirmTransaction } from '../../utils';
import { createDebugLogger } from '../../utils/createDebugLogger';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';
import { ALREADY_MINTED_TX_HASH } from '../claimLBTC';
import { parseSignaturesFromProof } from '../claimLBTC/utils/signatureUtils';

export interface ClaimTokenParams {
  recipientAddress: string;
  /**
   * SPL token mint address (BTC.b or LBTC).
   */
  tokenMint: string;
  network: SolanaNetwork;
  /**
   * Raw mint payload hex string (196 bytes / 392 hex chars).
   */
  rawPayload: string;
  /**
   * Proof signature from the backend (hex-encoded, ABI-packed signatures).
   */
  proofSignature: string;
  /**
   * Bascule program address. Required when the Asset Router has bascule enabled.
   * Falls back to the static config `bascule` field if not provided.
   */
  basculeProgram?: string;
  rpcUrl?: string;
  debug?: boolean;
}

/**
 * Mint tokens (BTC.b or LBTC) on Solana via Consortium + Asset Router.
 *
 * Full flow:
 * 1. create_session on Consortium
 * 2. post_session_signatures on Consortium
 * 3. finalize_session on Consortium → creates ValidatedPayload PDA
 * 4. mint_from_payload on Asset Router → mints tokens
 */
export async function claimToken(
  provider: ISolanaWalletProvider,
  params: ClaimTokenParams,
): Promise<string> {
  const {
    recipientAddress,
    tokenMint,
    network,
    rawPayload,
    proofSignature,
    rpcUrl,
    debug = false,
  } = params;
  const { debugLog, printLogs } = createDebugLogger({ debug });
  try {
    if (!provider.publicKey) {
      throw new Error('Wallet not found');
    }

    const config = getConfig(networkToEnv[network]);
    if (!config.assetRouter) {
      throw new Error(`Asset Router not configured for network: ${network}`);
    }
    if (!config.consortium) {
      throw new Error(`Consortium not configured for network: ${network}`);
    }

    const connection = getConnection(network, rpcUrl);
    const wallet = {
      publicKey: new PublicKey(provider.publicKey),
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };
    const anchorProvider = new AnchorProvider(connection, wallet, {});
    setProvider(anchorProvider);

    const assetRouterProgram = new Program(
      getAssetRouterIdl(network),
      anchorProvider,
    );
    const consortiumProgram = new Program(
      getConsortiumIdl(network),
      anchorProvider,
    );
    const assetRouterProgramId = new PublicKey(config.assetRouter);
    const consortiumProgramId = new PublicKey(config.consortium);

    // Parse payload and compute hash
    const payloadBytes = Buffer.from(rawPayload, 'hex');
    if (payloadBytes.length !== 196) {
      throw new Error(
        `Invalid payload length: expected 196 bytes, got ${payloadBytes.length}`,
      );
    }
    const payloadHash = Buffer.from(
      sha256(payloadBytes as unknown as Uint8Array),
      'hex',
    );
    const payloadHashArray = Array.from(payloadHash);
    const mintPayloadArray = Array.from(payloadBytes);

    debugLog('Payload hash:', payloadHash.toString('hex'));

    // ── PDAs ──

    const payer = new PublicKey(provider.publicKey);

    // Consortium config PDA (seed: "consortium_config")
    const [consortiumConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('consortium_config')],
      consortiumProgramId,
    );

    // Session PDA — seeds: ["session", payer, payload_hash]
    const [sessionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('session'), payer.toBytes(), payloadHash],
      consortiumProgramId,
    );

    // ValidatedPayload PDA — seeds: ["validated_payload", payload_hash]
    const [validatedPayloadPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('validated_payload'), payloadHash],
      consortiumProgramId,
    );

    // Asset Router PDAs
    const [assetRouterConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      assetRouterProgramId,
    );
    const [tokenAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_authority')],
      assetRouterProgramId,
    );
    const [depositPayloadSpentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('deposit_payload_spent'), payloadHash],
      assetRouterProgramId,
    );

    // ── Check if already minted ──
    const spentAccount = await connection.getAccountInfo(
      depositPayloadSpentPDA,
    );
    if (spentAccount) {
      debugLog('Payload already spent (tokens already minted)');
      return ALREADY_MINTED_TX_HASH;
    }

    // ── Determine consortium status ──
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
    } else {
      // ── Step 1: create_session ──
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

      // ── Step 2: post_session_signatures ──
      // Read session account to check if signatures already posted
      const freshSession =
        sessionAccount ?? (await connection.getAccountInfo(sessionPDA));
      // Session layout: discriminator(8) + epoch(8) + signed:Vec<bool>(4+N) + weight(8)
      // Read weight from the end of the account (last 8 bytes before any padding)
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
          parseSignaturesFromProof(proofSignature);

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

      // ── Step 3: finalize_session ──
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

    // ── Step 4: mint_from_payload on Asset Router ──

    // Read raw config account data (like Go's getPausedAndBasculeFromConfig).
    // The IDL may be outdated and miss bascule_program / bascule_gmp_program fields,
    // so we parse the raw bytes at known offsets.
    const configAccountInfo =
      await connection.getAccountInfo(assetRouterConfigPDA);
    if (!configAccountInfo) {
      throw new Error('Asset Router config account not found');
    }
    const configData = configAccountInfo.data;

    const { paused, nativeMint, basculeProgramId } =
      parseAssetRouterConfig(configData);

    if (paused) {
      throw new Error('Asset Router contract is paused');
    }

    const mint = nativeMint;
    debugLog('Native mint from config:', mint.toBase58());
    debugLog(
      'Bascule program (from on-chain config):',
      basculeProgramId?.toBase58() ?? 'not set',
    );

    // Allow explicit override via params
    const effectiveBasculeProgramId = params.basculeProgram
      ? new PublicKey(params.basculeProgram)
      : basculeProgramId;

    if (effectiveBasculeProgramId && !basculeProgramId) {
      debugLog('Bascule program overridden via params:', effectiveBasculeProgramId.toBase58());
    }

    // Resolve token program from mint account's on-chain owner
    const mintAccountInfo = await connection.getAccountInfo(mint);
    if (!mintAccountInfo) {
      throw new Error(`Mint account not found: ${mint.toBase58()}`);
    }
    const tokenProgramId = mintAccountInfo.owner;
    debugLog('Token program:', tokenProgramId.toBase58());

    // Get mint authority from mint account
    const mintAccount = await getMint(
      connection,
      mint,
      undefined,
      tokenProgramId,
    );
    if (!mintAccount.mintAuthority) {
      throw new Error('Mint has no mint authority');
    }
    const mintAuthority = mintAccount.mintAuthority;
    debugLog('Mint authority:', mintAuthority.toBase58());

    // Recipient from payload bytes 36-68
    const payloadRecipient = new PublicKey(payloadBytes.subarray(36, 68));
    debugLog('Recipient from payload:', payloadRecipient.toBase58());

    // Ensure the recipient's token account exists
    await createOrGetAssociatedTokenAccount({
      provider,
      connection,
      ownerAddress: recipientAddress,
      mintAddress: mint.toBase58(),
    });

    debugLog('Step 4: mint_from_payload...');
    const mintIx = await assetRouterProgram.methods
      .mintFromPayload(mintPayloadArray, payloadHashArray)
      .accounts({
        payer: provider.publicKey,
        config: assetRouterConfigPDA,
        tokenProgram: tokenProgramId,
        recipient: payloadRecipient,
        mint,
        mintAuthority,
        tokenAuthority: tokenAuthorityPDA,
        consortiumValidatedPayload: validatedPayloadPDA,
        depositPayloadSpent: depositPayloadSpentPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    // Append bascule accounts directly to instruction keys (same as Go claimer)
    if (effectiveBasculeProgramId) {
      const [basculeValidatorPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bascule_validator')],
        assetRouterProgramId,
      );

      const [basculeDataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('bascule')],
        effectiveBasculeProgramId,
      );

      const depositId = computeDepositIdFromPayload(payloadBytes);
      debugLog('Deposit ID:', Buffer.from(depositId).toString('hex'));

      const [basculeDepositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit'), depositId],
        effectiveBasculeProgramId,
      );

      debugLog('Bascule validator PDA:', basculeValidatorPDA.toBase58());
      debugLog('Bascule data PDA:', basculeDataPDA.toBase58());
      debugLog('Bascule deposit PDA:', basculeDepositPDA.toBase58());

      mintIx.keys.push(
        { pubkey: basculeValidatorPDA, isSigner: false, isWritable: false },
        { pubkey: effectiveBasculeProgramId, isSigner: false, isWritable: false },
        { pubkey: basculeDataPDA, isSigner: false, isWritable: true },
        { pubkey: basculeDepositPDA, isSigner: false, isWritable: true },
      );
    }

    debugLog(
      'Instruction account count:',
      mintIx.keys.length,
      '(10 base + bascule:',
      mintIx.keys.length - 10,
      ')',
    );

    const { signature } = await sendAndConfirmTransaction({
      instruction: mintIx,
      connection,
      provider,
      debugLabel: 'Asset Router mint_from_payload',
      skipPreflight: true,
    });

    debugLog('Mint successful! Signature:', signature);
    return signature;
  } catch (error: unknown) {
    if (error instanceof Error) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw error;
  }
}

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
 *   bascule_program:    Pubkey  (offset 170, 32 bytes)  ← not in IDL
 *   bascule_gmp_program:Pubkey  (offset 202, 32 bytes)  ← not in IDL
 *   ledger_lchain_id:   [u8;32] (offset 234, 32 bytes)
 *   bitcoin_lchain_id:  [u8;32] (offset 266, 32 bytes)
 */
function parseAssetRouterConfig(data: Buffer): {
  paused: boolean;
  nativeMint: PublicKey;
  basculeProgramId: PublicKey | null;
  basculeGmpProgramId: PublicKey | null;
} {
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

  return { paused, nativeMint, basculeProgramId, basculeGmpProgramId };
}

/**
 * Compute bascule deposit ID from raw 196-byte BTC.B payload.
 *
 * Layout matches the on-chain derivation:
 *   keccak256( [0u8;32] || "\x03SOL" || recipient(32) || amount(8) || txid(32) || vout(4) )
 *
 * Payload offsets: recipient 36-68, amount 68-76, txid 76-108, vout 108-112.
 */
function computeDepositIdFromPayload(payloadBytes: Buffer): Uint8Array {
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
