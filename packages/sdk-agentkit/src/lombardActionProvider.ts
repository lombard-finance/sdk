import "reflect-metadata";

import {
  ActionProvider,
  CreateAction,
  EvmWalletProvider,
  type Network,
} from "@coinbase/agentkit";
import {
  approveToken,
  type ChainId,
  claimLBTC,
  deposit as vaultDeposit,
  depositToken,
  fromSatoshi,
  getAssetRouterAddress,
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  getLBTCExchangeRate,
  getLBTCMintingFee,
  getNetworkFeeSignature,
  getTokenAllowance,
  getUnstakesByAddress,
  redeemToken,
  requiresAutoMintFee,
  signNetworkFee,
  storeNetworkFeeSignature,
  Token,
  unstakeLBTC,
  Vault,
} from "@lombard.finance/sdk";
import type { Env } from "@lombard.finance/sdk-common";
import type { Address, EIP1193Provider } from "viem";
import { z } from "zod";

import { isLombardSupportedNetwork, resolveNetwork } from "./networks";
import {
  ClaimDepositSchema,
  DeployToDefiSchema,
  GetBtcbBalanceSchema,
  GetDepositStatusSchema,
  GetLbtcBalanceSchema,
  GetLbtcExchangeRateSchema,
  GetUnstakeStatusSchema,
  RedeemLbtcToBtcbSchema,
  StakeBtcbToLbtcSchema,
  UnstakeLbtcSchema,
} from "./schemas";
import {
  formatError,
  formatSuccess,
  getTokenBalance,
  toEIP1193Provider,
} from "./utils";

/**
 * LombardActionProvider exposes Lombard protocol operations
 * (stake, unstake, redeem, deploy, claim) as Coinbase AgentKit actions.
 *
 * Usage:
 * ```ts
 * import { lombardActionProvider } from '@lombard.finance/sdk-agentkit';
 *
 * const agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [lombardActionProvider()],
 * });
 * ```
 */
