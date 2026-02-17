/**
 * EVM Deploy Action
 *
 * Deploys L-Assets to DeFi protocols (Veda, Silo).
 *
 * Protocol availability:
 * - Veda: Ethereum, Base, BSC, Corn (prod only)
 * - Silo: Avalanche (prod only)
 *
 * @module chains/evm/actions/deploy/EvmDeploy
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
import { LombardError } from '../../../../shared/errors';
import type { DeployEventMap } from '../../../../shared/events';
import {
    evmAmountSchema,
    validatePrepareParams,
} from '../../../../shared/validation';
import { Token } from '../../../../tokens/token-addresses';
import { getTokenInfo, toBaseDenomination } from '../../../../tokens/tokens';
import toBigInt from '../../../../utils/numbers';
import { waitForTransactionReceipt } from '../../../../utils/transaction-executor';
import { Vault, VAULTS } from '../../../../vaults/lib/config';
import { deposit } from '../../../../vaults/lib/ops/deposit';
import { evmConfig } from './config';
import type {
    EvmDeployParams,
    EvmDeployPrepareParams,
    IEvmDeploy,
} from './types';

export class EvmDeploy
  extends BaseAction<DeployEventMap, EvmOperationStatus>
  implements IEvmDeploy
{
  private _amount?: string;
  private _protocol?: DeployProtocol;
  private _needsApproval = false;
  private _txHash?: string;
  private _account?: `0x${string}`;
  private _chainId?: ChainId;

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmDeployParams,
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

  async prepare(params: EvmDeployPrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params);
      this._amount = validated.amount;
      this._protocol = params.protocol;

      this.validateProtocol(params.protocol);

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

      // Check actual allowance to determine if approval is needed
      const vault = VAULTS[Vault.Veda];
      const depositToken = await getTokenInfo(Token.LBTC, this._chainId, this.ctx.env);
      if (!depositToken) {
        throw LombardError.invalidParameter('token', 'Could not get LBTC token info');
      }

      const publicClient = makePublicClient({ chainId: this._chainId });
      const allowanceRaw = await publicClient.readContract({
        address: depositToken.address,
        abi: depositToken.abi,
        functionName: 'allowance',
        args: [account, vault.vaultContract.address],
      });

      const amount = new BigNumber(validated.amount);
      const amountBase = toBaseDenomination(amount, depositToken.decimals);
      const allowance = new BigNumber(String(allowanceRaw));

      // Check if approval is needed
      this._needsApproval = amountBase.isGreaterThan(allowance);

      if (this._needsApproval) {
        this.emitProgress({
          status: EvmOperationStatus.NEEDS_APPROVAL,
          steps: { approval: StepStatus.PENDING, deploying: StepStatus.IDLE },
        });
        this.updateStatus(EvmOperationStatus.NEEDS_APPROVAL);
      } else {
        this.emitProgress({
          status: EvmOperationStatus.READY,
          steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING },
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

      // Get vault and token info
      const vault = VAULTS[Vault.Veda];
      const depositToken = await getTokenInfo(Token.LBTC, this._chainId, this.ctx.env);
      if (!depositToken) {
        throw LombardError.invalidParameter('token', 'Could not get LBTC token info');
      }

      const amount = new BigNumber(this._amount);
      const amountBase = toBigInt(toBaseDenomination(amount, depositToken.decimals));

      // Execute approval transaction
      const publicClient = makePublicClient({ chainId: this._chainId });
      const walletClient = makeWalletClient({
        provider: provider as EIP1193Provider,
        chainId: this._chainId,
      });

      const { request } = await publicClient.simulateContract({
        account: this._account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[this._chainId],
        address: depositToken.address,
        abi: depositToken.abi,
        functionName: 'approve',
        args: [vault.vaultContract.address, amountBase],
      });

      const txHash = await walletClient.writeContract(request);
      await waitForTransactionReceipt(publicClient, txHash, 'LBTC vault deposit approval');

      this._needsApproval = false;
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING },
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

      if (!this._account || !this._chainId) {
        throw LombardError.missingParameter('account or chainId');
      }

      // Map protocol to vault key
      const vaultKey = this._protocol === 'veda' ? Vault.Veda : Vault.Veda;

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING },
      });

      // Execute vault deposit (approval already done, so pass approve: false)
      const txHash = await deposit({
        amount: this._amount!,
        approve: false, // Approval was handled in approve() step
        token: Token.LBTC,
        vaultKey,
        account: this._account,
        chainId: this._chainId,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.COMPLETE },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
      protocol: z.string().min(1, 'Protocol is required'),
    });
  }

  private validateProtocol(protocol: DeployProtocol): void {
    const isSupported = evmConfig.routes.some(
      route =>
        route.protocols.includes(protocol) && route.envs.includes(this.ctx.env),
    );
    if (!isSupported) {
      throw LombardError.invalidParameter(
        'protocol',
        `Protocol ${protocol} is not supported in ${this.ctx.env} environment`,
      );
    }
  }
}
