/**
 * Lombard Action Provider for Coinbase AgentKit
 *
 * Wraps Lombard SDK's EVM actions as AgentKit tools so an AI agent
 * can stake, unstake, deposit, redeem, and deploy BTC.b / LBTC
 * through natural-language commands.
 *
 * @module lombardActionProvider
 */

import 'reflect-metadata';

import {
  ActionProvider,
  CreateAction,
  EvmWalletProvider,
  type Network,
} from '@coinbase/agentkit';
import {
  AssetId,
  Chain,
  createLombardSDK,
  DeployProtocol,
  Env,
  LombardSDK,
} from '@lombard.finance/sdk';
import { z } from 'zod';

import {
  DeploySchema,
  DepositSchema,
  RedeemSchema,
  StakeSchema,
  UnstakeSchema,
} from './schemas';
import { isNetworkSupported, toLombardChain } from './utils/chain-mapping';
import { toEIP1193Provider } from './utils/wallet-adapter';

/**
 * Lombard Action Provider
 *
 * Exposes Lombard protocol operations (stake, unstake, deposit, redeem, deploy)
 * as AgentKit actions.  Each action encapsulates the full multi-step flow
 * (prepare → approve/authorizeFee → execute) so the LLM only needs a single
 * tool call.
 */
export class LombardActionProvider extends ActionProvider<EvmWalletProvider> {
  private readonly env: Env;
  private sdkCache: { sdk: LombardSDK; chainId: string } | null = null;

  constructor(env: Env = Env.prod) {
    super('lombard', []);
    this.env = env;
  }

  // ─── SDK Lifecycle ──────────────────────────────────────────────────

  private async getSDK(
    walletProvider: EvmWalletProvider,
  ): Promise<LombardSDK> {
    const chainId = walletProvider.getNetwork().chainId ?? '';

    if (this.sdkCache && this.sdkCache.chainId === chainId) {
      return this.sdkCache.sdk;
    }

    const eip1193 = toEIP1193Provider(walletProvider);
    const sdk = await createLombardSDK({
      env: this.env,
      providers: { evm: () => eip1193 },
    });

    this.sdkCache = { sdk, chainId };
    return sdk;
  }

  // ─── Actions ────────────────────────────────────────────────────────

  @CreateAction({
    name: 'stake_btcb_to_lbtc',
    description:
      'Stake BTC.b (wrapped Bitcoin) to receive LBTC (Lombard liquid staked Bitcoin). ' +
      'LBTC earns native BTC staking yield while remaining liquid on EVM chains. ' +
      'Requires BTC.b in the wallet.',
    schema: StakeSchema,
  })
  async stake(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StakeSchema>,
  ): Promise<string> {
    try {
      const sdk = await this.getSDK(walletProvider);
      const chain = toLombardChain(walletProvider.getNetwork());

      const action = sdk.chain.evm.stake({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: chain,
        destChain: chain,
      });

      await action.prepare({ amount: args.amount });

      if (action.needsApproval) {
        await action.approve();
      }

      if (action.feeAuth.requiresAuth && !action.feeAuth.isAuthorized) {
        await action.authorizeFee();
      }

      const { txHash } = await action.execute();
      return (
        `Successfully staked ${args.amount} BTC.b → LBTC. ` +
        `Transaction: ${txHash}`
      );
    } catch (error) {
      return `Failed to stake BTC.b: ${errorMessage(error)}`;
    }
  }

  @CreateAction({
    name: 'unstake_lbtc',
    description:
      'Unstake LBTC to receive BTC.b on the same EVM chain. ' +
      'Requires LBTC in the wallet.',
    schema: UnstakeSchema,
  })
  async unstake(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UnstakeSchema>,
  ): Promise<string> {
    try {
      const sdk = await this.getSDK(walletProvider);
      const sourceChain = toLombardChain(walletProvider.getNetwork());

      const action = sdk.chain.evm.unstake({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain,
        destChain: sourceChain,
      });

      await action.prepare({ amount: args.amount, recipient: args.recipient });

      if (action.feeAuth.requiresAuth && !action.feeAuth.isAuthorized) {
        await action.authorizeFee();
      }

      const { txHash } = await action.execute();
      return (
        `Successfully unstaked ${args.amount} LBTC → BTC.b. ` +
        `Recipient: ${args.recipient}. Transaction: ${txHash}`
      );
    } catch (error) {
      return `Failed to unstake LBTC: ${errorMessage(error)}`;
    }
  }

