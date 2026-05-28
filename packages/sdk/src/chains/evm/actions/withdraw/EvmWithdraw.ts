/**
 * EVM Withdraw Action
 *
 * Queues withdrawal of vault shares from DeFi protocols (Veda).
 *
 * Protocol availability:
 * - Veda: Ethereum, Base, BSC, Corn (prod only)
 *
 * Step ordering on BTCe chains (ETH/Base/BSC) when the user's direct LBTCv
 * balance does not cover the requested amount:
 * 1. `approve()` first unwraps just enough BTCe to cover the shortfall, then
 *    approves the withdraw queue. Unwrapping before approving prevents wallets
 *    that cap the displayed approval amount at the user's current token
 *    balance (e.g. OKX) from granting an allowance smaller than the requested
 *    amount.
 * 2. `execute()` delegates to `withdrawEarn`, which sees `allowance ≥ amount`
 *    (set in step 1) and direct LBTCv ≥ amount (after step 1's unwrap), so
 *    it skips its own approve + unwrap and just queues.
 *
 * Protocol routing in execute():
 * - Veda on ETH/Base/BSC (BTCe chains): calls `withdrawEarn`.
 * - Veda on Corn (no BTCe): calls `queueWithdrawInternal` directly.
 *
 * @module chains/evm/actions/withdraw/EvmWithdraw
 */

