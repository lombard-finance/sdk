import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { sha256 } from 'js-sha256';

import { getConfig, networkToEnv } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getAssetRouterIdl } from '../../idl/getAssetRouterIdl';
import { getConsortiumIdl } from '../../idl/getConsortiumIdl';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import { sendAndConfirmTransaction } from '../../utils';
import { createDebugLogger } from '../../utils/createDebugLogger';
import {
  createOrGetAssociatedTokenAccount,
  getTokenProgramForMint,
} from '../../utils/tokenAccount';
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
  debugger;
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

    const mint = new PublicKey(tokenMint);
    const recipient = new PublicKey(recipientAddress);

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

    debugLog('Mint:', mint.toBase58());
    debugLog('Recipient:', recipient.toBase58());
    debugLog('Payload hash:', payloadHash.toString('hex'));

    // ── PDAs ──

    // Consortium config PDA (seed: "consortium_config")
    const [consortiumConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('consortium_config')],
      consortiumProgramId,
    );

    // Session PDA — seeds: ["session", payload_hash]
    const [sessionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('session'), payloadHash],
      consortiumProgramId,
    );

    // ValidatedPayload PDA — seeds: [payload_hash]
    const [validatedPayloadPDA] = PublicKey.findProgramAddressSync(
      [payloadHash],
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

    // ── Determine consortium session status ──
    const validatedPayloadAccount =
      await connection.getAccountInfo(validatedPayloadPDA);
    const sessionAccount = await connection.getAccountInfo(sessionPDA);
    const consortiumValidatedPayloadPDA = validatedPayloadPDA;

    debugLog('Session PDA:', sessionPDA.toBase58(), 'exists:', !!sessionAccount);
    debugLog(
      'ValidatedPayload PDA:',
      validatedPayloadPDA.toBase58(),
      'exists:',
      !!validatedPayloadAccount,
    );

    const needsConsortiumSteps = !validatedPayloadAccount;

    if (needsConsortiumSteps) {
      debugLog('ValidatedPayload not found, running consortium steps...');

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

      // ── Step 3: finalize_session ──
      debugLog('Step 3: finalize_session...');
      const finalizeSessionTx = await consortiumProgram.methods
        .finalizeSession(payloadHashArray)
        .accounts({
          payer: provider.publicKey,
          config: consortiumConfigPDA,
          // @ts-ignore
          session: sessionPDA,
          validatedPayload: consortiumValidatedPayloadPDA,
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

    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    debugLog('Token program:', tokenProgramId.toBase58());

    await createOrGetAssociatedTokenAccount({
      provider,
      connection,
      ownerAddress: recipientAddress,
      mintAddress: tokenMint,
    });

    const recipientATA = await getAssociatedTokenAddress(
      mint,
      recipient,
      false,
      tokenProgramId,
    );
    debugLog('Recipient ATA:', recipientATA.toBase58());

    debugLog('Step 4: mint_from_payload...');
    const mintTx = await assetRouterProgram.methods
      .mintFromPayload(mintPayloadArray, payloadHashArray)
      .accounts({
        payer: provider.publicKey,
        config: assetRouterConfigPDA,
        tokenProgram: tokenProgramId,
        recipient: recipientATA,
        mint,
        mintAuthority: tokenAuthorityPDA,
        tokenAuthority: tokenAuthorityPDA,
        consortiumValidatedPayload: consortiumValidatedPayloadPDA,
        depositPayloadSpent: depositPayloadSpentPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const { signature } = await sendAndConfirmTransaction({
      instruction: mintTx,
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
