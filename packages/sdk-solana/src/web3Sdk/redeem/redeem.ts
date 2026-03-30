import { BN, Program } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { DEFAULT_ENV, getConfig, networkToEnv } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getAssetRouterIdl } from '../../idl/getAssetRouterIdl';
import { ISolanaWalletProvider, SolanaNetwork } from '../../types';
import {
  ErrorCode,
  sendAndConfirmTransaction,
  SolanaSdkError,
} from '../../utils';
import { createDebugLogger } from '../../utils/createDebugLogger';
import { getTokenProgramForMint } from '../../utils/tokenAccount';
import { validateAmount } from '../redeemToken/shared';

export interface RedeemParams {
  amount: string;
  /**
   * Owner wallet that receives the routed destination token (e.g. BTC.b).
   * Solana pubkey (base58). The GMP payload uses the ATA for Asset Router
   * `native_mint` from on-chain config and this owner — matching backend/claimer expectations.
   */
  recipient: string;
  /**
   * Source token mint to burn. Defaults to `config.lbtcTokenMint`.
   */
  tokenMint?: string;
  /**
   * Destination Lombard routing chain ID (hex, 32 bytes).
   * Defaults to `config.solanaRoutingChainId` (same-chain redeem).
   */
  toLchainId?: string;
  /**
   * Destination token address / mint. Defaults to `config.btcbTokenMint`.
   */
  toTokenAddress?: string;
  network: SolanaNetwork;
  /**
   * Optional environment override. When provided, used instead of
   * the default `networkToEnv[network]` mapping to resolve config.
   */
  env?: Env;
  rpcUrl?: string;
  debug?: boolean;
  /**
   * Skip preflight transaction simulation before broadcast.
   */
  skipPreflight?: boolean;
}

/**
 * Redeem tokens via Asset Router's generic `redeem` instruction.
 *
 * Burns the source token and sends a GMP message through the Mailbox
 * to route the destination token to the recipient's ATA for `native_mint`.
 *
 * Default flow (all optional params omitted): LBTC → BTC.b on Solana.
 */
