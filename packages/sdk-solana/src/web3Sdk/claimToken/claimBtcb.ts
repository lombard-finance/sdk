import { getMint } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { sendAndConfirmTransaction } from '../../utils';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';
import { ALREADY_MINTED_TX_HASH } from '../claimLBTC';
import {
  ClaimContext,
  computeDepositIdFromPayload,
  executeConsortiumSession,
} from './shared';

/**
 * BTC.B mint flow via Consortium + Asset Router mint_from_payload.
 *
 * 1. Consortium session (create, post signatures, finalize)
 * 2. mint_from_payload on Asset Router (+ bascule remaining accounts)
 */
export async function claimBtcbFromPayload(ctx: ClaimContext): Promise<string> {
  const {
    provider, connection, params, payloadBytes, payloadHash,
    payloadHashArray, assetRouterProgram, assetRouterProgramId,
    assetRouterConfigPDA, tokenAuthorityPDA, validatedPayloadPDA,
    arConfig, debugLog,
  } = ctx;

  const [depositPayloadSpentPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('deposit_payload_spent'), payloadHash],
    assetRouterProgramId,
  );

  // Check if already minted
  const spentAccount = await connection.getAccountInfo(depositPayloadSpentPDA);
  if (spentAccount) {
    debugLog('Payload already spent (tokens already minted)');
    return ALREADY_MINTED_TX_HASH;
  }

  // Consortium session
  await executeConsortiumSession(ctx);

  // Read mint info
  const mint = arConfig.nativeMint;
  debugLog('Native mint from config:', mint.toBase58());

  const effectiveBasculeProgramId = params.basculeProgram
    ? new PublicKey(params.basculeProgram)
    : arConfig.basculeProgramId;

  debugLog(
    'Bascule program:',
    effectiveBasculeProgramId?.toBase58() ?? 'not set',
  );

  const mintAccountInfo = await connection.getAccountInfo(mint);
  if (!mintAccountInfo) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }
  const tokenProgramId = mintAccountInfo.owner;
  debugLog('Token program:', tokenProgramId.toBase58());

  const mintAccount = await getMint(connection, mint, undefined, tokenProgramId);
  if (!mintAccount.mintAuthority) {
    throw new Error('Mint has no mint authority');
  }
  const mintAuthority = mintAccount.mintAuthority;
  debugLog('Mint authority:', mintAuthority.toBase58());

  const payloadRecipient = new PublicKey(payloadBytes.subarray(36, 68));
  debugLog('Recipient from payload:', payloadRecipient.toBase58());

  await createOrGetAssociatedTokenAccount({
    provider,
    connection,
    ownerAddress: payloadRecipient.toBase58(),
    mintAddress: mint.toBase58(),
  });

  // Build mint_from_payload instruction
  debugLog('mint_from_payload...');
  const mintPayloadArray = Array.from(payloadBytes);
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

  // Append bascule remaining accounts
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

  debugLog('Instruction account count:', mintIx.keys.length);

  const { signature } = await sendAndConfirmTransaction({
    instruction: mintIx,
    connection,
    provider,
    debugLabel: 'Asset Router mint_from_payload',
    skipPreflight: params.skipPreflight ?? false,
  });

  debugLog('BTC.B mint successful! Signature:', signature);
  return signature;
}
