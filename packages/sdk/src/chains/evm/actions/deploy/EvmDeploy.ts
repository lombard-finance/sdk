/**
 * EVM Deploy Action
 *
 * Deploys L-Assets to DeFi protocols (Veda, Silo).
 *
 * Protocol routing:
 * - Veda on ETH/Base/BSC → deposits through the BTCe ERC-4626 wrapper
 *   (`depositEarn`), giving the user BTCe shares. The `recipient` param
 *   is forwarded as the BTCe share receiver.
 * - Veda on Corn → deposits directly into the LBTCv BoringVault teller
 *   (BTCe wrapper is not deployed there).
 * - Silo → separate stake-and-bake mechanism; not handled by this class.
 *
 * @module chains/evm/actions/deploy/EvmDeploy
 */

import BigNumber from 'bignumber.js';
import type { Address, EIP1193Provider } from 'viem';
import { erc20Abi } from 'viem';
import { z } from 'zod';

import { makePublicClient } from '../../../../clients/public-client';
import { makeWalletClient } from '../../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, type ChainId } from '../../../../common/chains';
import { depositEarn } from '../../../../contract-functions/depositEarn';
import { DeployProtocol } from '../../../../core';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { DeployEventMap } from '../../../../shared/events';
import {
    evmAmountSchema,
    validatePrepareParams } from '../../../../shared/validation';
import { Token } from '../../../../tokens/token-addresses';
import { getTokenInfo, toBaseDenomination } from '../../../../tokens/tokens';
import toBigInt from '../../../../utils/numbers';
import { waitForTransactionReceipt } from '../../../../utils/transaction-executor';
import {
  BTCE_VAULT,
  EARN_VAULT,
  isBtceVaultChain } from '../../../../vaults/lib/config';
import { depositInternal } from '../../../../vaults/lib/ops/deposit';
import { evmConfig } from './config';
import type {
    EvmDeployParams,
    EvmDeployPrepareParams,
    IEvmDeploy } from './types';

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

  /**
   * Returns true when the deposit should go through the BTCe ERC-4626 wrapper:
   * Veda protocol on a chain that has the BTCe contract deployed.
   */
  private isVedaBtcePath(): boolean {
    return (
      this._protocol === DeployProtocol.Veda &&
      this._chainId !== undefined &&
      isBtceVaultChain(this._chainId)
    );
  }

  /**
   * Returns the ERC-20 spender address for LBTC approval:
   * - BTCe wrapper address for Veda on BTCe-supported chains
   * - LBTCv BoringVault address for all other cases
   */
  private getSpenderAddress(): Address {
    if (this.isVedaBtcePath()) {
      return BTCE_VAULT.contracts[this._chainId as keyof typeof BTCE_VAULT.contracts];
    }
    return EARN_VAULT.vaultContract.address;
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
        method: 'eth_accounts' });
      const account = (accounts as string[])[0] as `0x${string}`;
      if (!account) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      this._account = account;
      this._chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      const depositToken = await getTokenInfo(Token.LBTC, this._chainId, this.ctx.env);
      if (!depositToken) {
        throw LombardError.invalidParameter('token', 'Could not get LBTC token info');
      }

      const spender = this.getSpenderAddress();
      const publicClient = makePublicClient({ chainId: this._chainId });
      const allowanceRaw = await publicClient.readContract({
        address: depositToken.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account, spender] });

      const amount = new BigNumber(validated.amount);
      const amountBase = toBaseDenomination(amount, depositToken.decimals);
      const allowance = new BigNumber(String(allowanceRaw));

      this._needsApproval = amountBase.isGreaterThan(allowance);

      if (this._needsApproval) {
        this.emitProgress({
          status: EvmOperationStatus.NEEDS_APPROVAL,
          steps: { approval: StepStatus.PENDING, deploying: StepStatus.IDLE } });
        this.updateStatus(EvmOperationStatus.NEEDS_APPROVAL);
      } else {
        this.emitProgress({
          status: EvmOperationStatus.READY,
          steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING } });
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

      const depositToken = await getTokenInfo(Token.LBTC, this._chainId, this.ctx.env);
      if (!depositToken) {
        throw LombardError.invalidParameter('token', 'Could not get LBTC token info');
      }

      const amount = new BigNumber(this._amount);
      const amountBase = toBigInt(toBaseDenomination(amount, depositToken.decimals));
      const spender = this.getSpenderAddress();

      const publicClient = makePublicClient({ chainId: this._chainId });
      const walletClient = makeWalletClient({
        provider: provider as EIP1193Provider,
        chainId: this._chainId });

      const { request } = await publicClient.simulateContract({
        account: this._account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[this._chainId],
        address: depositToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amountBase] });

      const txHash = await walletClient.writeContract(request);
      await waitForTransactionReceipt(publicClient, txHash, 'LBTC deposit approval');

      this._needsApproval = false;
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING } });
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

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.PENDING } });

      let txHash: string;

      if (this.isVedaBtcePath()) {
        // Route through BTCe ERC-4626 wrapper: user receives BTCe shares.
        // Approval was already done in approve(), so pass approve: false.
        txHash = await depositEarn({
          token: Token.LBTC,
          amount: this._amount!,
          receiver: this.params.recipient as Address,
          approve: false,
          account: this._account,
          chainId: this._chainId,
          provider: provider as EIP1193Provider,
          env: this.ctx.env });
      } else {
        // Veda on Corn (no BTCe wrapper) or other protocols:
        // deposit directly into the LBTCv BoringVault teller.
        // Approval was already done in approve(), so pass approve: false.
        txHash = await depositInternal({
          amount: this._amount!,
          approve: false,
          token: Token.LBTC,
          account: this._account,
          chainId: this._chainId,
          provider: provider as EIP1193Provider,
          env: this.ctx.env });
      }

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { approval: StepStatus.COMPLETE, deploying: StepStatus.COMPLETE } });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
      protocol: z.string().min(1, 'Protocol is required') });
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
