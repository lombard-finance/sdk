import { BN, Program } from '@coral-xyz/anchor';
import { Env, getOutputScript } from '@lombard.finance/sdk-common';
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

/**
 * BTC native token address in Lombard protocol (to_token_address for BTC in token_route PDA).
 * BTC is represented as 0x...01 (32 bytes, value 1).
 */
const BTC_NATIVE_TOKEN_ADDRESS = (() => {
  const buf = Buffer.alloc(32, 0);
  buf[31] = 1;
  return buf;
})();

export interface RedeemForBtcParams {
  amount: string;
  btcAddress: string;
  /**
   * BTC.b mint address override. Defaults to config.btcbTokenMint.
   */
  tokenMint?: string;
  network: SolanaNetwork;
  /**
   * Optional environment override. When provided, used instead of
   * the default `networkToEnv[network]` mapping to resolve config.
   * Useful when multiple environments share the same Solana network
   * (e.g. both 'dev' and 'stage' use devnet).
   */
  env?: Env;
  rpcUrl?: string;
  debug?: boolean;
  /**
   * Skip preflight transaction simulation before broadcast.
   *
   * Defaults to `false` (simulation enabled). Set to `true` if preflight
   * simulation gives false negatives — for example, when the simulation node
   * has not yet seen the latest global nonce for the `outbound_message` PDA,
   * leading to a spurious `ConstraintSeeds (0x7d6)` failure even though the
   * transaction would land correctly on-chain. The retry loop inside
   * `redeemForBtc` already handles the `0x7d6` error returned by
   * `confirmTransaction`, so enabling preflight only adds a redundant check
   * at the cost of potential false negatives on lagging RPC nodes.
   */
  skipPreflight?: boolean;
}

/**
 * Redeem BTC.b → BTC on Solana via Asset Router's `redeem_for_btc`.
 *
 * Burns BTC.b tokens and sends a GMP message through the Mailbox to trigger
 * a BTC payout to the specified Bitcoin address.
 */
export async function redeemForBtc(
  provider: ISolanaWalletProvider,
  params: RedeemForBtcParams,
): Promise<string> {
  const { amount, btcAddress, network, env: envOverride, rpcUrl, debug = false, skipPreflight = false } = params;
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
    if (!config.bitcoinRoutingChainId) {
      throw new Error(`Bitcoin routing chain ID not configured for network: ${network}`);
    }

    const mintAddress = params.tokenMint || config.btcbTokenMint;
    if (!mintAddress) {
      throw new Error(`BTC.b mint not configured for network: ${network}`);
    }

    // Validate amount: must be a non-zero positive integer within u64 range
    const U64_MAX = 18446744073709551615n;
    if (!/^\d+$/.test(amount)) {
      throw new Error(
        `Invalid amount "${amount}": must be a positive integer string (lamports, no decimals or signs)`,
      );
    }
    const parsedAmount = BigInt(amount);
    if (parsedAmount === 0n) {
      throw new Error('Amount must be greater than zero');
    }
    if (parsedAmount > U64_MAX) {
      throw new Error(
        `Amount ${amount} exceeds the u64 maximum (${U64_MAX})`,
      );
    }

    const connection = getConnection(network, rpcUrl);
    const payer = new PublicKey(provider.publicKey);
    const mint = new PublicKey(mintAddress);
    const assetRouterProgramId = new PublicKey(config.assetRouter);
    const mailboxProgramId = new PublicKey(config.mailbox);
    const solanaRoutingChainId = Buffer.from(config.solanaRoutingChainId, 'hex');
    const bitcoinRoutingChainId = Buffer.from(config.bitcoinRoutingChainId, 'hex');

    debugLog('Payer:', payer.toBase58());
    debugLog('Mint:', mint.toBase58());
    debugLog('Amount:', amount);
    debugLog('BTC address:', btcAddress);

    // ── Convert BTC address → scriptPubKey ──
    const scriptPubKey = Buffer.from(
      (await getOutputScript(btcAddress, env)).replace(/^0x/, ''),
      'hex',
    );
    debugLog('Script pubkey length:', scriptPubKey.length);

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
        bitcoinRoutingChainId,
        BTC_NATIVE_TOKEN_ADDRESS,
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

    // Asset Router config: treasury at offset 72
    const arTreasury = new PublicKey(arConfigInfo.data.subarray(72, 104));
    const paused = arConfigInfo.data[104] !== 0;
    if (paused) {
      throw new Error('Asset Router is paused');
    }
    debugLog('Asset Router treasury:', arTreasury.toBase58());

    // Mailbox config: treasury at offset 72
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

    debugLog('Payer token account:', payerTokenAccount.toBase58());
    debugLog('Treasury token account:', treasuryTokenAccount.toBase58());

    // ── Balance check ──
    const tokenBalance = await connection.getTokenAccountBalance(
      payerTokenAccount,
    );
    const userBalance = BigInt(tokenBalance.value.amount);
    if (userBalance < parsedAmount) {
      throw new Error(
        `Insufficient BTC.b balance: have ${tokenBalance.value.uiAmountString}, need ${Number(parsedAmount) / 1e8}`,
      );
    }

    const assetRouterProgram = new Program(
      getAssetRouterIdl(env),
      { connection },
    );

    // ── Build & send with nonce retry ──
    // The outbound_message PDA depends on global_nonce which can change between
    // reads. Retry up to 3 times if the nonce becomes stale.
    const MAX_NONCE_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_NONCE_RETRIES; attempt++) {
      // Read fresh nonce right before building the tx
      const freshMailboxConfig = await connection.getAccountInfo(mailboxConfigPDA);
      if (!freshMailboxConfig) {
        throw new Error('Mailbox config account not found');
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
  } catch (error: unknown) {
    if (error instanceof Error && debug) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.UNSTAKE_REJECTED,
      'BTC.b redeem_for_btc operation failed',
    );
  }
}
