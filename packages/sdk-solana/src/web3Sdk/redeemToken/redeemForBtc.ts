import { Program } from '@coral-xyz/anchor';
import { getOutputScript } from '@lombard.finance/sdk-common';
import { PublicKey } from '@solana/web3.js';

import { DEFAULT_ENV, getConfig, networkToEnv } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getAssetRouterIdl } from '../../idl/getAssetRouterIdl';
import { ISolanaWalletProvider } from '../../types';
import {
  ErrorCode,
  SolanaSdkError,
} from '../../utils';
import { createDebugLogger } from '../../utils/createDebugLogger';
import { getTokenProgramForMint } from '../../utils/tokenAccount';
import { redeemBtcbForBtc } from './redeemBtcb';
import { redeemLbtcForBtc } from './redeemLbtc';
import { RedeemContext, RedeemForBtcParams, validateAmount } from './shared';

export type { RedeemForBtcParams } from './shared';

/**
 * Redeem tokens (BTC.b or LBTC) → BTC on Solana via Asset Router.
 *
 * Routes to the appropriate flow based on the token mint:
 * - BTC.b mint → burns BTC.b via `redeem_for_btc`
 * - LBTC mint → burns LBTC via LBTC-specific redemption flow
 */
export async function redeemForBtc(
  provider: ISolanaWalletProvider,
  params: RedeemForBtcParams,
): Promise<string> {
  const { amount, btcAddress, network, env: envOverride, rpcUrl, debug = false } = params;
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

    const mintAddress = params.tokenMint;
    const supportedMints = [config.lbtcTokenMint, config.btcbTokenMint].filter(
      (m): m is string => m != null,
    );
    if (!supportedMints.includes(mintAddress)) {
      throw new Error(
        `Unsupported tokenMint for redeemForBtc: ${mintAddress}. Use the configured LBTC or BTC.b mint for network: ${network}.`,
      );
    }

    validateAmount(amount);

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

    // ── Asset Router config PDA ──
    const [assetRouterConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      assetRouterProgramId,
    );

    // ── Mailbox config PDA ──
    const [mailboxConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mailbox_config')],
      mailboxProgramId,
    );

    debugLog('Asset Router config PDA:', assetRouterConfigPDA.toBase58());
    debugLog('Mailbox config PDA:', mailboxConfigPDA.toBase58());

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

    // Asset Router config layout: discriminator(8) + admin(32) + pending_admin(32) +
    //   treasury(32) + paused(1) — treasury ends at 104, paused at 104 → min 105 bytes
    if (arConfigInfo.data.length < 105) {
      throw new Error(
        `Asset Router config account data too short: expected >= 105 bytes, got ${arConfigInfo.data.length}`,
      );
    }
    const arTreasury = new PublicKey(arConfigInfo.data.subarray(72, 104));
    const paused = arConfigInfo.data[104] !== 0;
    if (paused) {
      throw new Error('Asset Router is paused');
    }
    debugLog('Asset Router treasury:', arTreasury.toBase58());

    // Mailbox config layout: discriminator(8) + admin(32) + pending_admin(32) +
    //   treasury(32) — treasury ends at offset 104 → min 104 bytes
    if (mailboxConfigInfo.data.length < 104) {
      throw new Error(
        `Mailbox config account data too short: expected >= 104 bytes, got ${mailboxConfigInfo.data.length}`,
      );
    }
    const mailboxTreasury = new PublicKey(
      mailboxConfigInfo.data.subarray(72, 104),
    );
    debugLog('Mailbox treasury:', mailboxTreasury.toBase58());

    const assetRouterProgram = new Program(
      getAssetRouterIdl(env),
      { connection },
    );

    const ctx: RedeemContext = {
      provider,
      params,
      env,
      config,
      connection,
      payer,
      mint,
      tokenProgramId,
      scriptPubKey,
      assetRouterProgramId,
      mailboxProgramId,
      solanaRoutingChainId,
      bitcoinRoutingChainId,
      assetRouterProgram,
      assetRouterConfigPDA,
      mailboxConfigPDA,
      arTreasury,
      mailboxTreasury,
      debugLog,
    };

    // Route based on token mint
    const isLbtc = mintAddress === config.lbtcTokenMint;
    if (isLbtc) {
      debugLog('Flow: LBTC → BTC redemption');
      return await redeemLbtcForBtc(ctx);
    }

    debugLog('Flow: BTC.b → BTC redemption');
    return await redeemBtcbForBtc(ctx);
  } catch (error: unknown) {
    if (error instanceof Error && debug) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.UNSTAKE_REJECTED,
      'redeem_for_btc operation failed',
    );
  }
}
