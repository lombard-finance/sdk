/**
 * BTC Deposit Action
 *
 * Handles BTC deposit operations for custody without staking.
 * Supports EVM and Solana destination chains.
 *
 * Fee authorization is ONLY required for Ethereum mainnet.
 * Other chains use address confirmation signing.
 *
 * @module chains/btc/actions/deposit/BtcDeposit
 */

import type { z } from 'zod';

import type { ChainId, SolanaChain } from '../../../../common/chains';
import {
  getChainType,
  parseChainIdentifier,
  StepStatus,
} from '../../../../core';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type { DepositEventMap } from '../../../../shared/events';
import type { MonitorProgress } from '../../../../shared/monitoring';
import { Token } from '../../../../tokens/token-addresses';
import {
  assetIdToToken,
  BaseBtcAction,
  type StatusConfig,
  type StepDefinition,
} from '../shared';
import {
  type DepositChainConfig,
  type DepositFeeAuthConfig,
  getDepositChainConfig,
  isAssetOutSupported,
  isDestChainSupported,
  isRouteAvailable,
} from './config';
import {
  BtcActionStatus,
  type BtcDeposit as IBtcDeposit,
  type BtcDepositParams,
  type BtcDepositPrepareParams,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type AnyChainId = ChainId | SolanaChain;

interface AuthorizationState {
  signature?: string;
  typedData?: string;
  authorized: boolean;
  /** Minting fee in BTC (e.g., "0.00000032") */
  mintingFee?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BtcDeposit Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC Deposit Action
 *
 * Handles BTC deposit to custody with BTC.b minting on destination chain.
 * This is for custody without staking. For staking (BTC → LBTC), use BtcStake.
 *
 * @example
 * ```typescript
 * const deposit = new BtcDeposit(ctx, {
 *   assetOut: AssetId.BTCb,
 *   destChain: Chain.AVALANCHE,
 * });
 *
 * await deposit.prepare({ amount: '0.1', recipient: '0x...' });
 * await deposit.authorizeFee();
 * const address = await deposit.generateDepositAddress();
 * ```
 */
export class BtcDeposit
  extends BaseBtcAction<DepositEventMap, BtcActionStatus, BtcDepositParams>
  implements IBtcDeposit
{
  private readonly config: DepositChainConfig;
  private readonly chainId: AnyChainId;
  private readonly authState: AuthorizationState = { authorized: false };

  /** Fee auth config - null if not required for this destination */
  private feeAuthConfig: DepositFeeAuthConfig | null = null;

  constructor(ctx: BtcCoreContext, params: BtcDepositParams) {
    super(ctx, params, BtcActionStatus.IDLE);

    const chainType = getChainType(params.destChain);
    const config = getDepositChainConfig(chainType);

    if (!config) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Unsupported destination chain type: ${chainType} (${params.destChain})`,
      );
    }

    if (!isAssetOutSupported(config, params.assetOut)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Asset ${params.assetOut} is not supported for BTC deposits. ` +
          `BTC Deposit produces BTC.b. For LBTC, use BtcStake instead.`,
      );
    }

    if (!isDestChainSupported(config, params.destChain)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Destination chain ${params.destChain} is not supported for ${chainType} BTC deposits`,
      );
    }

    if (!isRouteAvailable(config, params.sourceChain, ctx.env)) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: ctx.env,
      });
    }

    this.config = config;
    this.chainId = parseChainIdentifier(params.destChain) as AnyChainId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Abstract Method Implementations
  // ─────────────────────────────────────────────────────────────────────────

  protected getAddressSchema(): z.ZodType<string> {
    return this.config.addressSchema;
  }

  protected getStatusConfig(): StatusConfig<BtcActionStatus> {
    return {
      idle: BtcActionStatus.IDLE,
      ready: BtcActionStatus.READY,
      addressReady: BtcActionStatus.ADDRESS_READY,
    };
  }

  protected getInitialSteps(): StepDefinition {
    return {
      created: StepStatus.IDLE,
      verifying: StepStatus.IDLE,
      issuing: StepStatus.IDLE,
    };
  }

  protected isAuthorized(): boolean {
    return this.authState.authorized;
  }

  protected getChainId(): AnyChainId {
    return this.chainId;
  }

  /**
   * Get the minting fee for this deposit (in BTC)
   * Available after prepare() when fee authorization is required
   */
  get mintingFee(): string | undefined {
    return this.authState.mintingFee;
  }

  protected getDepositAddressParams(captchaToken?: string) {
    const recipient = this.ensureRecipient();
    return {
      address: recipient,
      chainId: this.chainId,
      signature: this.authState.signature!, // Must be set before calling
      token: this.getExpectedToken(),
      eip712Data: this.authState.typedData,
      partnerId: this.ctx.partner.getPartnerId(),
      referrerCode: this._referralCode,
      captchaToken,
    };
  }

  /**
   * Override to ensure we have a signature before generating deposit address.
   *
   * When fee auth exists on server but signature isn't available locally,
   * we fall back to signing the destination address.
   */
  async generateDepositAddress(captchaToken?: string): Promise<string> {
    // If signature isn't available locally, sign the destination address as fallback
    if (!this.authState.signature) {
      const result = await this.config.signDestination(
        this.ctx,
        this.ensureRecipient(),
        this.chainId,
      );
      this.authState.signature = result.signature;
      this.authState.typedData = result.typedData;
    }

    return this.generateDepositAddressImpl(captchaToken);
  }

  /**
   * Get expected token for this action (BTCb by default for BTC Deposit)
   */
  protected getExpectedToken(): string {
    return assetIdToToken(this.params.assetOut, Token.BTCb);
  }

  protected getAuthRequiredMessage(): string {
    return this.feeAuthConfig
      ? 'Fee authorization required. Call authorizeFee() first.'
      : 'Address confirmation required. Call confirmAddress() first.';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────

  async prepare(params: BtcDepositPrepareParams): Promise<void> {
    this.assertStatus(BtcActionStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = this.validatePrepareParams(params);

      this._amount = validated.amount;
      this._recipient = validated.recipient;
      this._referralCode = validated.referralCode;

      // Get fee auth config for this destination chain (needed for both resume and new flow)
      this.feeAuthConfig = this.config.getFeeAuthConfig(this.params.destChain);

      // Check for existing deposit address (resume flow)
      const hasExistingDeposit = await this.resumeFromExistingDeposit(
        validated.recipient,
      );

      if (hasExistingDeposit) {
        // We have a deposit address, but we still need to validate fee authorization
        // The deposit address might have been created when fee auth was valid,
        // but the fee auth could have expired since then
        if (this.feeAuthConfig) {
          const stored = await this.feeAuthConfig.restoreFeeSignature(
            this.ctx,
            this.chainId,
            validated.recipient,
          );

          // Check hasSignature flag - the actual signature string may not be returned by API
          if (!stored?.hasSignature) {
            // Fee auth is required but expired/missing - need re-authorization
            // Fetch the minting fee for display purposes
            this.authState.mintingFee = await this.feeAuthConfig.getMintingFee(
              this.ctx,
              this.chainId,
            );
            this.updateStatus(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
            this.emitInitialProgress();
            return;
          }

          // Fee auth is still valid on server - store signature if available
          if (stored.signature) {
            this.authState.signature = stored.signature;
            this.authState.typedData = stored.typedData;
          }
          this.authState.authorized = true;
        }

        // Deposit address exists and fee auth is valid (or not required)
        // Now we can safely set the status to ADDRESS_READY
        this.updateStatus(BtcActionStatus.ADDRESS_READY);
        this.emitInitialProgress();
        return;
      }

      // No existing deposit - proceed with normal flow
      if (this.feeAuthConfig) {
        // Fee authorization required (Ethereum mainnet only)
        const stored = await this.feeAuthConfig.restoreFeeSignature(
          this.ctx,
          this.chainId,
          validated.recipient,
        );

        // Check hasSignature flag - the actual signature string may not be returned by API
        if (stored?.hasSignature) {
          // Fee auth already exists on server - store signature if available
          if (stored.signature) {
            this.authState.signature = stored.signature;
            this.authState.typedData = stored.typedData;
          }
          this.authState.authorized = true;
          this.updateStatus(BtcActionStatus.READY);
          this.emitInitialProgress();
          return;
        }

        // Fetch the minting fee for display purposes
        this.authState.mintingFee = await this.feeAuthConfig.getMintingFee(
          this.ctx,
          this.chainId,
        );
        this.updateStatus(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
      } else {
        this.updateStatus(BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION);
      }

      this.emitInitialProgress();
    });
  }

  async authorizeFee(): Promise<void> {
    this.assertStatus(
      [BtcActionStatus.NEEDS_FEE_AUTHORIZATION, BtcActionStatus.READY],
      'authorizeFee',
    );

    if (this.status === BtcActionStatus.READY) return;

    if (!this.feeAuthConfig) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'Fee authorization is not required for this destination chain. Use confirmAddress() instead.',
      );
    }

    const recipient = this.ensureRecipient();

    // Use the minting fee that was fetched during prepare(), not the deposit amount
    if (!this.authState.mintingFee) {
      throw new LombardError(
        ValidationErrorCode.INVALID_STATE,
        'Minting fee not available. Call prepare() first.',
      );
    }

    return this.act(async () => {
      const result = await this.feeAuthConfig!.authorizeFee(this.ctx, {
        chainId: this.chainId,
        recipient,
        fee: this.authState.mintingFee!,
        storeSignature: Boolean(this._depositAddress),
      });

      this.authState.signature = result.signature;
      this.authState.typedData = result.typedData;
      this.authState.authorized = true;
    }, BtcActionStatus.READY);
  }

  async confirmAddress(): Promise<void> {
    this.assertStatus(
      [BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION, BtcActionStatus.READY],
      'confirmAddress',
    );

    if (this.status === BtcActionStatus.READY) return;

    if (this.feeAuthConfig) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'This destination chain requires fee authorization. Use authorizeFee() instead.',
      );
    }

    const recipient = this.ensureRecipient();

    return this.act(async () => {
      const result = await this.config.signDestination(
        this.ctx,
        recipient,
        this.chainId,
      );

      this.authState.signature = result.signature;
      this.authState.typedData = result.typedData;
      this.authState.authorized = true;
    }, BtcActionStatus.READY);
  }

  async execute(): Promise<{ depositAddress: string; txHash?: string }> {
    return this.executeImpl();
  }

  async monitorDeposit(): Promise<MonitorProgress | undefined> {
    return super.monitorDeposit();
  }
}