  @CreateAction({
    name: 'deposit_to_lbtc',
    description:
      'Deposit BTC.b to receive LBTC. ' +
      'Requires BTC.b in the wallet.',
    schema: DepositSchema,
  })
  async deposit(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositSchema>,
  ): Promise<string> {
    try {
      const sdk = await this.getSDK(walletProvider);
      const sourceChain = toLombardChain(walletProvider.getNetwork());

      const action = sdk.chain.evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain,
        destChain: sourceChain,
      });

      await action.prepare({ amount: args.amount, recipient: args.recipient });

      if (action.needsApproval) {
        await action.approve();
      }

      const { txHash } = await action.execute();
      return (
        `Successfully deposited ${args.amount} BTC.b → LBTC. ` +
        `Recipient: ${args.recipient}. Transaction: ${txHash}`
      );
    } catch (error) {
      return `Failed to deposit: ${errorMessage(error)}`;
    }
  }

  @CreateAction({
    name: 'redeem_btcb_to_btc',
    description:
      'Redeem BTC.b to receive native BTC on the Bitcoin network (cross-chain). ' +
      'Requires BTC.b in the wallet and a Bitcoin recipient address.',
    schema: RedeemSchema,
  })
  async redeem(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RedeemSchema>,
  ): Promise<string> {
    try {
      const sdk = await this.getSDK(walletProvider);
      const sourceChain = toLombardChain(walletProvider.getNetwork());

      const action = sdk.chain.evm.redeem({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain,
        destChain: Chain.BITCOIN_MAINNET,
      });

      await action.prepare({ amount: args.amount, recipient: args.recipient });

      if (action.feeAuth.requiresAuth && !action.feeAuth.isAuthorized) {
        await action.authorizeFee();
      }

      if (action.needsApproval) {
        await action.approve();
      }

      const { txHash } = await action.execute();
      return (
        `Successfully redeemed ${args.amount} BTC.b → BTC. ` +
        `Recipient: ${args.recipient}. Transaction: ${txHash}`
      );
    } catch (error) {
      return `Failed to redeem BTC.b: ${errorMessage(error)}`;
    }
  }

  @CreateAction({
    name: 'deploy_lbtc_to_defi',
    description:
      'Deploy LBTC into a DeFi protocol to earn additional yield. ' +
      'Supported protocols: Veda (Ethereum, Base, BSC, Corn) and Silo (Avalanche). ' +
      'Requires LBTC in the wallet.',
    schema: DeploySchema,
  })
  async deploy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DeploySchema>,
  ): Promise<string> {
    try {
      const sdk = await this.getSDK(walletProvider);
      const sourceChain = toLombardChain(walletProvider.getNetwork());
      const address = walletProvider.getAddress();

      const protocol =
        args.protocol === 'veda' ? DeployProtocol.Veda : DeployProtocol.Silo;

      const action = sdk.chain.evm.deploy({
        asset: AssetId.LBTC,
        sourceChain,
        protocol,
        recipient: address,
      });

      await action.prepare({ amount: args.amount, protocol });

      if (action.needsApproval) {
        await action.approve();
      }

      const { txHash } = await action.execute();
      return (
        `Successfully deployed ${args.amount} LBTC into ${args.protocol} protocol. ` +
        `Transaction: ${txHash}`
      );
    } catch (error) {
      return `Failed to deploy LBTC: ${errorMessage(error)}`;
    }
  }

  // ─── Network Support ────────────────────────────────────────────────

  supportsNetwork = (network: Network): boolean => isNetworkSupported(network);
}

// ─── Helpers ────────────────────────────────────────────────────────────

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ─── Factory ────────────────────────────────────────────────────────────

/**
 * Create a Lombard action provider instance.
 *
 * @param env - Lombard environment (defaults to production).
 *
 * @example
 * ```typescript
 * import { lombardActionProvider } from '@lombard.finance/sdk-agentkit';
 *
 * const agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [lombardActionProvider()],
 * });
 * ```
 */
export const lombardActionProvider = (env?: Env) =>
  new LombardActionProvider(env);
