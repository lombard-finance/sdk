/**
 * BTC Deposit Action
 *
 * Handles BTC deposit operations for custody without staking.
 * Supports EVM and Solana destination chains.
 *
 * Fee authorization is ONLY required for Ethereum mainnet.
 * Other chains use address confirmation signing.
 *
 * @module chains/btc/actions/deposit-btcb/BtcDepositBtcb
 */

import type { z } from 'zod';

import type { ChainId, SolanaChain } from '../../../../common/chains';
import {
  getChainType,
  parseChainIdentifier,
  StepStatus,
} from '../../../../core';
import { AssetId } from '../../../../core';
import type { RouteLabel } from '../../../../core/actions';
import { deriveRouteLabel } from '../../../../core/actions';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type { ActionEventMap } from '../../../../shared/events';
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
  type BtcDepositBtcb as IBtcDepositBtcb,
  type BtcDepositBtcbParams,
  type BtcDepositBtcbPrepareParams,
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
// BtcDepositBtcb Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC Deposit Action
 *
 * Handles BTC deposit to custody with BTC.b minting on destination chain.
 * This is for custody without staking. For staking (BTC → LBTC), use BtcDepositLbtc.
 *
 * @example
 * ```typescript
 * const deposit = new BtcDepositBtcb(ctx, {
 *   assetOut: AssetId.BTCb,
 *   destChain: Chain.AVALANCHE,
 * });
 *
 * await deposit.prepare({ amount: '0.1', recipient: '0x...' });
 * await deposit.authorizeFee();
 * const address = await deposit.generateDepositAddress();
 * ```
 */
export class BtcDepositBtcb
  extends BaseBtcAction<ActionEventMap, BtcActionStatus, BtcDepositBtcbParams>
  implements IBtcDepositBtcb
{
  private readonly config: DepositChainConfig;
  private readonly chainId: AnyChainId;
  private readonly authState: AuthorizationState = { authorized: false };

  /** Fee auth config - null if not required for this destination */
  private feeAuthConfig: DepositFeeAuthConfig | null = null;

  constructor(ctx: BtcCoreContext, params: BtcDepositBtcbParams) {
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
        `btc.deposit() cannot mint ${params.assetOut} on this route, which ` +
          `produces BTC.b. Pass assetOut: AssetId.LBTC for the LBTC route.`,
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
   * Which journey this instance is running.
   *
   * Derived from the parameters rather than hardcoded, so the label cannot
   * drift from the route it describes. `LogMeta` carries it into
   * `toSentryContext()`, which is what lets a log line say which journey
   * failed now that one class can cover several.
   */
  get route(): RouteLabel {
    return deriveRouteLabel({
      assetIn: AssetId.BTC,
      assetOut: this.params.assetOut,
    });
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

  async prepare(params: BtcDepositBtcbPrepareParams): Promise<void> {
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

  /**
   * Run whichever authorization ceremony this route needs.
   *
   * The route decides, not the caller: a destination with a fee auth config
   * signs a fee, one without signs its destination address. `authorizeFee()`
   * and `confirmAddress()` were the two halves of this, each guarding against
   * being called on the wrong route — a distinction the caller had to
   * rediscover per destination.
   *
   * Idempotent: calling it at `READY` returns without re-signing, so a retry
   * after a partial failure and a double-click both cost one signature.
   */
  async authorize(): Promise<void> {
    this.assertStatus(
      [
        BtcActionStatus.NEEDS_FEE_AUTHORIZATION,
        BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION,
        BtcActionStatus.READY,
      ],
      'authorize',
    );

    if (this.status === BtcActionStatus.READY) return;

    const recipient = this.ensureRecipient();
    const feeAuthConfig = this.feeAuthConfig;

    if (feeAuthConfig) {
      // The minting fee is read during prepare(); authorizing without it would
      // sign whatever happened to be in scope.
      if (!this.authState.mintingFee) {
        throw new LombardError(
          ValidationErrorCode.INVALID_STATE,
          'Minting fee not available. Call prepare() first.',
        );
      }
      const fee = this.authState.mintingFee;

      return this.act(async () => {
        const result = await feeAuthConfig.authorizeFee(this.ctx, {
          chainId: this.chainId,
          recipient,
          fee,
          // False while the signature is about to travel with
          // generateDepositAddress, which registers it server-side.
          // Registering it twice reads as a reuse of the same approval.
          storeSignature: Boolean(this._depositAddress),
        });

        this.authState.signature = result.signature;
        this.authState.typedData = result.typedData;
        this.authState.authorized = true;
      }, BtcActionStatus.READY);
    }

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

  /**
   * @deprecated Use {@link authorize} instead, which picks the ceremony from
   * the route. Removed in 7.0.0.
   *
   * Kept behaviourally identical, including the guard: calling this on a route
   * that needs no fee still throws rather than silently signing an address.
   */
  async authorizeFee(): Promise<void> {
    if (
      this.status === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION ||
      (this.status !== BtcActionStatus.READY && !this.feeAuthConfig)
    ) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'Fee authorization is not required for this destination chain. Use confirmAddress() instead.',
      );
    }

    this.assertStatus(
      [BtcActionStatus.NEEDS_FEE_AUTHORIZATION, BtcActionStatus.READY],
      'authorizeFee',
    );

    return this.authorize();
  }

  /**
   * @deprecated Use {@link authorize} instead, which picks the ceremony from
   * the route. Removed in 7.0.0.
   *
   * Kept behaviourally identical, including the guard: calling this on a route
   * that needs a fee still throws rather than signing the wrong thing.
   */
  async confirmAddress(): Promise<void> {
    if (this.feeAuthConfig && this.status !== BtcActionStatus.READY) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'This destination chain requires fee authorization. Use authorizeFee() instead.',
      );
    }

    this.assertStatus(
      [BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION, BtcActionStatus.READY],
      'confirmAddress',
    );

    return this.authorize();
  }

  async execute(): Promise<{ depositAddress: string; txHash?: string }> {
    return this.executeImpl();
  }

  async monitorDeposit(): Promise<MonitorProgress | undefined> {
    return super.monitorDeposit();
  }
}