export async function redeem(
  provider: ISolanaWalletProvider,
  params: RedeemParams,
): Promise<string> {
  const {
    amount, recipient, network,
    env: envOverride, rpcUrl,
    debug = false, skipPreflight = false,
  } = params;
  const { debugLog, printLogs } = createDebugLogger({ debug });

  try {
    if (!provider.publicKey) {
      throw new Error('Wallet not connected');
    }

    const env = envOverride ?? networkToEnv[network] ?? DEFAULT_ENV;
    const config = getConfig(env);

    if (!config.assetRouter) {
      throw new Error(`Asset Router not configured for network: ${network}`);
    }
    if (!config.mailbox) {
      throw new Error(`Mailbox not configured for network: ${network}`);
    }
    if (!config.solanaRoutingChainId) {
      throw new Error(`Solana routing chain ID not configured for network: ${network}`);
    }

    // Resolve source token mint (defaults to LBTC)
    const mintAddress = params.tokenMint || config.lbtcTokenMint;
    if (!mintAddress) {
      throw new Error(`Source token mint not configured for network: ${network}`);
    }

    // Resolve destination chain and token (defaults to Solana + BTC.b)
    const toLchainIdHex = params.toLchainId || config.solanaRoutingChainId;
    const toTokenAddressStr = params.toTokenAddress || config.btcbTokenMint;
    if (!toTokenAddressStr) {
      throw new Error(`Destination token not configured for network: ${network}`);
    }

    validateAmount(amount);

    const connection = getConnection(network, rpcUrl);
    const payer = new PublicKey(provider.publicKey);
    const mint = new PublicKey(mintAddress);
    const recipientPubkey = new PublicKey(recipient);
    const assetRouterProgramId = new PublicKey(config.assetRouter);
    const mailboxProgramId = new PublicKey(config.mailbox);
    const solanaRoutingChainId = Buffer.from(config.solanaRoutingChainId, 'hex');
    const toLchainId = Buffer.from(toLchainIdHex, 'hex');
    const toTokenAddress = new PublicKey(toTokenAddressStr).toBytes();

    debugLog('Payer:', payer.toBase58());
    debugLog('Mint (source):', mint.toBase58());
    debugLog('Destination token (route arg):', toTokenAddressStr);
    debugLog('Recipient (owner):', recipientPubkey.toBase58());
    debugLog('Amount:', amount);

    // ── Detect token program (Token vs Token-2022) ──
    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    debugLog('Token program:', tokenProgramId.toBase58());

    // ── Asset Router PDAs ──
    const [assetRouterConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      assetRouterProgramId,
    );
    const [tokenConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_config'), mint.toBuffer()],
      assetRouterProgramId,
    );
    const [tokenRoutePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('token_route'),
        solanaRoutingChainId,
        mint.toBuffer(),
        toLchainId,
        Buffer.from(toTokenAddress),
      ],
      assetRouterProgramId,
    );
    const [messagingAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('messaging_authority')],
      assetRouterProgramId,
    );

    debugLog('Asset Router config PDA:', assetRouterConfigPDA.toBase58());
    debugLog('Token config PDA:', tokenConfigPDA.toBase58());
    debugLog('Token route PDA:', tokenRoutePDA.toBase58());
    debugLog('Messaging authority PDA:', messagingAuthorityPDA.toBase58());

    // ── Mailbox PDAs ──
    const [mailboxConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mailbox_config')],
      mailboxProgramId,
    );
    if (!config.ledgerChainId) {
      throw new Error(`Ledger chain ID not configured for network: ${network}`);
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

    debugLog('Mailbox config PDA:', mailboxConfigPDA.toBase58());
    debugLog('Outbound message path PDA:', outboundMessagePathPDA.toBase58());
    debugLog('Sender config PDA:', senderConfigPDA.toBase58());

    // ── Read on-chain state ──
    const [arConfigInfo, mailboxConfigInfo] = await Promise.all([
      connection.getAccountInfo(assetRouterConfigPDA),
      connection.getAccountInfo(mailboxConfigPDA),
    ]);

    if (!arConfigInfo) {
      throw new Error('Asset Router config account not found');
    }
    if (!mailboxConfigInfo) {
      throw new Error('Mailbox config account not found');
    }

    if (arConfigInfo.data.length < 137) {
      throw new Error(
        `Asset Router config account data too short: expected >= 137 bytes (treasury, paused, native_mint), got ${arConfigInfo.data.length}`,
      );
    }
    const arTreasury = new PublicKey(arConfigInfo.data.subarray(72, 104));
    const paused = arConfigInfo.data[104] !== 0;
    const nativeMintFromConfig = new PublicKey(
      arConfigInfo.data.subarray(105, 137),
    );
    if (paused) {
      throw new Error('Asset Router is paused');
    }
    debugLog('Asset Router treasury:', arTreasury.toBase58());
    debugLog('Native mint (recipient ATA mint):', nativeMintFromConfig.toBase58());

    if (mailboxConfigInfo.data.length < 104) {
      throw new Error(
        `Mailbox config account data too short: expected >= 104 bytes, got ${mailboxConfigInfo.data.length}`,
      );
    }
    const mailboxTreasury = new PublicKey(
      mailboxConfigInfo.data.subarray(72, 104),
    );
    debugLog('Mailbox treasury:', mailboxTreasury.toBase58());

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

    const destinationTokenProgramId = await getTokenProgramForMint(
      connection,
      nativeMintFromConfig,
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      nativeMintFromConfig,
      recipientPubkey,
      false,
      destinationTokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    debugLog('Payer token account:', payerTokenAccount.toBase58());
    debugLog('Treasury token account:', treasuryTokenAccount.toBase58());
    debugLog('Recipient token account (payload):', recipientTokenAccount.toBase58());

    // ── Balance check ──
    const tokenBalance = await connection.getTokenAccountBalance(payerTokenAccount);
    const userBalance = BigInt(tokenBalance.value.amount);
    const parsedAmount = BigInt(amount);
    if (userBalance < parsedAmount) {
      throw new Error(
        `Insufficient balance: have ${tokenBalance.value.uiAmountString}, need ${Number(parsedAmount) / 1e8}`,
      );
    }

    const assetRouterProgram = new Program(
      getAssetRouterIdl(env),
      { connection },
    );

    // ── Instruction args ──
    const toLchainIdArray = Array.from(toLchainId);
    const toTokenAddressArray = Array.from(toTokenAddress);
    const recipientArray = Array.from(recipientTokenAccount.toBytes());

    // ── Build & send with nonce retry ──
    const MAX_NONCE_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_NONCE_RETRIES; attempt++) {
      const freshMailboxConfig = await connection.getAccountInfo(mailboxConfigPDA);
      if (!freshMailboxConfig) {
        throw new Error('Mailbox config account not found');
      }
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
        .redeem(toLchainIdArray, toTokenAddressArray, recipientArray, new BN(amount))
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
          debugLabel: 'Asset Router redeem',
          skipPreflight,
        });

        debugLog('redeem completed, signature:', signature);
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
  } catch (error: unknown) {
    if (error instanceof Error && debug) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.UNSTAKE_REJECTED,
      'redeem operation failed',
    );
  }
}
