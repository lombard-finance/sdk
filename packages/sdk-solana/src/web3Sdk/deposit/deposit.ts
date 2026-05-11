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

export interface DepositParams {
  amount: string;
  /**
   * Owner wallet that will receive the destination token (e.g. LBTC).
   * Solana pubkey (base58). The GMP payload uses the associated token account
   * for `toTokenAddress` / default LBTC mint — matching api backend and claimer expectations.
   */
  recipient: string;
  /**
   * Source token mint to burn (e.g. BTC.b). Defaults to `config.btcbTokenMint`.
   */
  sourceTokenMint?: string;
  /**
   * Destination Lombard routing chain ID (hex, 32 bytes).
   * Defaults to `config.solanaRoutingChainId` (same-chain deposit).
   */
  toLchainId?: string;
  /**
   * Destination token address / mint (e.g. LBTC). Defaults to `config.lbtcTokenMint`.
   */
  toTokenAddress?: string;
  network: SolanaNetwork;
  env?: Env;
  rpcUrl?: string;
  debug?: boolean;
  skipPreflight?: boolean;
}

/**
 * Deposit (swap) source token to destination token via Asset Router's `deposit` instruction.
 *
 * Burns the source token (e.g. BTC.b) and sends a GMP message through the Mailbox
 * to mint the destination token (e.g. LBTC) to the recipient's ATA for that mint.
 *
 * Default flow (all optional params omitted): BTC.b → LBTC on Solana.
 */
export async function deposit(
  provider: ISolanaWalletProvider,
  params: DepositParams,
): Promise<string> {
  const {
    amount,
    recipient,
    network,
    env: envOverride,
    rpcUrl,
    debug = false,
    skipPreflight = true,
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
      throw new Error(
        `Solana routing chain ID not configured for network: ${network}`,
      );
    }

    const sourceMintAddress = params.sourceTokenMint ?? config.btcbTokenMint;
    if (!sourceMintAddress) {
      throw new Error(
        `Source token mint not configured for network: ${network}`,
      );
    }

    const toLchainIdHex = params.toLchainId ?? config.solanaRoutingChainId;
    const toTokenAddressStr = params.toTokenAddress ?? config.lbtcTokenMint;
    if (!toTokenAddressStr) {
      throw new Error(
        `Destination token not configured for network: ${network}`,
      );
    }

    validateAmount(amount);

    const connection = getConnection(network, rpcUrl);
    const payer = new PublicKey(provider.publicKey);
    const mint = new PublicKey(sourceMintAddress);
    const recipientPubkey = new PublicKey(recipient);
    const assetRouterProgramId = new PublicKey(config.assetRouter);
    const mailboxProgramId = new PublicKey(config.mailbox);
    const solanaRoutingChainId = Buffer.from(
      config.solanaRoutingChainId,
      'hex',
    );
    const toLchainId = Buffer.from(toLchainIdHex, 'hex');
    const destinationMint = new PublicKey(toTokenAddressStr);
    const toTokenAddress = destinationMint.toBytes();

    debugLog('Payer:', payer.toBase58());
    debugLog('Mint (source, e.g. BTC.b):', mint.toBase58());
    debugLog('Destination token (e.g. LBTC):', toTokenAddressStr);
    debugLog('Recipient (owner):', recipientPubkey.toBase58());
    debugLog('Amount:', amount);

    const [tokenProgramId, destinationTokenProgramId] = await Promise.all([
      getTokenProgramForMint(connection, mint),
      getTokenProgramForMint(connection, destinationMint),
    ]);
    debugLog('Source token program:', tokenProgramId.toBase58());
    debugLog('Destination token program:', destinationTokenProgramId.toBase58());

    const [assetRouterConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
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
    debugLog('Token route PDA:', tokenRoutePDA.toBase58());
    debugLog('Messaging authority PDA:', messagingAuthorityPDA.toBase58());

    const [mailboxConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mailbox_config')],
      mailboxProgramId,
    );
    if (!config.ledgerChainId) {
      throw new Error(
        `Ledger chain ID not configured for network: ${network}`,
      );
    }
    const ledgerChainId = Buffer.from(config.ledgerChainId, 'hex');
    const [outboundMessagePathPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('outbound_message_path'), ledgerChainId],
      mailboxProgramId,
    );
    const [senderConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('sender_config'), messagingAuthorityPDA.toBuffer()],
      mailboxProgramId,
    );

    debugLog('Mailbox config PDA:', mailboxConfigPDA.toBase58());
    debugLog(
      'Outbound message path PDA:',
      outboundMessagePathPDA.toBase58(),
    );
    debugLog('Sender config PDA:', senderConfigPDA.toBase58());

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

    if (arConfigInfo.data.length < 105) {
      throw new Error(
        `Asset Router config account data too short: expected >= 105 bytes, got ${arConfigInfo.data.length}`,
      );
    }
    const paused = arConfigInfo.data[104] !== 0;
    if (paused) {
      throw new Error('Asset Router is paused');
    }

    if (mailboxConfigInfo.data.length < 104) {
      throw new Error(
        `Mailbox config account data too short: expected >= 104 bytes, got ${mailboxConfigInfo.data.length}`,
      );
    }
    const mailboxTreasury = new PublicKey(
      mailboxConfigInfo.data.subarray(72, 104),
    );
    debugLog('Mailbox treasury:', mailboxTreasury.toBase58());

    const payerTokenAccount = await getAssociatedTokenAddress(
      mint,
      payer,
      false,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      destinationMint,
      recipientPubkey,
      false,
      destinationTokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    debugLog('Payer token account:', payerTokenAccount.toBase58());
    debugLog('Recipient token account (payload):', recipientTokenAccount.toBase58());

    const tokenBalance =
      await connection.getTokenAccountBalance(payerTokenAccount);
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

    const toLchainIdArray = Array.from(toLchainId);
    const toTokenAddressArray = Array.from(toTokenAddress);
    const recipientArray = Array.from(recipientTokenAccount.toBytes());

    const MAX_NONCE_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_NONCE_RETRIES; attempt++) {
      const freshMailboxConfig =
        await connection.getAccountInfo(mailboxConfigPDA);
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

      debugLog(
        `Attempt ${attempt + 1}: global nonce=${globalNonce}, outbound_message=${outboundMessagePDA.toBase58()}`,
      );

      const tx = await assetRouterProgram.methods
        .deposit(
          toLchainIdArray,
          toTokenAddressArray,
          recipientArray,
          new BN(amount),
        )
        .accounts({
          payer,
          config: assetRouterConfigPDA,
          tokenRoute: tokenRoutePDA,
          payerTokenAccount,
          tokenProgram: tokenProgramId,
          mint,
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
          debugLabel: 'Asset Router deposit',
          skipPreflight,
        });

        debugLog('deposit completed, signature:', signature);
        return signature;
      } catch (err: unknown) {
        const isNonceError =
          err instanceof Error && err.message.includes('0x7d6');
        if (isNonceError && attempt < MAX_NONCE_RETRIES - 1) {
          debugLog('Nonce stale (ConstraintSeeds), retrying...');
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
      ErrorCode.DEPOSIT_REJECTED,
      'deposit operation failed',
    );
  }
}
