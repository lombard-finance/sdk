/**
 * EVM Cancel Withdraw Action
 *
 * Cancels a pending vault withdrawal from DeFi protocols (Veda).
 *
 * @module chains/evm/actions/withdraw/EvmCancelWithdraw
 */

import type { EIP1193Provider } from 'viem';

import type { ChainId } from '../../../../common/chains';
import type { DeployProtocol } from '../../../../core';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError, WithdrawErrorCode } from '../../../../shared/errors';
import type { WithdrawEventMap } from '../../../../shared/events';
import { isVedaVaultChain, Vault } from '../../../../vaults/lib/config';
import { cancelWithdrawInternal } from '../../../../vaults/lib/ops/withdraw';
import { evmWithdrawConfig } from './config';
import type {
  EvmCancelWithdrawParams,
  IEvmCancelWithdraw,
} from './types';

export class EvmCancelWithdraw
  extends BaseAction<WithdrawEventMap, EvmOperationStatus>
  implements IEvmCancelWithdraw
{
  private _txHash?: string;
  private _account?: `0x${string}`;
  private _chainId?: ChainId;

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmCancelWithdrawParams,
  ) {
    super(EvmOperationStatus.IDLE);
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  async prepare(): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      this.validateProtocol(this.params.protocol);

      // Get provider and account
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.chain, 'evm');
      }

      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const account = (accounts as string[])[0] as `0x${string}`;
      if (!account) {
        throw LombardError.providerMissing(this.params.chain, 'evm');
      }

      this._account = account;
      this._chainId = parseChainIdentifier(this.params.chain) as ChainId;

      // Validate chain supports Veda vault
      if (!isVedaVaultChain(this._chainId)) {
        throw new LombardError(
          WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED,
          `Chain ${this.params.chain} does not support Veda vault withdrawals`,
          { chain: this.params.chain, protocol: this.params.protocol },
        );
      }

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { cancelling: StepStatus.PENDING },
      });
      this.updateStatus(EvmOperationStatus.READY);
    });
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(EvmOperationStatus.READY, 'execute');

    return this.act(async () => {
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.chain, 'evm');
      }

      if (!this._account || !this._chainId) {
        throw LombardError.missingParameter('account or chainId');
      }

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { cancelling: StepStatus.PENDING },
      });

      // Execute vault cancel withdraw
      const txHash = await cancelWithdrawInternal({
        vaultKey: Vault.Veda,
        account: this._account,
        chainId: this._chainId,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { cancelling: StepStatus.COMPLETE },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
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
