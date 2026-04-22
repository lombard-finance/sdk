import { BN } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { sendAndConfirmTransaction } from '../../utils';
import { BTC_NATIVE_TOKEN_ADDRESS, RedeemContext } from './shared';

/**
 * BTC.b → BTC redemption via Asset Router's `redeem_for_btc`.
 *
 * Burns BTC.b tokens and sends a GMP message through the Mailbox to trigger
 * a BTC payout to the specified Bitcoin address.
 */
export async function redeemBtcbForBtc(ctx: RedeemContext): Promise<string> {
  const {
    provider, params, config, connection,
    payer, mint, tokenProgramId, scriptPubKey,
    assetRouterProgramId, mailboxProgramId,
    solanaRoutingChainId, bitcoinRoutingChainId,
    assetRouterProgram, assetRouterConfigPDA, mailboxConfigPDA,
    arTreasury, mailboxTreasury,
    debugLog,
  } = ctx;

  const { amount, skipPreflight = false } = params;

  // ── BTC.b-specific PDAs ──
  const [tokenConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_config'), mint.toBuffer()],
    assetRouterProgramId,
  );
  const [tokenRoutePDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('token_route'),
      solanaRoutingChainId,
      mint.toBuffer(),
      bitcoinRoutingChainId,
      BTC_NATIVE_TOKEN_ADDRESS,
    ],
    assetRouterProgramId,
  );
  const [messagingAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('messaging_authority')],
    assetRouterProgramId,
  );

  debugLog('Token config PDA:', tokenConfigPDA.toBase58());
  debugLog('Token route PDA:', tokenRoutePDA.toBase58());
  debugLog('Messaging authority PDA:', messagingAuthorityPDA.toBase58());

  // ── Mailbox PDAs ──
  if (!config.ledgerChainId) {
    throw new Error(`Ledger chain ID not configured for network: ${params.network}`);
  }
  const ledgerChainId = Buffer.from(config.ledgerChainId, 'hex');
  const [outboundMessagePathPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('outbound_message_path'), ledgerChainId],
    mailboxProgramId,
  );
  const [senderConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('sender_config'), assetRouterProgramId.toBuffer()],
    mailboxProgramId,
  );

  debugLog('Outbound message path PDA:', outboundMessagePathPDA.toBase58());
  debugLog('Sender config PDA:', senderConfigPDA.toBase58());

  // ── Token accounts ──
  const payerTokenAccount = await getAssociatedTokenAddress(
    mint,
    payer,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const treasuryTokenAccount = await getAssociatedTokenAddress(
    mint,
    arTreasury,
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  debugLog('Payer token account:', payerTokenAccount.toBase58());
  debugLog('Treasury token account:', treasuryTokenAccount.toBase58());

  // ── Balance check ──
  const tokenBalance = await connection.getTokenAccountBalance(payerTokenAccount);
  const userBalance = BigInt(tokenBalance.value.amount);
  const parsedAmount = BigInt(amount);
  if (userBalance < parsedAmount) {
    throw new Error(
      `Insufficient BTC.b balance: have ${tokenBalance.value.uiAmountString}, need ${Number(parsedAmount) / 1e8}`,
    );
  }

  // ── Build & send with nonce retry ──
  // The outbound_message PDA depends on global_nonce which can change between
  // reads. Retry up to 3 times if the nonce becomes stale.
  const MAX_NONCE_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_NONCE_RETRIES; attempt++) {
    const freshMailboxConfig = await connection.getAccountInfo(mailboxConfigPDA);
    if (!freshMailboxConfig) {
      throw new Error('Mailbox config account not found');
    }
    // global_nonce is a u64 at offset 137; need 137 + 8 = 145 bytes
    if (freshMailboxConfig.data.length < 145) {
      throw new Error(
        `Mailbox config account data too short: expected >= 145 bytes, got ${freshMailboxConfig.data.length}`,
      );
    }
    const globalNonce = freshMailboxConfig.data.readBigUInt64LE(137);
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64BE(globalNonce);

    const [outboundMessagePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('outbound_message'), nonceBuf],
      mailboxProgramId,
    );

    debugLog(`Attempt ${attempt + 1}: global nonce=${globalNonce}, outbound_message=${outboundMessagePDA.toBase58()}`);

    const tx = await assetRouterProgram.methods
      .redeemForBtc(scriptPubKey, new BN(amount))
      .accounts({
        payer,
        config: assetRouterConfigPDA,
        tokenConfig: tokenConfigPDA,
        tokenRoute: tokenRoutePDA,
        payerTokenAccount,
        tokenProgram: tokenProgramId,
        mint,
        treasuryTokenAccount,
        messagingAuthority: messagingAuthorityPDA,
        mailbox: mailboxProgramId,
        mailboxConfig: mailboxConfigPDA,
        outboundMessagePath: outboundMessagePathPDA,
        outboundMessage: outboundMessagePDA,
        senderConfig: senderConfigPDA,
        treasury: mailboxTreasury,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    debugLog('Instruction account count:', tx.instructions[0]?.keys.length);

    try {
      const { signature } = await sendAndConfirmTransaction({
        instruction: tx,
        connection,
        provider,
        debugLabel: 'Asset Router redeem_for_btc',
        skipPreflight,
      });

      debugLog('redeem_for_btc completed, signature:', signature);
      return signature;
    } catch (err: unknown) {
      const isNonceError =
        err instanceof Error &&
        err.message.includes('0x7d6'); // ConstraintSeeds
      if (isNonceError && attempt < MAX_NONCE_RETRIES - 1) {
        debugLog(`Nonce stale (ConstraintSeeds), retrying...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed after max nonce retries');
}
