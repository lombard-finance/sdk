/**
 * BTC Stake Action
 *
 * A configuration-driven action that handles BTC → LBTC staking
 * to any supported destination chain. Chain-specific logic is delegated
 * to ChainConfig objects in the config/ folder.
 *
 * @module chains/btc/actions/stake/BtcStake
 */

import type { z } from 'zod';

import type {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../../../common/chains';
import {
  getChainType,
  parseChainIdentifier,
  StepStatus,
} from '../../../../core';
import { BtcActionStatus } from '../../../../shared/constants/statusConstants';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type { StakeEventMap } from '../../../../shared/events';
import type { MonitorProgress } from '../../../../shared/monitoring';
import { Token } from '../../../../tokens/token-addresses';
import { ensureNotSanctionedAddress } from '../../../../utils/ensureNotSanctionedAddress';
import {
  assetIdToToken,
  BaseBtcAction,
  type StatusConfig,
  type StepDefinition,
} from '../shared';
import {
  type ChainConfig,
  type FeeAuthConfig,
  getChainConfig,
  isAssetOutSupported,
  isDestChainSupported,
  isRouteAvailable,
  type SignatureResult,
} from './config';
import type { BtcStake as IBtcStake, BtcStakeParams } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type AnyChainId = ChainId | SolanaChain | SuiChain | StarknetChainId;

interface AuthorizationState {
  mintingFee?: string;
  networkFee?: {
    signature: string;
    typedData?: string;
  };
  destinationSignature?: SignatureResult;
  authorized: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// BtcStake Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC Stake Action
 *
 * Handles BTC → LBTC staking to any supported destination chain.
 * Uses configuration-driven design for chain-specific logic.
 *
 * @example
 * ```typescript
 * const stake = new BtcStake(ctx, {
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 * });
 *
 * await stake.prepare({ amount: '0.1', recipient: '0x...' });
 * await stake.authorize();
 * const address = await stake.generateDepositAddress();
 * ```
 */
export class BtcStake
  extends BaseBtcAction<StakeEventMap, BtcActionStatus, BtcStakeParams>
  implements IBtcStake
{
  private readonly config: ChainConfig;
  private readonly chainId: AnyChainId;
  private readonly authState: AuthorizationState = { authorized: false };

  /** Fee auth config - null if not required for this destination */
  private feeAuthConfig: FeeAuthConfig | null = null;

  constructor(ctx: BtcCoreContext, params: BtcStakeParams) {
    super(ctx, params, BtcActionStatus.IDLE);

    const chainType = getChainType(params.destChain);
    const config = getChainConfig(chainType);

    if (!config) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Unsupported destination chain type: ${chainType} (${params.destChain})`,
      );
    }

    // Validate assetOut - BTC Stake should only produce LBTC
    if (!isAssetOutSupported(config, params.assetOut)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Asset ${params.assetOut} is not supported for BTC staking. ` +
          `BTC Stake produces LBTC. For BTC.b, use BtcDeposit instead.`,
      );
    }

    if (!isDestChainSupported(config, params.destChain)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Destination chain ${params.destChain} is not supported for ${chainType}`,
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
    this.chainId = parseChainIdentifier(params.destChain);
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

  protected getDepositAddressParams(captchaToken?: string) {
    const recipient = this.ensureRecipient();
    const signature = this.getActiveSignature();

    if (!signature) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'Missing signature. Complete authorization first.',
      );
    }

    return {
      address: signature.paddedAddress ?? recipient,
      chainId: this.chainId,
      signature: signature.signature,
      token: this.getExpectedToken(),
      eip712Data: this.authState.networkFee?.typedData,
      pubKey: signature.pubKey,
      partnerId: this.ctx.partner.getPartnerId(),
      referrerCode: this._referralCode,
      captchaToken,
    };
  }

  /**
   * Get expected token for this action (LBTC by default for BTC Stake)
   */
  protected getExpectedToken(): string {
    return assetIdToToken(this.params.assetOut, Token.LBTC);
  }

  protected getAuthRequiredMessage(): string {
    return 'Authorization required. Call authorize() first.';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Getters
  // ─────────────────────────────────────────────────────────────────────────

  /** Get minting fee (available after prepare() for fee-auth chains) */
  get mintingFee(): string | undefined {
    return this.authState.mintingFee;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────

  async prepare(params: {
    amount: string;
    recipient: string;
    referralCode?: string;
  }): Promise<void> {
    this.assertStatus(BtcActionStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = this.validatePrepareParams(params);

      this._amount = validated.amount;
      this._recipient = validated.recipient;
      this._referralCode = validated.referralCode;

      // Get fee auth config for this destination chain (needed for both resume and new flow)
      this.feeAuthConfig = this.config.getFeeAuthConfig(this.params.destChain);

      // Check for existing deposit (resume flow)
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
            this.authState.networkFee = {
              signature: stored.signature,
              typedData: stored.typedData,
            };
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
        // Fee authorization required - try to restore stored signature first
        const stored = await this.feeAuthConfig.restoreFeeSignature(
          this.ctx,
          this.chainId,
          validated.recipient,
        );

        // Check hasSignature flag - the actual signature string may not be returned by API
        if (stored?.hasSignature) {
          // Fee auth already exists on server - store signature if available
          if (stored.signature) {
            this.authState.networkFee = {
              signature: stored.signature,
              typedData: stored.typedData,
            };
          }
          this.authState.authorized = true;
          this.updateStatus(BtcActionStatus.READY);
          this.emitInitialProgress();
          return;
        }

        // Get minting fee for display
        this.authState.mintingFee = await this.feeAuthConfig.getMintingFee(
          this.ctx,
          this.chainId,
        );
        this.updateStatus(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
      } else {
        // No fee auth required - go to address confirmation
        this.updateStatus(BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION);
      }

      this.emitInitialProgress();
    });
  }

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
    const needsFeeAuth = this.feeAuthConfig !== null;

    return this.act(async () => {
      if (needsFeeAuth) {
        // Fee authorization flow
        const fee = this.ensureMintingFee();
        const result = await this.feeAuthConfig!.authorizeFee(this.ctx, {
          chainId: this.chainId,
          recipient,
          fee,
          storeSignature: Boolean(this._depositAddress),
        });
        this.authState.networkFee = {
          signature: result.signature,
          typedData: result.typedData,
        };
      } else {
        // Destination signature flow
        this.authState.destinationSignature = await this.config.getSignature(
          this.ctx,
          recipient,
          this.chainId,
        );
      }

      this.authState.authorized = true;
    }, BtcActionStatus.READY);
  }

  async generateDepositAddress(captchaToken?: string): Promise<string> {
    this.assertStatus(BtcActionStatus.READY, 'generateDepositAddress');
    this.ensureAuthorized();

    if (this._depositAddress) {
      return this._depositAddress;
    }

    // If no signature is available locally (fee auth exists on server but wasn't returned),
    // fall back to signing the destination address
    if (!this.getActiveSignature()) {
      const result = await this.config.getSignature(
        this.ctx,
        this.ensureRecipient(),
        this.chainId,
      );
      this.authState.destinationSignature = result;
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
          issuing: StepStatus.IDLE,
        },
        metadata: { depositAddress },
      });

      return depositAddress;
    }, BtcActionStatus.ADDRESS_READY);
  }

  async execute(): Promise<{ depositAddress: string; txHash?: string }> {
    return this.executeImpl();
  }

  async monitorDeposit(): Promise<MonitorProgress | undefined> {
    return super.monitorDeposit();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Ensure Methods
  // ─────────────────────────────────────────────────────────────────────────

  private ensureMintingFee(): string {
    if (!this.authState.mintingFee) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'Minting fee not fetched. Call prepare() first.',
      );
    }
    return this.authState.mintingFee;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Signature Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getActiveSignature(): SignatureResult | undefined {
    if (this.authState.networkFee?.signature) {
      return { signature: this.authState.networkFee.signature };
    }
    return this.authState.destinationSignature;
  }
}
