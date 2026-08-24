/**
 * Base BTC Action Class
 *
 * Provides common functionality for all BTC actions:
 * - State management (amount, recipient, depositAddress, referralCode)
 * - Ensure methods for validation
 * - Bitcoin network helpers
 * - Deposit monitoring
 * - Bitcoin send operations
 * - Common validation and prepare patterns
 *
 * @module chains/btc/actions/shared/BaseBtcAction
 */

import { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../../../common/chains';
import { Chain, StepStatus } from '../../../../core';
import type { ActionStepKey } from '../../../../core/actions/steps';
import { BaseAction } from '../../../../shared/actions';
import type { BtcCoreContext } from '../../../../shared/context';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';
import type {
  MonitorProgress,
  NetworkMode,
} from '../../../../shared/monitoring';
import { monitorDeposit } from '../../../../shared/monitoring';
import type { EventHandler } from '../../../../shared/monitoring/createEventEmitter';
import {
  btcStakeAmountSchema,
  referralCodeSchema,
  validatePrepareParams as zodValidate,
} from '../../../../shared/validation';
import { ensureNotSanctionedAddress } from '../../../../utils/ensureNotSanctionedAddress';
import { toSatoshi } from '../../../../utils/satoshi';
import type { BtcAuthorizeOptions } from './routeConfig';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common authorization state for BTC actions
 */
export interface BtcAuthorizationState {
  authorized: boolean;
  signature?: string;
  typedData?: unknown;
  [key: string]: unknown;
}

/**
 * Common params that all BTC actions share
 */
export interface BaseBtcParams {
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
  destChain: Chain;
}

/**
 * Common prepare params
 */
export interface BasePrepareParams {
  amount: string;
  recipient: string;
  referralCode?: string;
}

/**
 * @deprecated Renamed to {@link BtcAuthorizeOptions}, which every BTC action's
 * `authorize()` takes now that the four ceremony methods collapsed into one per
 * class. Identical shape; removed in the next major.
 */
export type AuthorizeDepositOptions = BtcAuthorizeOptions;

/**
 * Progress step definitions
 */
export type StepDefinition = Record<string, StepStatus>;

/**
 * Status configuration for template methods
 */
export interface StatusConfig<TStatus extends string> {
  idle: TStatus;
  ready: TStatus;
  addressReady: TStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// Base Class
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base class for BTC actions
 *
 * Provides template methods for common patterns:
 * - prepare() with validation and resume
 * - generateDepositAddress()
 * - execute()
 * - monitorDeposit()
 *
 * Subclasses implement abstract methods to customize behavior.
 *
 * @example
 * ```typescript
 * class BtcStake extends BaseBtcAction<StakeEventMap, BtcActionStatus, BtcStakeParams> {
 *   protected getAddressSchema() { return evmAddressSchema; }
 *   protected getStatusConfig() { return { idle: BtcActionStatus.IDLE, ... }; }
 *   protected getInitialSteps() { return { created: StepStatus.IDLE, ... }; }
 * }
 * ```
 */
export abstract class BaseBtcAction<
  TEventMap extends Record<string, EventHandler<unknown[]>>,
  TStatus extends string,
  TParams extends BaseBtcParams,
> extends BaseAction<TEventMap, TStatus> {
  // ─────────────────────────────────────────────────────────────────────────
  // Common State
  // ─────────────────────────────────────────────────────────────────────────

  protected _amount?: string;
  protected _recipient?: string;
  protected _depositAddress?: string;
  protected _referralCode?: string;
  protected _chainId?: unknown;

  constructor(
    protected readonly ctx: BtcCoreContext,
    protected readonly params: TParams,
    initialStatus: TStatus,
  ) {
    super(initialStatus);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Abstract Methods - Subclasses Must Implement
  // ─────────────────────────────────────────────────────────────────────────

  /** Get the address validation schema for this action */
  /**
   * A Bitcoin-source route uses every step.
   *
   * `awaitingFunds` is the state that has no equivalent on a chain-source
   * route: the deposit address exists and the SDK is waiting for the user to
   * send Bitcoin, which it cannot do for them. `settling` covers the
   * notarisation that follows the deposit confirming.
   */
  protected override routeSteps(): readonly ActionStepKey[] {
    return ['awaitingFunds', 'submitting', 'confirming', 'settling'];
  }

  protected abstract getAddressSchema(): z.ZodType<string>;

  /** Get the status configuration for template methods */
  protected abstract getStatusConfig(): StatusConfig<TStatus>;

  /** Get the initial progress steps for this action */
  protected abstract getInitialSteps(): StepDefinition;

  /** Check if the action has been authorized */
  protected abstract isAuthorized(): boolean;

  /** Get the chain ID (after parsing in constructor) */
  protected abstract getChainId():
    | ChainId
    | SuiChain
    | SolanaChain
    | StarknetChainId;

  /**
   * Get API params for generateDepositAddress
   * Subclasses provide action-specific parameters
   */
  protected abstract getDepositAddressParams(captchaToken?: string): {
    address: string;
    chainId: ChainId | SuiChain | SolanaChain | StarknetChainId;
    signature: string;
    token: string;
    eip712Data?: string;
    signatureData?: string;
    pubKey?: string;
    partnerId?: string;
    referrerCode?: string;
    captchaToken?: string;
  };

  /**
   * Get the expected destination token (LBTC, BTCb, etc.)
   * Used for resuming from existing deposits before authorization is complete
   */
  protected abstract getExpectedToken(): string;

  // ─────────────────────────────────────────────────────────────────────────
  // Common Getters
  // ─────────────────────────────────────────────────────────────────────────

  /** Amount of BTC to stake/deposit */
  get amount(): string | undefined {
    return this._amount;
  }

  /** Recipient address on destination chain */
  get recipient(): string | undefined {
    return this._recipient;
  }

  /** Generated Bitcoin deposit address */
  get depositAddress(): string | undefined {
    return this._depositAddress;
  }

  /** Referral code (optional) */
  get referralCode(): string | undefined {
    return this._referralCode;
  }

  /**
   * The Bitcoin chain this action reads from, resolved from the environment
   * when the caller omitted it.
   *
   * `sourceChain` is optional, and reading `this.params.sourceChain` raw meant a
   * caller who omitted it on `prod` monitored the Bitcoin **testnet** — waiting
   * for confirmations that could never arrive. Route validation also passed
   * vacuously in that case. Resolving once, here, keeps every consumer
   * (validation, monitoring, deposit lookup) on the same answer.
   */
  protected get resolvedSourceChain(): Chain {
    return (
      this.params.sourceChain ??
      (this.ctx.env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET)
    );
  }

  /** Bitcoin network mode for monitoring */
  protected get bitcoinNetwork(): NetworkMode {
    return this.resolvedSourceChain === Chain.BITCOIN_MAINNET
      ? 'mainnet'
      : 'testnet';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Common Validation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the prepare schema (amount + recipient + referralCode)
   * Uses abstract getAddressSchema() for chain-specific validation
   */
  protected get prepareSchema() {
    return z.object({
      amount: btcStakeAmountSchema,
      recipient: this.getAddressSchema(),
      referralCode: referralCodeSchema,
    });
  }

  /**
   * Validate prepare params using Zod
   * Subclasses can override if they need custom validation
   */
  protected validatePrepareParams(
    params: BasePrepareParams,
  ): BasePrepareParams {
    return zodValidate(this.prepareSchema, params, {
      destChain: this.params.destChain,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ensure Methods (throw if missing)
  // ─────────────────────────────────────────────────────────────────────────

  protected ensureRecipient(): string {
    if (!this._recipient) {
      throw LombardError.missingParameter('recipient');
    }
    return this._recipient;
  }

  protected ensureAmount(): string {
    if (!this._amount) {
      throw LombardError.missingParameter('amount');
    }
    return this._amount;
  }

  protected ensureDepositAddress(): string {
    if (!this._depositAddress) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'Deposit address not generated. Call generateDepositAddress() first.',
      );
    }
    return this._depositAddress;
  }

  /**
   * Get error message for missing authorization
   * Subclasses can override to provide specific messages
   */
  protected getAuthRequiredMessage(): string {
    return 'Authorization required. Complete the authorization step first.';
  }

  protected ensureAuthorized(): void {
    if (!this.isAuthorized()) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        this.getAuthRequiredMessage(),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Common Resume Logic
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Try to resume from an existing deposit address
   *
   * This method only stores the deposit address if found.
   * It does NOT update the status - the caller must do that
   * after performing any additional validation (e.g., fee authorization).
   *
   * @param recipient - The recipient address to check
   * @returns true if a deposit address was found, false otherwise
   */
  protected async resumeFromExistingDeposit(
    recipient: string,
  ): Promise<boolean> {
    try {
      const depositAddress = await this.ctx.api.getDepositAddress({
        address: recipient,
        chainId: this.getChainId(),
        token: this.getExpectedToken(),
        partnerId: this.ctx.partner.getPartnerId(),
      });

      if (!depositAddress) {
        return false;
      }

      this._depositAddress = depositAddress;
      // NOTE: Status is NOT updated here - caller must set appropriate status
      // after validating fee authorization (which may have expired)
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Common Generate Deposit Address
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a Bitcoin deposit address
   *
   * Template method that:
   * 1. Validates status and authorization
   * 2. Calls API to generate address
   * 3. Updates state and emits progress
   *
   * Subclasses must implement getDepositAddressParams() to provide API params.
   */
  protected async generateDepositAddressImpl(
    captchaToken?: string,
  ): Promise<string> {
    const statusConfig = this.getStatusConfig();

    this.assertStatus(statusConfig.ready, 'generateDepositAddress');
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

      // Emit progress with address ready
      const steps = this.getInitialSteps();
      const addressReadySteps = Object.fromEntries(
        Object.entries(steps).map(([key], index) => [
          key,
          index === 0 ? StepStatus.COMPLETE : StepStatus.IDLE,
        ]),
      );

      this.emitProgress({
        status: statusConfig.addressReady,
        steps: addressReadySteps,
        metadata: { depositAddress },
      });

      return depositAddress;
    }, statusConfig.addressReady);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Common Execute Pattern
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute the action - generate address and optionally send BTC
   *
   * Template method that:
   * 1. Ensures deposit address exists
   * 2. Tries to send BTC if provider available
   * 3. Returns result
   */
  protected async executeImpl(): Promise<{
    depositAddress: string;
    txHash?: string;
  }> {
    const statusConfig = this.getStatusConfig();

    return this.act(async () => {
      this.assertStatus(statusConfig.addressReady, 'execute');

      if (!this._depositAddress) {
        await this.generateDepositAddressImpl();
      }

      const depositAddress = this.ensureDepositAddress();
      const txHash = await this.trySendBitcoin(depositAddress);

      return txHash ? { depositAddress, txHash } : { depositAddress };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Common Progress Emission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Emit initial progress with action-specific steps
   */
  protected emitInitialProgress(): void {
    this.emitProgress({
      status: this.status,
      steps: this.getInitialSteps(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Deposit Monitoring
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Monitor Bitcoin deposit progress
   */
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
          steps: p.steps,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Bitcoin Send (Optional)
  // ─────────────────────────────────────────────────────────────────────────

  protected async trySendBitcoin(
    depositAddress: string,
  ): Promise<string | undefined> {
    const amount = this._amount;
    if (!amount) return undefined;

    try {
      const btcProvider = await this.ctx.getProvider('bitcoin');
      if (!btcProvider) return undefined;

      const provider = btcProvider as {
        sendBitcoin?: (address: string, amountSats: number) => Promise<string>;
      };

      if (provider.sendBitcoin) {
        const amountSats = toSatoshi(amount).toNumber();
        return provider.sendBitcoin(depositAddress, amountSats);
      }
    } catch {
      // Fall back to manual send
    }

    return undefined;
  }
}