import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import { makePublicClient } from '../../../../clients/public-client';
import { makeWalletClient } from '../../../../clients/wallet-client';
import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  type ChainId,
} from '../../../../common/chains';
import { withdrawEarn } from '../../../../contract-functions/withdrawEarn';
import type { DeployProtocol } from '../../../../core';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError, WithdrawErrorCode } from '../../../../shared/errors';
import type { WithdrawEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import {
  fromBaseDenomination,
  toBaseDenomination,
} from '../../../../tokens/tokens';
import toBigInt from '../../../../utils/numbers';
import { waitForTransactionReceipt } from '../../../../utils/transaction-executor';
import {
  BTCE_VAULT,
  EARN_VAULT,
  type EarnChain,
  isBtceVaultChain,
  isEarnChain,
} from '../../../../vaults/lib/config';
import { queueWithdrawInternal } from '../../../../vaults/lib/ops/withdraw';
import { evmWithdrawConfig } from './config';
import type {
  EvmWithdrawParams,
  EvmWithdrawPrepareParams,
  IEvmWithdraw,
} from './types';

export class EvmWithdraw
  extends BaseAction<WithdrawEventMap, EvmOperationStatus>
  implements IEvmWithdraw
{
  private _amount?: string;
  private _protocol?: DeployProtocol;
  private _needsApproval = false;
  private _txHash?: string;
  private _account?: `0x${string}`;
  private _chainId?: ChainId;

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmWithdrawParams,
  ) {
    super(EvmOperationStatus.IDLE);
  }

  get amount(): string | undefined {
    return this._amount;
  }

  get protocol(): DeployProtocol | undefined {
    return this._protocol;
  }

  get needsApproval(): boolean {
    return this._needsApproval;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  async prepare(params: EvmWithdrawPrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params);
      this._amount = validated.amount;
      this._protocol = this.params.protocol;

      this.validateProtocol(this.params.protocol);

      // Get provider and account
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
      this._chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Validate chain supports Veda vault
      if (!isEarnChain(this._chainId)) {
        throw new LombardError(
          WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED,
          `Chain ${this.params.sourceChain} does not support Veda vault withdrawals`,
          { chain: this.params.sourceChain, protocol: this._protocol },
        );
      }

      const vault = EARN_VAULT;
      const publicClient = makePublicClient({
        chainId: this._chainId,
        env: this.ctx.env,
        rpcUrl: this.ctx.rpcUrls?.[this._chainId],
      });
      const amount = new BigNumber(validated.amount);

      // Read direct LBTCv balance via the lens contract
      const lbtcvRaw = (await publicClient.readContract({
        address: vault.lensContract.address,
        abi: vault.lensContract.abi,
        functionName: 'balanceOf',
        args: [account, vault.vaultContract.address],
      })) as bigint;
      const lbtcvBalance = fromBaseDenomination(
        String(lbtcvRaw),
        vault.decimals,
      );

      // On BTCe-supported chains also include the BTCe wrapper position so
      // users who deposited via BTCe are not incorrectly rejected.
      let totalBalance = lbtcvBalance;
      if (isBtceVaultChain(this._chainId)) {
        const btceRaw = (await publicClient.readContract({
          address: BTCE_VAULT.contracts[this._chainId],
          abi: BTCE_VAULT.abi,
          functionName: 'balanceOf',
          args: [account],
        })) as bigint;
        const btceBalance = fromBaseDenomination(
          String(btceRaw),
          vault.decimals,
        );
        totalBalance = lbtcvBalance.plus(btceBalance);
      }

      if (amount.isGreaterThan(totalBalance)) {
        throw new LombardError(
          WithdrawErrorCode.INSUFFICIENT_SHARES,
          `Insufficient vault shares. Requested: ${amount.toFixed()}, Available: ${totalBalance.toFixed()}`,
          { requested: amount.toFixed(), available: totalBalance.toFixed() },
        );
      }

      // Check LBTCv allowance to withdraw queue contract
      const allowanceRaw = await publicClient.readContract({
        address: vault.vaultContract.address,
        abi: vault.vaultContract.abi,
        functionName: 'allowance',
        args: [account, vault.withdrawQueueContracts[this._chainId].address],
      });
      const allowance = fromBaseDenomination(
        String(allowanceRaw),
        vault.decimals,
      );

      this._needsApproval = amount.isGreaterThan(allowance);

      if (this._needsApproval) {
        this.emitProgress({
          status: EvmOperationStatus.NEEDS_APPROVAL,
          steps: { approval: StepStatus.PENDING, queueing: StepStatus.IDLE },
        });
        this.updateStatus(EvmOperationStatus.NEEDS_APPROVAL);
      } else {
        this.emitProgress({
          status: EvmOperationStatus.READY,
          steps: {
            approval: StepStatus.COMPLETE,
            queueing: StepStatus.PENDING,
          },
        });
        this.updateStatus(EvmOperationStatus.READY);
      }
    });
  }

  /**
   * Approves the withdraw queue to pull vault shares.
   *
   * On BTCe-supported chains, when the user's direct LBTCv balance is below
   * the requested amount, unwraps the missing portion of BTCe BEFORE issuing
   * the approval. This is required because some wallets (e.g. OKX) display
   * the proposed approval amount as the user's current token balance with an
   * opt-in "set to unlimited" toggle. Approving first would let the wallet
   * silently cap the allowance at the pre-unwrap LBTCv balance, and the
   * subsequent queue tx in `execute()` would revert on insufficient allowance.
   *
   * Trade-off: on BTCe chains with insufficient LBTCv, this single step may
   * produce 2 wallet popups (unwrap + approve). On Corn (no BTCe) or when
   * direct LBTCv already covers the amount, only the approve popup is shown.
   */
  async approve(): Promise<void> {
    this.assertStatus(EvmOperationStatus.NEEDS_APPROVAL, 'approve');

    return this.act(async () => {
      if (!this._account || !this._chainId || !this._amount) {
        throw LombardError.missingParameter('account, chainId, or amount');
      }

      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const vault = EARN_VAULT;
      const amount = new BigNumber(this._amount);
      const amountBase = toBigInt(toBaseDenomination(amount, vault.decimals));

      const publicClient = makePublicClient({
        chainId: this._chainId,
        env: this.ctx.env,
        rpcUrl: this.ctx.rpcUrls?.[this._chainId],
      });
      const walletClient = makeWalletClient({
        provider: provider as EIP1193Provider,
        chainId: this._chainId,
      });

      // Chain is validated as EarnChain in prepare()
      const vedaChainId = this._chainId as EarnChain;

      // Pre-approve unwrap on BTCe chains so the wallet sees the post-unwrap
      // LBTCv balance when displaying the approval amount.
      if (isBtceVaultChain(this._chainId)) {
        const lbtcvRaw = (await publicClient.readContract({
          address: vault.lensContract.address,
          abi: vault.lensContract.abi,
          functionName: 'balanceOf',
          args: [this._account, vault.vaultContract.address],
        })) as bigint;

        if (lbtcvRaw < amountBase) {
          const need = amountBase - lbtcvRaw;

          const maxWithdrawRaw = (await publicClient.readContract({
            address: BTCE_VAULT.contracts[this._chainId],
            abi: BTCE_VAULT.abi,
            functionName: 'maxWithdraw',
            args: [this._account],
          })) as bigint;

          if (maxWithdrawRaw < need) {
            throw new LombardError(
              WithdrawErrorCode.INSUFFICIENT_SHARES,
              `BTCe wrapper cannot cover the required unwrap. needed=${need.toString()}, maxWithdraw=${maxWithdrawRaw.toString()}.`,
              {
                needed: need.toString(),
                maxWithdraw: maxWithdrawRaw.toString(),
              },
            );
          }

          const { request: unwrapRequest } =
            await publicClient.simulateContract({
              account: this._account,
              chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[this._chainId],
              address: BTCE_VAULT.contracts[this._chainId],
              abi: BTCE_VAULT.abi,
              functionName: 'withdraw',
              args: [need, this._account, this._account],
            });

          const unwrapTxHash = await walletClient.writeContract(unwrapRequest);
          await waitForTransactionReceipt(
            publicClient,
            unwrapTxHash,
            'BTCe unwrap',
          );
        }
      }

      const { request } = await publicClient.simulateContract({
        account: this._account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[this._chainId],
        address: vault.vaultContract.address,
        abi: vault.vaultContract.abi,
        functionName: 'approve',
        args: [vault.withdrawQueueContracts[vedaChainId].address, amountBase],
      });

      const txHash = await walletClient.writeContract(request);
      await waitForTransactionReceipt(
        publicClient,
        txHash,
        'vault share approval',
      );

      this._needsApproval = false;
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, queueing: StepStatus.PENDING },
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

      if (!this._account || !this._chainId || !this._amount) {
        throw LombardError.missingParameter('account, chainId, or amount');
      }

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, queueing: StepStatus.PENDING },
      });

      let txHash: string;

      if (isBtceVaultChain(this._chainId)) {
        // On BTCe chains (ETH/Base/BSC) use the Earn-native orchestrator.
        // It reads the user's combined LBTCv + BTCe position, automatically
        // unwraps just enough BTCe to cover any shortfall in direct LBTCv,
        // then queues the withdrawal. The LBTCv allowance was already set in
        // approve(), so withdrawEarn will skip re-approval.
        const result = await withdrawEarn({
          amount: this._amount,
          account: this._account,
          chainId: this._chainId,
          provider: provider as EIP1193Provider,
          env: this.ctx.env,
          rpcUrl: this.ctx.rpcUrls?.[this._chainId],
        });

        txHash = result.queueTxHash;
      } else {
        // On Corn (no BTCe wrapper), deposit directly into the LBTCv queue.
        // Approval was already done in approve(), so pass approve: false.
        txHash = await queueWithdrawInternal({
          amount: this._amount,
          approve: false,
          account: this._account,
          chainId: this._chainId,
          provider: provider as EIP1193Provider,
          env: this.ctx.env,
          rpcUrl: this.ctx.rpcUrls?.[this._chainId],
        });
      }

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { approval: StepStatus.COMPLETE, queueing: StepStatus.COMPLETE },
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

  private validateProtocol(protocol: DeployProtocol): void {
    const isSupported = evmWithdrawConfig.routes.some(
      (route) =>
        route.protocols.includes(protocol) && route.envs.includes(this.ctx.env),
    );
    if (!isSupported) {
      throw LombardError.invalidParameter(
        'protocol',
        `Protocol ${protocol} is not supported for withdrawals in ${this.ctx.env} environment`,
      );
    }
  }
}
