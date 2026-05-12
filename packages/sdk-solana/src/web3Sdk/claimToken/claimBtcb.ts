import { getMint } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { sendAndConfirmTransaction } from '../../utils';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';
import { ALREADY_MINTED_TX_HASH } from './constants';
import {
  assertBtcbDepositRecipientMatchesWallet,
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
    provider,
    connection,
    params,
    payloadBytes,
    payloadHash,
    payloadHashArray,
    assetRouterProgram,
    assetRouterProgramId,
    assetRouterConfigPDA,
    tokenAuthorityPDA,
    validatedPayloadPDA,
    arConfig,
    debugLog,
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

  const recipientTokenAccount = await assertBtcbDepositRecipientMatchesWallet({
    payloadBytes,
    mint,
    tokenProgramId,
    recipientWallet: params.recipientAddress,
  });
  debugLog('Recipient token account:', recipientTokenAccount.toBase58());

  await createOrGetAssociatedTokenAccount({
    provider,
    connection,
    ownerAddress: params.recipientAddress,
    mintAddress: mint.toBase58(),
    allowOwnerOffCurve: true,
  });

  // Build mint_from_payload instruction.
  // Optional bascule accounts must be passed explicitly (null when disabled),
  // otherwise Anchor builder throws "Account <x> not provided".
  debugLog('mint_from_payload...');
  const mintPayloadArray = Array.from(payloadBytes);

  let basculeValidatorPDA: PublicKey | undefined;
  let basculeDataPDA: PublicKey | undefined;
  let basculeDepositPDA: PublicKey | undefined;

  if (effectiveBasculeProgramId) {
    [basculeValidatorPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bascule_validator')],
      assetRouterProgramId,
    );
    [basculeDataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bascule')],
      effectiveBasculeProgramId,
    );
    const depositId = computeDepositIdFromPayload(payloadBytes);
    debugLog('Deposit ID:', Buffer.from(depositId).toString('hex'));

    [basculeDepositPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('deposit'), depositId],
      effectiveBasculeProgramId,
    );

    debugLog('Asset router program:', assetRouterProgramId.toBase58());
    debugLog('Bascule program:', effectiveBasculeProgramId.toBase58());
    debugLog('Bascule validator PDA:', basculeValidatorPDA.toBase58());
    debugLog('Bascule data PDA:', basculeDataPDA.toBase58());
    debugLog('Bascule deposit PDA:', basculeDepositPDA.toBase58());
  }

  // Anchor optional accounts: when disabled, pass the program's own ID as a
  // "None" sentinel — this is the convention anchor-client uses for optional accounts.
  const basculeSentinel = assetRouterProgramId;
  const mintIx = await assetRouterProgram.methods
    .mintFromPayload(mintPayloadArray, payloadHashArray)
    .accountsPartial({
      payer: provider.publicKey,
      config: assetRouterConfigPDA,
      tokenProgram: tokenProgramId,
      recipient: recipientTokenAccount,
      mint,
      mintAuthority,
      tokenAuthority: tokenAuthorityPDA,
      consortiumValidatedPayload: validatedPayloadPDA,
      depositPayloadSpent: depositPayloadSpentPDA,
      systemProgram: SystemProgram.programId,
      basculeValidator: basculeValidatorPDA ?? basculeSentinel,
      basculeProgram: effectiveBasculeProgramId ?? basculeSentinel,
      basculeData: basculeDataPDA ?? basculeSentinel,
      basculeDeposit: basculeDepositPDA ?? basculeSentinel,
    })
    .instruction();

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
