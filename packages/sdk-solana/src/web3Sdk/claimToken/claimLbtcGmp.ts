import { Program } from '@coral-xyz/anchor';
import { getMint } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { getMailboxIdl } from '../../idl/getMailboxIdl';
import { sendAndConfirmTransaction } from '../../utils';
import { createOrGetAssociatedTokenAccount } from '../../utils/tokenAccount';
import { ALREADY_MINTED_TX_HASH } from '../claimLBTC';
import { ClaimContext, executeConsortiumSession } from './shared';

/**
 * LBTC GMP flow via Consortium + Mailbox + Asset Router gmp_receive.
 *
 * 1. Consortium session (create, post signatures, finalize)
 * 2. post_session_payload — writes payload to consortium SessionPayload PDA
 * 3. deliver_message — mailbox program receives the validated message
 * 4. handle_message — mailbox CPI into asset router gmp_receive → mints LBTC
 */
export async function claimLbtcGmp(ctx: ClaimContext): Promise<string> {
  const {
    provider, connection, params, config,
    payloadBytes, payloadHash, payloadHashArray,
    payer, assetRouterProgramId, consortiumProgramId,
    consortiumProgram, assetRouterConfigPDA, tokenAuthorityPDA,
    validatedPayloadPDA, arConfig, debugLog,
  } = ctx;

  if (payloadBytes.length < 296) {
    throw new Error(
      `LBTC GMP payload too short: expected >= 296 bytes, got ${payloadBytes.length}`,
    );
  }

  // message_handled PDA — check if already fully processed
  const [messageHandledPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('message_handled'), payloadHash],
    assetRouterProgramId,
  );
  const messageHandledAccount = await connection.getAccountInfo(messageHandledPDA);
  if (messageHandledAccount) {
    debugLog('Message already handled (LBTC already minted)');
    return ALREADY_MINTED_TX_HASH;
  }

  // ── Consortium session ──
  await executeConsortiumSession(ctx);

  // ── Step 4: post_session_payload ──
  const [sessionPayloadPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('session_payload'), payer.toBytes(), payloadHash],
    consortiumProgramId,
  );

  const sessionPayloadAccount = await connection.getAccountInfo(sessionPayloadPDA);
  if (sessionPayloadAccount) {
    debugLog('Session payload already exists, skipping post_session_payload');
  } else {
    debugLog('post_session_payload...');
    const postPayloadTx = await consortiumProgram.methods
      .postSessionPayload(
        payloadHashArray,
        Buffer.from(payloadBytes),
        payloadBytes.length,
      )
      .accounts({
        payer: provider.publicKey,
        sessionPayload: sessionPayloadPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: postPayloadTx,
      connection,
      provider,
      debugLabel: 'Consortium post_session_payload',
      skipPreflight: params.skipPreflight ?? false,
    });
    debugLog('post_session_payload completed');
  }

  // ── Step 5: deliver_message (mailbox) ──
  if (!config.mailbox) {
    throw new Error(`Mailbox program not configured for network: ${params.network}`);
  }
  const mailboxProgramId = new PublicKey(config.mailbox);
  const mailboxProgram = new Program(
    getMailboxIdl(ctx.env),
    ctx.assetRouterProgram.provider,
  );

  const [mailboxConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('mailbox_config')],
    mailboxProgramId,
  );
  const [messageInfoPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('message'), payloadHash],
    mailboxProgramId,
  );

  if (!config.ledgerChainId) {
    throw new Error(`Ledger chain ID not configured for network: ${params.network}`);
  }
  const ledgerChainId = Buffer.from(config.ledgerChainId, 'hex');
  debugLog('Ledger chain ID:', config.ledgerChainId);

  const [inboundMessagePathPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('inbound_message_path'), ledgerChainId],
    mailboxProgramId,
  );
  debugLog('Inbound message path PDA:', inboundMessagePathPDA.toBase58());

  const messageInfoAccount = await connection.getAccountInfo(messageInfoPDA);
  if (messageInfoAccount) {
    debugLog('Message already delivered, skipping deliver_message');
  } else {
    debugLog('deliver_message...');
    const deliverTx = await mailboxProgram.methods
      .deliverMessage(payloadHashArray)
      .accounts({
        deliverer: provider.publicKey,
        config: mailboxConfigPDA,
        messageInfo: messageInfoPDA,
        inboundMessagePath: inboundMessagePathPDA,
        consortiumPayload: sessionPayloadPDA,
        consortiumValidatedPayload: validatedPayloadPDA,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    await sendAndConfirmTransaction({
      instruction: deliverTx,
      connection,
      provider,
      debugLabel: 'Mailbox deliver_message',
      skipPreflight: params.skipPreflight ?? false,
    });
    debugLog('deliver_message completed');
  }

  // ── Step 6: handle_message (mailbox → asset router gmp_receive CPI) ──
  debugLog('handle_message...');

  // Extract fields from GMP payload
  const msgRecipient = new PublicKey(payloadBytes.subarray(100, 132));
  const mint = new PublicKey(payloadBytes.subarray(232, 264));
  const tokenRecipient = new PublicKey(payloadBytes.subarray(264, 296));

  debugLog('GMP recipient (asset router):', msgRecipient.toBase58());
  debugLog('Mint:', mint.toBase58());
  debugLog('Token recipient:', tokenRecipient.toBase58());

  // Resolve token program and mint authority
  const mintAccountInfo = await connection.getAccountInfo(mint);
  if (!mintAccountInfo) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }
  const tokenProgramId = mintAccountInfo.owner;

  const mintAccount = await getMint(connection, mint, undefined, tokenProgramId);
  if (!mintAccount.mintAuthority) {
    throw new Error('Mint has no mint authority');
  }
  const mintAuthority = mintAccount.mintAuthority;

  // Ensure the recipient's token account exists
  await createOrGetAssociatedTokenAccount({
    provider,
    connection,
    ownerAddress: tokenRecipient.toBase58(),
    mintAddress: mint.toBase58(),
    allowOwnerOffCurve: true,
  });

  // Build handle_message instruction
  const handleIx = await mailboxProgram.methods
    .handleMessage(payloadHashArray)
      .accounts({
      handler: provider.publicKey,
      config: mailboxConfigPDA,
      messageInfo: messageInfoPDA,
      recipientProgram: msgRecipient,
    })
    .instruction();

  // Remaining accounts for asset router gmp_receive CPI (9 accounts)
  handleIx.keys.push(
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: assetRouterConfigPDA, isSigner: false, isWritable: false },
    { pubkey: messageHandledPDA, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    { pubkey: tokenRecipient, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: tokenAuthorityPDA, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  );

  // Bascule GMP remaining accounts (5 accounts)
  const effectiveBasculeGmpProgramId = arConfig.basculeGmpProgramId;

  if (effectiveBasculeGmpProgramId) {
    debugLog('Bascule GMP program:', effectiveBasculeGmpProgramId.toBase58());

    const [basculeValidatorPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bascule_validator')],
      assetRouterProgramId,
    );
    const [basculeGmpConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bascule_gmp_config')],
      effectiveBasculeGmpProgramId,
    );
    const [basculeGmpAccountRolesPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('account_roles'), basculeGmpConfigPDA.toBytes()],
      effectiveBasculeGmpProgramId,
    );
    const [basculeGmpMintPayloadPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_payload'), payloadHash],
      effectiveBasculeGmpProgramId,
    );

    handleIx.keys.push(
      { pubkey: basculeValidatorPDA, isSigner: false, isWritable: true },
      { pubkey: effectiveBasculeGmpProgramId, isSigner: false, isWritable: false },
      { pubkey: basculeGmpConfigPDA, isSigner: false, isWritable: false },
      { pubkey: basculeGmpAccountRolesPDA, isSigner: false, isWritable: false },
      { pubkey: basculeGmpMintPayloadPDA, isSigner: false, isWritable: true },
    );
  } else {
    debugLog('Bascule GMP not enabled, adding placeholder accounts');
    for (let i = 0; i < 5; i++) {
      handleIx.keys.push(
        { pubkey: assetRouterProgramId, isSigner: false, isWritable: false },
      );
    }
  }

  debugLog('handle_message account count:', handleIx.keys.length);

  const { signature } = await sendAndConfirmTransaction({
    instruction: handleIx,
    connection,
    provider,
    debugLabel: 'Mailbox handle_message',
    skipPreflight: params.skipPreflight ?? false,
  });

  debugLog('LBTC mint successful! Signature:', signature);
  return signature;
}
