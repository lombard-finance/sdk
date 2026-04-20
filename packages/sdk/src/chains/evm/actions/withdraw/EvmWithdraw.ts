/**
 * EVM Withdraw Action
 *
 * Queues withdrawal of vault shares from DeFi protocols (Veda).
 *
 * Protocol availability:
 * - Veda: Ethereum, Base, BSC, Corn (prod only)
 *
 * @module chains/evm/actions/withdraw/EvmWithdraw
 */

import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import { makePublicClient } from '../../../../clients/public-client';
import { makeWalletClient } from '../../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, type ChainId } from '../../../../common/chains';
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
import { fromBaseDenomination, toBaseDenomination } from '../../../../tokens/tokens';
import toBigInt from '../../../../utils/numbers';
import { waitForTransactionReceipt } from '../../../../utils/transaction-executor';
import { isVedaVaultChain, Vault, VAULTS, type VedaVaultChain } from '../../../../vaults/lib/config';
import { queueWithdraw } from '../../../../vaults/lib/ops/withdraw';
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
      if (!isVedaVaultChain(this._chainId)) {
        throw new LombardError(
          WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED,
          `Chain ${this.params.sourceChain} does not support Veda vault withdrawals`,
          { chain: this.params.sourceChain, protocol: this._protocol },
        );
      }

      const vault = VAULTS[Vault.Veda];
      const publicClient = makePublicClient({ chainId: this._chainId });

      // Check vault balance
      const balanceRaw = await publicClient.readContract({
        address: vault.lensContract.address,
        abi: vault.lensContract.abi,
        functionName: 'balanceOf',
        args: [account, vault.vaultContract.address],
      });
      const balance = fromBaseDenomination(String(balanceRaw), vault.decimals);

      const amount = new BigNumber(validated.amount);
      if (amount.isGreaterThan(balance)) {
        throw new LombardError(
          WithdrawErrorCode.INSUFFICIENT_SHARES,
          `Insufficient vault shares. Requested: ${amount.toFixed()}, Available: ${balance.toFixed()}`,
          { requested: amount.toFixed(), available: balance.toFixed() },
        );
      }

      // Check allowance for withdraw queue contract
      const allowanceRaw = await publicClient.readContract({
        address: vault.vaultContract.address,
        abi: vault.vaultContract.abi,
        functionName: 'allowance',
        args: [account, vault.withdrawQueueContracts[this._chainId].address],
      });
      const allowance = fromBaseDenomination(String(allowanceRaw), vault.decimals);

      // Check if approval is needed
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
          steps: { approval: StepStatus.COMPLETE, queueing: StepStatus.PENDING },
        });
        this.updateStatus(EvmOperationStatus.READY);
      }
    });
  }

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

      const vault = VAULTS[Vault.Veda];
      const amount = new BigNumber(this._amount);
      const amountBase = toBigInt(toBaseDenomination(amount, vault.decimals));

      const publicClient = makePublicClient({ chainId: this._chainId });
      const walletClient = makeWalletClient({
        provider: provider as EIP1193Provider,
        chainId: this._chainId,
      });

      // Chain is validated as VedaVaultChain in prepare()
      const vedaChainId = this._chainId as VedaVaultChain;

      const { request } = await publicClient.simulateContract({
        account: this._account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[this._chainId],
        address: vault.vaultContract.address,
        abi: vault.vaultContract.abi,
        functionName: 'approve',
        args: [vault.withdrawQueueContracts[vedaChainId].address, amountBase],
      });

      const txHash = await walletClient.writeContract(request);
      await waitForTransactionReceipt(publicClient, txHash, 'vault share approval');

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

      // Execute vault queue withdraw (approval already done)
      const txHash = await queueWithdraw({
        amount: this._amount,
        approve: false,
        vaultKey: Vault.Veda,
        account: this._account,
        chainId: this._chainId,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
      });

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
      route =>
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
