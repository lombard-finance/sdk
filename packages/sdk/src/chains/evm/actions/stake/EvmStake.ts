/**
 * EVM Stake Action
 *
 * Stakes BTC.b to receive LBTC via the Asset Router.
 * This is the EVM equivalent of staking - converting wrapped BTC to LBTC.
 *
 * ## Approval (Avalanche only)
 *
 * On Avalanche, users must approve the Adapter contract to spend their BTC.b.
 *
 * ## Fee Authorization (Ethereum/Sepolia only)
 *
 * Fee authorization is required on unsubsidized chains (Ethereum, Sepolia).
 * On subsidized chains (Avalanche, Base, BSC), no fee auth is required.
 *
 * **Flow with approval (Avalanche):**
 * IDLE → NEEDS_APPROVAL → READY → COMPLETED
 *
 * **Flow with fee auth (Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Flow without either (Base, BSC):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/stake/EvmStake
 */

import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import { ChainId } from '../../../../common/chains';
import {
  approveToken,
  getTokenAllowance,
} from '../../../../contract-functions/approveToken';
import { depositToken } from '../../../../contract-functions/deposit';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { StakeEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { AddressKind, Token } from '../../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../../tokens/tokens';
import {
  authorizeFee as authorizeFeeShared,
  checkFeeAuthorization,
  createInitialFeeAuthState,
  type FeeAuthState,
} from '../../shared/feeAuth';
import type { EvmStakeParams, EvmStakePrepareParams, IEvmStake } from './types';

/**
 * Chains that require ERC20 approval for BTC.b staking (to the Adapter)
 */
const APPROVAL_REQUIRED_CHAINS: readonly ChainId[] = [
  ChainId.avalanche,
  ChainId.avalancheFuji,
] as const;

function requiresApproval(chainId: ChainId): boolean {
  return APPROVAL_REQUIRED_CHAINS.includes(chainId);
}

export class EvmStake
  extends BaseAction<StakeEventMap, EvmOperationStatus>
  implements IEvmStake
{
  private _amount?: string;
  private _txHash?: string;
  private _feeAuth: FeeAuthState = createInitialFeeAuthState();
  private _account?: `0x${string}`;
  private _needsApproval = false;
  private _spenderAddress?: `0x${string}`;

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmStakeParams,
  ) {
    super(EvmOperationStatus.IDLE);
  }

  get amount(): string | undefined {
    return this._amount;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  /** Fee authorization state (for UI display) */
  get feeAuth(): FeeAuthState {
    return this._feeAuth;
  }

  /** Whether approval is needed */
  get needsApproval(): boolean {
    return this._needsApproval;
  }

  async prepare(params: EvmStakePrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params);
      this._amount = validated.amount;

      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const account = (accounts as string[])[0] as `0x${string}`;

      if (!account) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }
      this._account = account;

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Check if approval is required (Avalanche only)
      if (requiresApproval(chainId)) {
        // Get the Adapter address (spender for approval)
        const adapterInfo = await getTokenContractInfo(
          Token.BTCb,
          chainId,
          this.ctx.env,
          AddressKind.Adapter,
        );
        this._spenderAddress = adapterInfo.address;

        // Check current allowance
        const allowance = await getTokenAllowance({
          token: Token.BTCb,
          owner: account,
          spender: adapterInfo.address,
          chainId,
          env: this.ctx.env,
        });

        const requiredAmount = new BigNumber(validated.amount);
        this._needsApproval = allowance.isLessThan(requiredAmount);

        if (this._needsApproval) {
          this.emitProgress({
            status: EvmOperationStatus.NEEDS_APPROVAL,
            steps: { approval: StepStatus.PENDING, staking: StepStatus.IDLE },
          });
          this.updateStatus(EvmOperationStatus.NEEDS_APPROVAL);
          return;
        }
      }

      // Check fee authorization status (BTC.b → LBTC uses Token.LBTC for fee signature)
      const feeAuthResult = await checkFeeAuthorization(
        chainId,
        account,
        this.ctx.env,
        Token.LBTC,
      );

      // Update fee auth state
      this._feeAuth = {
        requiresAuth: feeAuthResult.requiresAuth,
        isAuthorized: feeAuthResult.hasValidSignature,
        feeInSatoshis: feeAuthResult.feeInSatoshis,
        feeFormatted: feeAuthResult.feeFormatted,
        expirationDate: feeAuthResult.expirationDate,
      };

      // Determine next status based on fee auth
      const needsFeeAuth =
        feeAuthResult.requiresAuth && !feeAuthResult.hasValidSignature;

      if (needsFeeAuth) {
        this.emitProgress({
          status: EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
          steps: { staking: StepStatus.IDLE },
        });
        this.updateStatus(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
      } else {
        this.emitProgress({
          status: EvmOperationStatus.READY,
          steps: { staking: StepStatus.PENDING },
        });
        this.updateStatus(EvmOperationStatus.READY);
      }
    });
  }

  /**
   * Approve BTC.b spending (Avalanche only)
   *
   * Must be called when status is NEEDS_APPROVAL.
   */
  async approve(): Promise<void> {
    this.assertStatus(EvmOperationStatus.NEEDS_APPROVAL, 'approve');

    return this.act(async () => {
      if (!this._account || !this._spenderAddress || !this._amount) {
        throw LombardError.missingParameter(
          'account, spenderAddress, or amount',
        );
      }

      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Execute approval transaction
      await approveToken({
        account: this._account,
        token: Token.BTCb,
        spender: this._spenderAddress,
        amount: this._amount,
        chainId,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
      });

      // Mark approval as done
      this._needsApproval = false;

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, staking: StepStatus.PENDING },
      });
    }, EvmOperationStatus.READY);
  }

  async authorizeFee(): Promise<void> {
    this.assertStatus(
      EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
      'authorizeFee',
    );

    return this.act(async () => {
      if (!this._feeAuth.feeInSatoshis) {
        throw LombardError.missingParameter('feeInSatoshis');
      }

      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Sign and store the fee authorization
      await authorizeFeeShared({
        chainId,
        account: this._account!,
        feeInSatoshis: this._feeAuth.feeInSatoshis,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
        token: Token.LBTC, // BTC.b → LBTC uses LBTC token for fee signature
      });

      // Update fee auth state
      this._feeAuth = {
        ...this._feeAuth,
        isAuthorized: true,
      };

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { staking: StepStatus.PENDING },
      });
    }, EvmOperationStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(EvmOperationStatus.READY, 'execute');

    return this.act(async () => {
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Get account from provider
      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const account = (accounts as string[])[0] as `0x${string}`;

      if (!account) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { staking: StepStatus.PENDING },
      });

      // Execute BTC.b → LBTC via Asset Router
      const txHash = await depositToken({
        amount: this._amount!,
        tokenIn: Token.BTCb,
        tokenOut: Token.LBTC,
        account,
        chainId,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { staking: StepStatus.COMPLETE },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
    });
  }
}
