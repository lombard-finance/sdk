import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { DEFAULT_ENV, getConfig } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { getAssetRouterIdl } from '../../idl/getAssetRouterIdl';
import { getConsortiumIdl } from '../../idl/getConsortiumIdl';
import { ISolanaWalletProvider } from '../../types';
import { createDebugLogger } from '../../utils/createDebugLogger';
import { claimBtcbFromPayload } from './claimBtcb';
import { claimLbtcGmp } from './claimLbtcGmp';
import {
  ClaimContext,
  ClaimTokenParams,
  computePayloadHash,
  DEPOSIT_SELECTOR_V1,
  fetchCurrentEpoch,
  getConsortiumConfigPDA,
  getConsortiumSessionPDA,
  GMP_MESSAGE_V1_SELECTOR,
  parseAssetRouterConfig,
} from './shared';

export type { ClaimTokenParams } from './shared';

/**
 * Claim tokens (BTC.b or LBTC) on Solana.
 *
 * Routes to the appropriate flow based on the payload selector:
 * - ce25e7c2 → BTC.B direct mint via Asset Router
 * - e288fb4a → LBTC GMP via Mailbox + Asset Router
 */
export async function claimToken(
  provider: ISolanaWalletProvider,
  params: ClaimTokenParams,
): Promise<string> {
  const { network, env = DEFAULT_ENV, rawPayload, rpcUrl, debug = false } = params;
  const { debugLog, printLogs } = createDebugLogger({ debug });

  try {
    if (!provider.publicKey) {
      throw new Error('Wallet not found');
    }

    const config = getConfig(env);

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
      getAssetRouterIdl(env),
      anchorProvider,
    );
    const consortiumProgram = new Program(
      getConsortiumIdl(env),
      anchorProvider,
    );
    const assetRouterProgramId = new PublicKey(config.assetRouter);
    const consortiumProgramId = new PublicKey(config.consortium);

    // Parse payload
    const cleanPayload = rawPayload.startsWith('0x')
      ? rawPayload.slice(2)
      : rawPayload;
    const payloadBytes = Buffer.from(cleanPayload, 'hex');
    if (payloadBytes.length < 4) {
      throw new Error(`Payload too short: ${payloadBytes.length} bytes`);
    }

    const selector = payloadBytes.subarray(0, 4);
    const payloadHash = computePayloadHash(payloadBytes);
    const payloadHashArray = Array.from(payloadHash);

    debugLog('Payload length:', payloadBytes.length);
    debugLog('Selector:', Buffer.from(selector).toString('hex'));
    debugLog('Payload hash:', payloadHash.toString('hex'));

    // PDAs
    const payer = new PublicKey(provider.publicKey);

    const consortiumConfigPDA = getConsortiumConfigPDA(consortiumProgramId);

    // Fetch current epoch from on-chain consortium config
    const currentEpoch = await fetchCurrentEpoch(
      connection,
      consortiumConfigPDA,
    );
    debugLog('Current consortium epoch:', currentEpoch.toString());

    const sessionPDA = getConsortiumSessionPDA(
      consortiumProgramId,
      payer,
      payloadHash,
      currentEpoch,
    );
    const [validatedPayloadPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('validated_payload'), payloadHash],
      consortiumProgramId,
    );
    const [assetRouterConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset_router_config')],
      assetRouterProgramId,
    );
    const [tokenAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('token_authority')],
      assetRouterProgramId,
    );

    // Read on-chain Asset Router config
    debugLog('Asset Router program ID:', assetRouterProgramId.toBase58());
    debugLog('Asset Router config PDA:', assetRouterConfigPDA.toBase58());
    const configAccountInfo =
      await connection.getAccountInfo(assetRouterConfigPDA);
    debugLog('Config account exists:', !!configAccountInfo);
    if (!configAccountInfo) {
      throw new Error(
        `Asset Router config account not found at ${assetRouterConfigPDA.toBase58()} (program: ${assetRouterProgramId.toBase58()})`,
      );
    }
    const arConfig = parseAssetRouterConfig(configAccountInfo.data);

    if (arConfig.paused) {
      throw new Error('Asset Router contract is paused');
    }

    const ctx: ClaimContext = {
      provider,
      params,
      env,
      config,
      connection,
      payloadBytes,
      payloadHash,
      payloadHashArray,
      payer,
      assetRouterProgramId,
      consortiumProgramId,
      assetRouterProgram,
      consortiumProgram,
      consortiumConfigPDA,
      sessionPDA,
      validatedPayloadPDA,
      assetRouterConfigPDA,
      tokenAuthorityPDA,
      arConfig,
      debugLog,
    };

    // Route based on selector
    if (selector.equals(DEPOSIT_SELECTOR_V1)) {
      debugLog('Flow: BTC.B direct mint');
      return await claimBtcbFromPayload(ctx);
    }

    if (selector.equals(GMP_MESSAGE_V1_SELECTOR)) {
      debugLog('Flow: LBTC GMP via Mailbox');
      return await claimLbtcGmp(ctx);
    }

    throw new Error(
      `Unknown payload selector: ${Buffer.from(selector).toString('hex')}`,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw error;
  }
}