export class LombardActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("lombard", []);
  }

  supportsNetwork = (network: Network): boolean => {
    return isLombardSupportedNetwork(network);
  };

  // ─── Write Actions ──────────────────────────────────────────────────

  @CreateAction({
    name: "stake_btcb_to_lbtc",
    description:
      "Stake BTC.b (wrapped Bitcoin) to receive LBTC (Lombard Staked Bitcoin). " +
      "This converts BTC.b into LBTC which earns staking yield. " +
      "Handles token approval and fee authorization automatically.",
    schema: StakeBtcbToLbtcSchema,
  })
  async stakeBtcbToLbtc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StakeBtcbToLbtcSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "stake_btcb_to_lbtc",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const account = walletProvider.getAddress() as Address;
      const provider = toEIP1193Provider(walletProvider, chainId);

      // Handle fee authorization for chains that require it
      await this.ensureFeeAuthorization(
        walletProvider,
        chainId,
        env,
        account,
        provider,
      );

      // Check allowance and approve if needed
      const routerAddress = await getAssetRouterAddress({
        tokenIn: Token.BTCb,
        chainId,
        env,
      });

      const allowance = await getTokenAllowance({
        token: Token.BTCb,
        owner: account,
        spender: routerAddress,
        chainId,
        env,
      });

      if (allowance.isLessThan(args.amount)) {
        await approveToken({
          token: Token.BTCb,
          spender: routerAddress,
          amount: args.amount,
          account,
          chainId,
          provider,
          env,
        });
      }

      const txHash = await depositToken({
        amount: args.amount,
        tokenIn: Token.BTCb,
        tokenOut: Token.LBTC,
        account,
        chainId,
        provider,
        env,
      });

      return formatSuccess("stake_btcb_to_lbtc", {
        txHash,
        amount: args.amount,
        from: "BTC.b",
        to: "LBTC",
      });
    } catch (error) {
      return formatError("stake_btcb_to_lbtc", error);
    }
  }

  @CreateAction({
    name: "unstake_lbtc",
    description:
      "Unstake LBTC (Lombard Staked Bitcoin). " +
      "Output can be native BTC (cross-chain, requires a Bitcoin address) or BTC.b (same EVM chain). " +
      "BTC unstaking takes longer as it crosses chains. BTC.b is faster, same-chain.",
    schema: UnstakeLbtcSchema,
  })
  async unstakeLbtc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UnstakeLbtcSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "unstake_lbtc",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const account = walletProvider.getAddress() as Address;
      const provider = toEIP1193Provider(walletProvider, chainId);

      // Handle fee authorization for chains that require it
      await this.ensureFeeAuthorization(
        walletProvider,
        chainId,
        env,
        account,
        provider,
      );

      if (args.outputAsset === "BTC") {
        const txHash = await unstakeLBTC({
          amount: args.amount,
          btcAddress: args.recipient,
          tokenIn: Token.LBTC,
          account,
          chainId,
          provider,
          env,
        });

        return formatSuccess("unstake_lbtc", {
          txHash,
          amount: args.amount,
          to: "BTC",
          recipient: args.recipient,
          note: "Cross-chain unstake initiated. BTC will arrive after processing (may take hours).",
        });
      }

      // BTCb output - same chain redeem
      const txHash = await redeemToken({
        amount: args.amount,
        tokenIn: Token.LBTC,
        tokenOut: Token.BTCb,
        account,
        chainId,
        provider,
        env,
      });

      return formatSuccess("unstake_lbtc", {
        txHash,
        amount: args.amount,
        to: "BTC.b",
      });
    } catch (error) {
      return formatError("unstake_lbtc", error);
    }
  }

  @CreateAction({
    name: "redeem_lbtc_to_btcb",
    description:
      "Redeem LBTC to BTC.b (wrapped Bitcoin) on the same EVM chain. " +
      "This is a fast same-chain conversion. For cross-chain BTC redemption, use unstake_lbtc instead.",
    schema: RedeemLbtcToBtcbSchema,
  })
  async redeemLbtcToBtcb(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RedeemLbtcToBtcbSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "redeem_lbtc_to_btcb",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const account = walletProvider.getAddress() as Address;
      const provider = toEIP1193Provider(walletProvider, chainId);

      await this.ensureFeeAuthorization(
        walletProvider,
        chainId,
        env,
        account,
        provider,
      );

      const txHash = await redeemToken({
        amount: args.amount,
        tokenIn: Token.LBTC,
        tokenOut: Token.BTCb,
        account,
        chainId,
        provider,
        env,
      });

      return formatSuccess("redeem_lbtc_to_btcb", {
        txHash,
        amount: args.amount,
        from: "LBTC",
        to: "BTC.b",
      });
    } catch (error) {
      return formatError("redeem_lbtc_to_btcb", error);
    }
  }

  @CreateAction({
    name: "deploy_to_defi",
    description:
      "Deploy LBTC into a DeFi vault to earn additional yield. " +
      "Currently supports the Veda vault. " +
      "Handles approval automatically.",
    schema: DeployToDefiSchema,
  })
  async deployToDefi(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DeployToDefiSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "deploy_to_defi",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId } = resolved;
      const account = walletProvider.getAddress() as Address;
      const provider = toEIP1193Provider(walletProvider, chainId);

      const vaultKey = Vault.Veda;

      const txHash = await vaultDeposit({
        amount: args.amount,
        approve: true,
        token: Token.LBTC,
        vaultKey,
        account,
        chainId,
        provider,
        rpcUrl: undefined,
        env: resolved.env,
      });

      return formatSuccess("deploy_to_defi", {
        txHash,
        amount: args.amount,
        protocol: args.protocol,
        asset: "LBTC",
      });
    } catch (error) {
      return formatError("deploy_to_defi", error);
    }
  }

  @CreateAction({
    name: "claim_deposit",
    description:
      "Claim a notarized deposit to mint LBTC. " +
      "Use get_deposit_status first to check if a deposit is claimable. " +
      'Only deposits with status "claimable" can be claimed.',
    schema: ClaimDepositSchema,
  })
  async claimDeposit(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ClaimDepositSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "claim_deposit",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const account = walletProvider.getAddress() as Address;
      const provider = toEIP1193Provider(walletProvider, chainId);

      // Find the claimable deposit by tx hash
      const deposits = await getDepositsByAddress({ address: account, env });
      const deposit = deposits.find((d) => d.txHash === args.depositTxHash);

      if (!deposit) {
        return formatError(
          "claim_deposit",
          `No deposit found with txHash: ${args.depositTxHash}`,
        );
      }

      const status = getDepositStatus(deposit);
      if (status !== "claimable") {
        const display = getDepositStatusDisplay(status);
        return formatError(
          "claim_deposit",
          `Deposit is not claimable. Current status: ${display.label} - ${display.description}`,
        );
      }

      if (!deposit.rawPayload || !deposit.proof) {
        return formatError(
          "claim_deposit",
          "Deposit proof data is not yet available",
        );
      }

      const txHash = await claimLBTC({
        data: deposit.rawPayload,
        proofSignature: deposit.proof,
        account,
        chainId,
        provider,
        env,
      });

      return formatSuccess("claim_deposit", {
        txHash,
        depositTxHash: args.depositTxHash,
      });
    } catch (error) {
      return formatError("claim_deposit", error);
    }
  }

  // ─── Read Actions ───────────────────────────────────────────────────

  @CreateAction({
    name: "get_lbtc_balance",
    description:
      "Check the LBTC (Lombard Staked Bitcoin) balance for an address on the current chain.",
    schema: GetLbtcBalanceSchema,
  })
  async getLbtcBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetLbtcBalanceSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "get_lbtc_balance",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const address = (args.address || walletProvider.getAddress()) as Address;

      const { formatted } = await getTokenBalance(
        walletProvider,
        Token.LBTC,
        chainId,
        address,
        env,
      );

      return formatSuccess("get_lbtc_balance", {
        address,
        balance: formatted,
        token: "LBTC",
        chain: resolved.networkId,
      });
    } catch (error) {
      return formatError("get_lbtc_balance", error);
    }
  }

  @CreateAction({
    name: "get_btcb_balance",
    description:
      "Check the BTC.b (wrapped Bitcoin) balance for an address on the current chain.",
    schema: GetBtcbBalanceSchema,
  })
  async getBtcbBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBtcbBalanceSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "get_btcb_balance",
          "Current network is not supported by Lombard",
        );
      }

      const { chainId, env } = resolved;
      const address = (args.address || walletProvider.getAddress()) as Address;

      const { formatted } = await getTokenBalance(
        walletProvider,
        Token.BTCb,
        chainId,
        address,
        env,
      );

      return formatSuccess("get_btcb_balance", {
        address,
        balance: formatted,
        token: "BTC.b",
        chain: resolved.networkId,
      });
    } catch (error) {
      return formatError("get_btcb_balance", error);
    }
  }

  @CreateAction({
    name: "get_lbtc_exchange_rate",
    description:
      "Get the current LBTC/BTC exchange rate and minimum stake amount. " +
      "LBTC is a rebasing token, so the rate is typically close to 1:1.",
    schema: GetLbtcExchangeRateSchema,
  })
  async getLbtcExchangeRate(
    _walletProvider: EvmWalletProvider,
    _args: z.infer<typeof GetLbtcExchangeRateSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(_walletProvider.getNetwork());
      const env = resolved?.env;

      const rate = await getLBTCExchangeRate({ env });

      return formatSuccess("get_lbtc_exchange_rate", {
        exchangeRate: rate.exchangeRate,
        minStakeAmountBtc: fromSatoshi(rate.minAmount).toString(),
      });
    } catch (error) {
      return formatError("get_lbtc_exchange_rate", error);
    }
  }

  @CreateAction({
    name: "get_deposit_status",
    description:
      "Check the status of all deposits for an address. " +
      "Shows pending, claimable, claimed, and failed deposits. " +
      "Use this to find claimable deposits before calling claim_deposit.",
    schema: GetDepositStatusSchema,
  })
  async getDepositStatusAction(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetDepositStatusSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "get_deposit_status",
          "Current network is not supported by Lombard",
        );
      }

      const { env } = resolved;
      const address = (args.address || walletProvider.getAddress()) as Address;

      const deposits = await getDepositsByAddress({ address, env });

      if (deposits.length === 0) {
        return formatSuccess("get_deposit_status", {
          address,
          deposits: [],
          message: "No deposits found for this address",
        });
      }

      const summaries = deposits.map((d) => {
        const status = getDepositStatus(d);
        const display = getDepositStatusDisplay(status);
        return {
          txHash: d.txHash,
          amount: d.amount?.toString(),
          status,
          statusLabel: display.label,
          description: display.description,
          requiresAction: display.requiresAction,
          isTerminal: display.isTerminal,
          claimTxHash: d.claimTxHash || null,
        };
      });

      return formatSuccess("get_deposit_status", {
        address,
        totalDeposits: deposits.length,
        deposits: summaries,
      });
    } catch (error) {
      return formatError("get_deposit_status", error);
    }
  }

  @CreateAction({
    name: "get_unstake_status",
    description:
      "Check the status of all unstake/redeem operations for an address. " +
      "Shows pending and completed unstakes with payout transaction details.",
    schema: GetUnstakeStatusSchema,
  })
  async getUnstakeStatus(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUnstakeStatusSchema>,
  ): Promise<string> {
    try {
      const resolved = resolveNetwork(walletProvider.getNetwork());
      if (!resolved) {
        return formatError(
          "get_unstake_status",
          "Current network is not supported by Lombard",
        );
      }

      const { env } = resolved;
      const address = (args.address || walletProvider.getAddress()) as Address;

      const unstakes = await getUnstakesByAddress({ address, env });

      if (unstakes.length === 0) {
        return formatSuccess("get_unstake_status", {
          address,
          unstakes: [],
          message: "No unstakes found for this address",
        });
      }

      const summaries = unstakes.map((u) => ({
        txHash: u.txHash,
        amount: u.amount?.toString(),
        payoutStatus: u.payoutTxStatus,
        payoutTxHash: u.payoutTxHash || null,
        toAddress: u.toAddress || null,
      }));

      return formatSuccess("get_unstake_status", {
        address,
        totalUnstakes: unstakes.length,
        unstakes: summaries,
      });
    } catch (error) {
      return formatError("get_unstake_status", error);
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Ensures fee authorization is in place for chains that require it.
   * On Ethereum and Sepolia, staking/unstaking requires an EIP-712 fee
   * signature stored with the backend before the transaction can proceed.
   */
  private async ensureFeeAuthorization(
    _walletProvider: EvmWalletProvider,
    chainId: ChainId,
    env: Env,
    account: Address,
    provider: EIP1193Provider,
  ): Promise<void> {
    if (!requiresAutoMintFee(chainId)) {
      return;
    }

    // Check if a valid fee signature already exists
    const existing = await getNetworkFeeSignature({
      address: account,
      chainId,
      env,
    });

    if (existing.hasSignature) {
      // Check expiration
      const expirationMs = new Date(existing.expirationDate).getTime();
      const bufferMs = 60 * 60 * 1000; // 1 hour buffer
      if (expirationMs > Date.now() + bufferMs) {
        return; // Existing signature is still valid
      }
    }

    // Need to sign a new fee authorization
    const mintingFee = await getLBTCMintingFee({ chainId, env });
    const { signature, typedData } = await signNetworkFee({
      fee: mintingFee,
      account,
      chainId,
      provider,
      env,
    });

    await storeNetworkFeeSignature({
      signature,
      typedData,
      address: account,
      env,
    });
  }
}

export const lombardActionProvider = () => new LombardActionProvider();
