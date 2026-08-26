/**
 * BTC StakeAndDeploy Action
 *
 * Handles BTC → LBTC → Vault deposit in a single atomic operation.
 * Also known as "Stake and Bake".
 *
 * @module chains/btc/actions/deploy-lbtc/BtcDeployLbtc
 */

import type { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { isValidChain } from '../../../../common/chains';
import { AssetId, parseChainIdentifier, StepStatus } from '../../../../core';
import type { RouteLabel } from '../../../../core/actions';
import { deriveRouteLabel } from '../../../../core/actions';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type { ActionEventMap } from '../../../../shared/events';
import {
  monitorDeposit,
  type MonitorProgress,
} from '../../../../shared/monitoring';
import { Token } from '../../../../tokens/token-addresses';
import { ensureNotSanctionedAddress } from '../../../../utils/ensureNotSanctionedAddress';
import { toSatoshi } from '../../../../utils/satoshi';
import {
  assetIdToToken,
  BaseBtcAction,
  type BtcAuthorizeOptions,
  type StatusConfig,
  type StepDefinition,
} from '../shared';
import {
  getVaultKey,
  isAssetOutSupported,
  isDestChainSupported,
  isProtocolSupported,
  isRouteAvailable,
  stakeAndDeployConfig,
} from './config';
import {
  BtcActionStatus,
  type BtcDeployLbtc as IBtcDeployLbtc,
  type BtcDeployLbtcParams,
  type BtcDeployLbtcPrepareParams,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AuthState {
  fee?: string;
  signature?: string;
  typedData?: string;
  authorized: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// BtcDeployLbtc Implementation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC StakeAndDeploy Action
 *
 * Combines staking and vault deployment in a single atomic operation.
 *
 * @example
 * ```typescript
 * const stakeAndDeploy = new BtcDeployLbtc(ctx, {
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 *   protocol: DeployProtocol.Veda,
 * });
 *
 * await stakeAndDeploy.prepare({ amount: '0.1', recipient: '0x...' });
 * await stakeAndDeploy.authorizeDeposit();
 * const address = await stakeAndDeploy.generateDepositAddress();
 * ```
 */
export class BtcDeployLbtc
  extends BaseBtcAction<ActionEventMap, BtcActionStatus, BtcDeployLbtcParams>
  implements IBtcDeployLbtc
{
  private readonly chainId: ChainId;
  private readonly authState: AuthState = { authorized: false };

  constructor(ctx: BtcCoreContext, params: BtcDeployLbtcParams) {
    super(ctx, params, BtcActionStatus.IDLE);

    // Validate assetOut - StakeAndDeploy should only produce LBTC
    if (!isAssetOutSupported(params.assetOut)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Asset ${params.assetOut} is not supported for stake and deploy. ` +
          `StakeAndDeploy produces LBTC which is then deployed to a vault.`,
      );
    }

    if (!isDestChainSupported(params.destChain)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Destination chain ${params.destChain} is not supported for stake and deploy`,
      );
    }

    if (!isProtocolSupported(params.protocol)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Protocol ${params.protocol} is not supported for stake and deploy`,
      );
    }

    // `assetIn` selects the DEFI_REGISTRY entry, and therefore the amount
    // strategy. The only correct value here is native BTC, which maps to
    // `btcToLbtc` and applies the BTC/LBTC ratio. Passing anything else — most
    // plausibly AssetId.LBTC, since AssetId.LBTC and Token.LBTC are the same
    // string — silently selects `identity` and authorises the raw satoshi
    // amount instead of the ratio-adjusted one. Reject it rather than sign it.
    if (params.assetIn !== undefined && params.assetIn !== AssetId.BTC) {
      throw new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `assetIn must be ${AssetId.BTC} for stake and deploy (received ${params.assetIn}). ` +
          `The source asset determines the amount conversion; any other value would ` +
          `authorize an incorrect amount.`,
      );
    }

    if (!isRouteAvailable(params.sourceChain, ctx.env)) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: ctx.env,
      });
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
    return stakeAndDeployConfig.addressSchema;
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
      depositing: StepStatus.IDLE,
    };
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
      // Stake and bake uses signatureData (maps to sb_signature_data), not eip712Data
      signatureData: this.authState.typedData,
      partnerId: this.ctx.partner.getPartnerId(),
      referrerCode: this._referralCode,
      captchaToken,
    };
  }

  /**
   * Get expected token for this action (LBTC by default for StakeAndDeploy)
   */
  protected getExpectedToken(): string {
    return assetIdToToken(this.params.assetOut, Token.LBTC);
  }

  protected getAuthRequiredMessage(): string {
    return 'Deposit authorization required. Call authorizeDeposit() first.';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Getters
  // ─────────────────────────────────────────────────────────────────────────

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
      assetIn: this.params.assetIn ?? AssetId.BTC,
      protocol: this.params.protocol,
    });
  }

  /** Get stake and bake fee (available after prepare()) */
  get fee(): string | undefined {
    return this.authState.fee;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────

  async prepare(params: BtcDeployLbtcPrepareParams): Promise<void> {
    this.assertStatus(BtcActionStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = this.validatePrepareParams(params);

      this._amount = validated.amount;
      this._recipient = validated.recipient;
      this._referralCode = validated.referralCode;

      // Get fee for stake and bake
      this.authState.fee = await stakeAndDeployConfig.getStakeAndBakeFee(
        this.ctx,
        this.chainId,
        this.params.protocol,
      );

      // Check for existing deposit address (resume flow)
      const hasExistingDeposit = await this.resumeFromExistingDeposit(
        validated.recipient,
      );

      if (hasExistingDeposit) {
        // We have a deposit address - check if stake and bake signature is still valid
        const stored = await stakeAndDeployConfig.restoreStakeAndBakeSignature(
          this.ctx,
          this.chainId,
          validated.recipient,
        );

        // `hasSignature` is reported true when the API returns only metadata
        // (an expiry, an amount) without the signature string — see
        // restoreStakeAndBakeSignature. Treating that as authorized meant
        // generateDepositAddress later posted `signature: undefined` to the
        // deposit-address endpoint. Require the signature itself.
        // NOTE: the endpoint does not return typedData, so `signatureData`
        // stays undefined on this path. That is pre-existing and accepted —
        // the deposit-address API treats it as optional — but it is the reason
        // the signature string itself must be present.
        if (stored?.hasSignature && stored.signature) {
          this.authState.signature = stored.signature;
          this.authState.authorized = true;
          this.updateStatus(BtcActionStatus.ADDRESS_READY);
          this.emitInitialProgress();
          return;
        }

        // Deposit exists but signature expired/missing - need re-authorization
        this.updateStatus(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
        this.emitInitialProgress();
        return;
      }

      // No existing deposit - check if there's a valid signature anyway
      // (signature was created but deposit address not yet generated)
      const existingSignature =
        await stakeAndDeployConfig.restoreStakeAndBakeSignature(
          this.ctx,
          this.chainId,
          validated.recipient,
        );

      // Same requirement as the resume branch above: metadata alone is not an
      // authorization. Without the signature string we must re-authorize rather
      // than advance to READY and post an empty signature.
      if (existingSignature?.hasSignature && existingSignature.signature) {
        this.authState.signature = existingSignature.signature;
        this.authState.authorized = true;
        this.updateStatus(BtcActionStatus.READY);
        this.emitInitialProgress();
        return;
      }

      // No existing signature - require authorization
      this.updateStatus(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
      this.emitInitialProgress();
    });
  }

  /**
   * Run the vault-deposit authorization ceremony.
   *
   * Renamed from `authorizeDeposit()`, which stays as a deprecated delegator.
   * The name matches every other action now that the four ceremony methods
   * across the BTC classes have collapsed into one per class.
   *
   * @param options - Signing overrides. `expiry` sets the signature expiration
   * as an absolute UNIX timestamp in seconds, defaulting to 24 hours.
   */
  async authorize(options?: BtcAuthorizeOptions): Promise<void> {
    // ADDRESS_READY is reachable straight out of prepare() when a deposit
    // address and a valid signature already exist on the server. Rejecting it
    // here meant the sequence in this class's own JSDoc — prepare, then
    // authorizeDeposit — threw INVALID_STATE for every returning user.
    // Authorization is already done in that state, so this is a no-op.
    this.assertStatus(
      [
        BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION,
        BtcActionStatus.READY,
        BtcActionStatus.ADDRESS_READY,
      ],
      'authorize',
    );

    if (
      this.status === BtcActionStatus.READY ||
      this.status === BtcActionStatus.ADDRESS_READY
    ) {
      return;
    }

    const recipient = this.ensureRecipient();
    const amount = this.ensureAmount();

    return this.act(async () => {
      const amountSats = toSatoshi(amount);

      // For BTC → LBTC stake and bake, use AssetId.BTC to trigger ratio conversion.
      // The DEFI_REGISTRY maps 'BTC' to { amountStrategy: 'btcToLbtc' } which divides
      // the BTC amount by BTCTokenRatio to get the correct LBTC amount for the signature.
      // This is critical because the backend expects the ratio-adjusted amount.
      //
      // Note: assetIn is optional but for BtcDeployLbtc, the source is always
      // native BTC since we're receiving deposits on the Bitcoin blockchain.
      const sourceToken = this.params.assetIn ?? AssetId.BTC;

      const result = await stakeAndDeployConfig.authorizeStakeAndBake(
        this.ctx,
        {
          chainId: this.chainId,
          recipient,
          amount: amountSats.toString(),
          vaultKey: getVaultKey(this.params.protocol),
          token: sourceToken,
          // undefined lets signStakeAndBake apply its own 24h default
          expiry: options?.expiry,
          storeSignature: Boolean(this._depositAddress),
        },
      );

      this.authState.signature = result.signature;
      this.authState.typedData = result.typedData;
      this.authState.authorized = true;
    }, BtcActionStatus.READY);
  }

  /**
   * @deprecated Use {@link authorize} instead. Removed in 7.0.0.
   */
  async authorizeDeposit(options?: BtcAuthorizeOptions): Promise<void> {
    return this.authorize(options);
  }

  async generateDepositAddress(captchaToken?: string): Promise<string> {
    // Return an address we already hold before asserting status. The resume
    // path leaves the action in ADDRESS_READY with the address in hand, so
    // asserting READY first made this throw instead of returning it — the
    // second half of the same defect fixed in authorizeDeposit above.
    if (this._depositAddress) {
      return this._depositAddress;
    }

    this.assertStatus(BtcActionStatus.READY, 'generateDepositAddress');
    this.ensureAuthorized();

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
          depositing: StepStatus.IDLE,
        },
        metadata: { depositAddress },
      });

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
          (deposit) => deposit.depositAddress === depositAddress,
        );

        if (!ourDeposit) {
          return undefined;
        }

        return {
          blockHeight: ourDeposit.blockHeight,
          isClaimed: ourDeposit.isClaimed,
        };
      },
      onProgress: (p) => {
        this.emitProgress({
          status: this.status,
          steps: {
            created: StepStatus.COMPLETE,
            verifying: p.hasEnoughConfirmations
              ? StepStatus.COMPLETE
              : StepStatus.PENDING,
            issuing: p.isClaimed ? StepStatus.COMPLETE : StepStatus.PENDING,
            depositing: StepStatus.PENDING,
          },
          confirmations: p.confirmations,
          requiredConfirmations: p.requiredConfirmations,
          metadata: { isClaimed: p.isClaimed },
        });
      },
      onComplete: () => {
        this.emitCompleted();
      },
    });

    return progress;
  }
}
