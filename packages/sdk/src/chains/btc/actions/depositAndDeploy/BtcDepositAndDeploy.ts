/**
 * BTC DepositAndDeploy Action
 *
 * Handles BTC → BTC.b → Vault deposit in a single atomic operation.
 * Similar to StakeAndDeploy but produces BTC.b instead of LBTC.
 * Used for protocols like Silo on Avalanche that accept BTC.b.
 *
 * @module chains/btc/actions/depositAndDeploy/BtcDepositAndDeploy
 */

import type { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { isValidChain } from '../../../../common/chains';
import { Chain, parseChainIdentifier,StepStatus } from '../../../../core';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type { DepositAndDeployEventMap } from '../../../../shared/events';
import {
  monitorDeposit,
  type MonitorProgress } from '../../../../shared/monitoring';
import { Token } from '../../../../tokens/token-addresses';
import { ensureNotSanctionedAddress } from '../../../../utils/ensureNotSanctionedAddress';
import { toSatoshi } from '../../../../utils/satoshi';
import {
  assetIdToToken,
  BaseBtcAction,
  type StatusConfig,
  type StepDefinition } from '../shared';
import {
  depositAndDeployConfig,
  getVaultKey,
  isAssetOutSupported,
  isDestChainSupported,
  isProtocolSupported,
  isRouteAvailable } from './config';
import {
  BtcActionStatus,
  type BtcDepositAndDeploy as IBtcDepositAndDeploy,
  type BtcDepositAndDeployParams,
  type BtcDepositAndDeployPrepareParams } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AuthState {
  fee?: string;
  signature?: string;
  typedData?: string;
  approvalTxHash?: string;
  authorized: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// BtcDepositAndDeploy Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC DepositAndDeploy Action
 *
 * Combines deposit (BTC → BTC.b) and vault deployment in a single atomic operation.
 *
 * @example
 * ```typescript
 * const depositAndDeploy = new BtcDepositAndDeploy(ctx, {
 *   assetOut: AssetId.BTCb,
 *   destChain: Chain.AVALANCHE,
 *   protocol: DeployProtocol.Silo,
 * });
 *
 * await depositAndDeploy.prepare({ amount: '0.1', recipient: '0x...' });
 * await depositAndDeploy.authorizeDeposit();
 * const address = await depositAndDeploy.generateDepositAddress();
 * ```
 */
export class BtcDepositAndDeploy
  extends BaseBtcAction<
    DepositAndDeployEventMap,
    BtcActionStatus,
    BtcDepositAndDeployParams
  >
  implements IBtcDepositAndDeploy
{
  private readonly chainId: ChainId;
  private readonly authState: AuthState = { authorized: false };

  constructor(ctx: BtcCoreContext, params: BtcDepositAndDeployParams) {
    super(ctx, params, BtcActionStatus.IDLE);

    // Validate assetOut - DepositAndDeploy should only produce BTC.b
    if (!isAssetOutSupported(params.assetOut)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Asset ${params.assetOut} is not supported for deposit and deploy. ` +
          `DepositAndDeploy produces BTC.b which is then deployed to a vault like Silo.`,
      );
    }

    if (!isDestChainSupported(params.destChain)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Destination chain ${params.destChain} is not supported for deposit and deploy. ` +
          `Supported chains: Avalanche, Avalanche Fuji`,
      );
    }

    if (!isProtocolSupported(params.protocol)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Protocol ${params.protocol} is not supported for deposit and deploy. ` +
          `DepositAndDeploy with BTC.b only supports Silo protocol.`,
      );
    }

    const sourceChain = params.sourceChain ?? Chain.BITCOIN_MAINNET;
    if (!isRouteAvailable(sourceChain, ctx.env)) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain,
        destChain: params.destChain,
        env: ctx.env });
    }

    const parsed = parseChainIdentifier(params.destChain);
    if (typeof parsed !== 'number' || !isValidChain(parsed)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Unsupported EVM chain: ${params.destChain}`,
      );
    }

    this.chainId = parsed as ChainId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Abstract Method Implementations
  // ─────────────────────────────────────────────────────────────────────────

  protected getAddressSchema(): z.ZodType<string> {
    return depositAndDeployConfig.addressSchema;
  }

  protected getStatusConfig(): StatusConfig<BtcActionStatus> {
    return {
      idle: BtcActionStatus.IDLE,
      ready: BtcActionStatus.READY,
      addressReady: BtcActionStatus.ADDRESS_READY };
  }

  protected getInitialSteps(): StepDefinition {
    return {
      created: StepStatus.IDLE,
      verifying: StepStatus.IDLE,
      wrapping: StepStatus.IDLE,
      depositing: StepStatus.IDLE };
  }

  protected isAuthorized(): boolean {
    return this.authState.authorized;
  }

  protected getChainId(): ChainId {
    return this.chainId;
  }

  protected getDepositAddressParams(captchaToken?: string) {
    const recipient = this.ensureRecipient();
    return {
      address: recipient,
      chainId: this.chainId,
      signature: this.authState.signature!,
      token: this.getExpectedToken(),
      // Deposit and deploy uses signatureData (maps to sb_signature_data), not eip712Data
      signatureData: this.authState.typedData,
      partnerId: this.ctx.partner.getPartnerId(),
      referrerCode: this._referralCode,
      captchaToken };
  }

  /**
   * Get expected token for this action (BTCb by default for DepositAndDeploy)
   */
  protected getExpectedToken(): string {
    return assetIdToToken(this.params.assetOut, Token.BTCb);
  }

  protected getAuthRequiredMessage(): string {
    return 'Deposit authorization required. Call authorizeDeposit() first.';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Getters
  // ─────────────────────────────────────────────────────────────────────────

  /** Get deposit and deploy fee (available after prepare()) */
  get fee(): string | undefined {
    return this.authState.fee;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────

  async prepare(params: BtcDepositAndDeployPrepareParams): Promise<void> {
    this.assertStatus(BtcActionStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = this.validatePrepareParams(params);

      this._amount = validated.amount;
      this._recipient = validated.recipient;
      this._referralCode = validated.referralCode;

      // Get fee for deposit and deploy (uses config's getVaultKey for validation)
      this.authState.fee = await depositAndDeployConfig.getDepositAndDeployFee(
        this.ctx,
        this.chainId,
        getVaultKey(this.params.protocol),
      );

      this.updateStatus(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
      this.emitInitialProgress();
    }, BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
  }

  async authorizeDeposit(): Promise<void> {
    this.assertStatus(
      [BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION, BtcActionStatus.READY],
      'authorizeDeposit',
    );

    if (this.status === BtcActionStatus.READY) return;

    const recipient = this.ensureRecipient();
    const amount = this.ensureAmount();

    return this.act(async () => {
      const amountSats = toSatoshi(amount);

      // For BTC → BTC.b deposit and deploy, use the output token (BTCb).
      // Unlike LBTC which has a variable ratio with BTC, BTC.b is 1:1 with BTC
      // so no ratio conversion is needed (amountStrategy: 'identity').
      // Using assetIdToToken ensures we use the correct token for the permit.
      const outputToken = assetIdToToken(this.params.assetOut, Token.BTCb);

      const result = await depositAndDeployConfig.authorizeDepositAndDeploy(
        this.ctx,
        {
          chainId: this.chainId,
          recipient,
          amount: amountSats.toString(),
          vaultKey: getVaultKey(this.params.protocol),
          token: outputToken },
      );

      this.authState.signature = result.signature;
      this.authState.typedData = result.typedData;
      this.authState.authorized = true;
    }, BtcActionStatus.READY);
  }

  async generateDepositAddress(captchaToken?: string): Promise<string> {
    this.assertStatus(BtcActionStatus.READY, 'generateDepositAddress');
    this.ensureAuthorized();

    if (this._depositAddress) {
      return this._depositAddress;
    }

    return this.act(async () => {
      const apiParams = this.getDepositAddressParams(captchaToken);
      const depositAddress =
        await this.ctx.api.generateDepositAddress(apiParams);

      ensureNotSanctionedAddress(depositAddress);
      this._depositAddress = depositAddress;

      this.emitProgress({
        status: BtcActionStatus.ADDRESS_READY,
        steps: {
          created: StepStatus.COMPLETE,
          verifying: StepStatus.IDLE,
          wrapping: StepStatus.IDLE,
          depositing: StepStatus.IDLE },
        metadata: { depositAddress } });

      return depositAddress;
    }, BtcActionStatus.ADDRESS_READY);
  }

  async execute(): Promise<{ depositAddress: string; txHash?: string }> {
    return this.act(async () => {
      this.assertStatus(BtcActionStatus.ADDRESS_READY, 'execute');

      if (!this._depositAddress) {
        await this.generateDepositAddress();
      }

      const depositAddress = this.ensureDepositAddress();
      const txHash = await this.trySendBitcoin(depositAddress);

      return txHash ? { depositAddress, txHash } : { depositAddress };
    });
  }

  // Custom monitorDeposit with different step names
  async monitorDeposit(): Promise<MonitorProgress | undefined> {
    const depositAddress = this._depositAddress;
    const recipient = this._recipient;

    if (!depositAddress || !recipient) {
      throw LombardError.missingParameter('depositAddress or recipient');
    }

    const progress = await monitorDeposit({
      network: this.bitcoinNetwork,
      btcService: this.ctx.btc,
      fetchDeposit: async () => {
        const deposits = await this.ctx.api.getDeposits(recipient);
        const ourDeposit = deposits.find(
          deposit => deposit.depositAddress === depositAddress,
        );

        if (!ourDeposit) {
          return undefined;
        }

        return {
          blockHeight: ourDeposit.blockHeight,
          isClaimed: ourDeposit.isClaimed };
      },
      onProgress: p => {
        this.emitProgress({
          status: this.status,
          steps: {
            created: StepStatus.COMPLETE,
            verifying: p.hasEnoughConfirmations
              ? StepStatus.COMPLETE
              : StepStatus.PENDING,
            wrapping: p.isClaimed ? StepStatus.COMPLETE : StepStatus.PENDING,
            depositing: StepStatus.PENDING },
          confirmations: p.confirmations,
          requiredConfirmations: p.requiredConfirmations,
          metadata: { isClaimed: p.isClaimed } });
      },
      onComplete: () => {
        this.emitCompleted();
      } });

    return progress;
  }
}
