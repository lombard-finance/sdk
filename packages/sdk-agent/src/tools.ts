/**
 * Framework-agnostic tool definitions for Lombard protocol operations.
 *
 * Each tool has:
 * - name: unique identifier
 * - description: what the tool does (for LLM context)
 * - parameters: JSON Schema for input validation (derived from Zod)
 * - schema: Zod schema for runtime validation
 * - execute: async function that performs the operation
 *
 * These can be adapted to any AI framework (Vercel AI SDK, LangChain,
 * OpenAI function calling, MCP, etc.)
 */
import {
  Env,
  fromSatoshi,
  getDepositBtcAddress as sdkGetDepositBtcAddress,
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  getExchangeRatio,
  getLBTCExchangeRate,
  getNetworkFeeSignature,
  getTokenContractInfo,
  getUnstakesByAddress,
  getVaultApy,
  getVaultTVL,
  makePublicClient,
  requiresAutoMintFee,
  Token,
  Vault,
} from "@lombard.finance/sdk";
import { type Address, formatUnits } from "viem";
import type { z } from "zod";

import { getChainConfig } from "./chains";
import {
  AddressAndChainSchema,
  AddressAndChainZod,
  BalanceSchema,
  BalanceZod,
  DeployToVaultSchema,
  DeployToVaultZod,
  DepositBtcSchema,
  DepositBtcZod,
  ExchangeRateSchema,
  ExchangeRateZod,
  StakeSchema,
  StakeZod,
  StrategiesSchema,
  StrategiesZod,
  UnstakeSchema,
  UnstakeZod,
} from "./schemas";

export interface ToolDefinition<
  TParams = Record<string, unknown>,
  TResult = unknown,
> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType<TParams>;
  execute: (params: TParams) => Promise<TResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>;

// ─── Helpers ──────────────────────────────────────────────────────────

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

async function readTokenBalance(
  token: Token,
  address: string,
  chainId: number,
): Promise<string> {
  const config = getChainConfig(chainId);
  const tokenInfo = await withTimeout(
    getTokenContractInfo(token, config.chainId, config.env),
    10_000,
    "getTokenContractInfo",
  );
  // Use the SDK's makePublicClient for reliable RPC calls
  const client = makePublicClient({
    chainId: config.chainId,
    env: config.env,
  });

  const balance = await client.readContract({
    address: tokenInfo.address as Address,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [address as Address],
  });

  const decimals =
    "decimals" in tokenInfo && typeof tokenInfo.decimals === "number"
      ? tokenInfo.decimals
      : 8;
  return formatUnits(balance, decimals);
}

// ─── Read Tools ───────────────────────────────────────────────────────

export const getLbtcBalance: ToolDefinition<
  { address: string; chainId: number },
  { balance: string; token: string; chain: string; address: string }
> = {
  name: "get_lbtc_balance",
  description:
    "Check the LBTC (Lombard Staked Bitcoin) balance for a wallet address.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const balance = await readTokenBalance(Token.LBTC, address, chainId);
    const { name } = getChainConfig(chainId);
    return { balance, token: "LBTC", chain: name, address };
  },
};

export const getBtcbBalance: ToolDefinition<
  { address: string; chainId: number },
  { balance: string; token: string; chain: string; address: string }
> = {
  name: "get_btcb_balance",
  description:
    "Check the BTC.b (wrapped Bitcoin) balance for a wallet address.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const balance = await readTokenBalance(Token.BTCb, address, chainId);
    const { name } = getChainConfig(chainId);
    return { balance, token: "BTC.b", chain: name, address };
  },
};

export const getExchangeRate: ToolDefinition<
  { chainId?: number },
  {
    lbtcToBtc: string;
    btcToLbtc: string;
    minStakeAmountBtc: string;
    description: string;
    error?: string;
  }
> = {
  name: "get_exchange_rate",
  description:
    "Get the current LBTC/BTC exchange rate and minimum stake amount. " +
    "LBTC accrues staking yield over time, so 1 LBTC is worth slightly more than 1 BTC.",
  parameters: ExchangeRateSchema as Record<string, unknown>,
  schema: ExchangeRateZod,
  execute: async (params) => {
    const { chainId: _chainId } = ExchangeRateZod.parse(params);
    try {
      // Always use prod for exchange rate — testnet rates are not meaningful
      const env = Env.prod;
      const [ratioResult, mintRate] = await Promise.all([
        getExchangeRatio({ env }),
        getLBTCExchangeRate({ env }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lbtcData = (ratioResult as any).LBTC;
      if (!lbtcData?.BTCTokenRatio || !lbtcData?.tokenBTCRatio) {
        throw new Error("Exchange ratio data unavailable");
      }
      const lbtcToBtc = String(lbtcData.BTCTokenRatio);
      const btcToLbtc = String(lbtcData.tokenBTCRatio);

      return {
        lbtcToBtc,
        btcToLbtc,
        minStakeAmountBtc: fromSatoshi(mintRate.minAmount).toString(),
        description: `1 LBTC = ${lbtcToBtc} BTC. 1 BTC = ${btcToLbtc} LBTC. Min stake: ${fromSatoshi(mintRate.minAmount)} BTC.`,
      };
    } catch (err) {
      return {
        lbtcToBtc: "",
        btcToLbtc: "",
        minStakeAmountBtc: "",
        description: "",
        error:
          err instanceof Error ? err.message : "Failed to fetch exchange rate",
      };
    }
  },
};

export const getDepositStatusTool: ToolDefinition<{
  address: string;
  chainId: number;
}> = {
  name: "get_deposit_status",
  description:
    "Check the status of all deposits for an address. Shows pending, claimable, and claimed deposits.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const { env } = getChainConfig(chainId);
    const deposits = await getDepositsByAddress({
      address: address as Address,
      env,
    });

    if (deposits.length === 0) {
      return { deposits: [], message: "No deposits found" };
    }

    return {
      totalDeposits: deposits.length,
      deposits: deposits.map((d) => {
        const status = getDepositStatus(d);
        const display = getDepositStatusDisplay(status);
        return {
          txHash: d.txHash,
          amount: d.amount?.toString(),
          status,
          statusLabel: display.label,
          description: display.description,
          requiresAction: display.requiresAction,
        };
      }),
    };
  },
};

export const getUnstakeStatusTool: ToolDefinition<{
  address: string;
  chainId: number;
}> = {
  name: "get_unstake_status",
  description:
    "Check the status of all unstake/redeem operations for an address.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const { env } = getChainConfig(chainId);
    const unstakes = await getUnstakesByAddress({
      address: address as Address,
      env,
    });

    if (unstakes.length === 0) {
      return { unstakes: [], message: "No unstakes found" };
    }

    return {
      totalUnstakes: unstakes.length,
      unstakes: unstakes.map((u) => ({
        txHash: u.txHash,
        amount: u.amount?.toString(),
        payoutStatus: u.payoutTxStatus,
        payoutTxHash: u.payoutTxHash || null,
      })),
    };
  },
};

export const getBalance: ToolDefinition<
  { address: string; chainId: number },
  { lbtc: string; btcb: string; chain: string; address: string }
> = {
  name: "get_balance",
  description:
    "Check both LBTC and BTC.b balances for a wallet address in a single call. " +
    "Returns both token balances on the specified chain.",
  parameters: BalanceSchema as Record<string, unknown>,
  schema: BalanceZod,
  execute: async (params) => {
    const { address, chainId } = BalanceZod.parse(params);
    const config = getChainConfig(chainId);
    const [lbtcBal, btcbBal] = await Promise.all([
      readTokenBalance(Token.LBTC, address, chainId),
      readTokenBalance(Token.BTCb, address, chainId),
    ]);
    return { lbtc: lbtcBal, btcb: btcbBal, chain: config.name, address };
  },
};

export const getStrategies: ToolDefinition<
  { chainId?: number },
  {
    strategies: Array<{
      vault: string;
      chain: string;
      apy: string;
      tvlBtc: string;
    }>;
    error?: string;
  }
> = {
  name: "get_strategies",
  description:
    "List available yield strategies (DeFi vaults) where LBTC can be deployed for additional yield. " +
    "Returns vault name, chain, current APY, and TVL for each strategy.",
  parameters: StrategiesSchema as Record<string, unknown>,
  schema: StrategiesZod,
  // Vault data is mainnet-only regardless of chainId
  execute: async (params) => {
    const { chainId: _chainId } = StrategiesZod.parse(params);
    // Vault APY only works on Ethereum mainnet — always query prod/mainnet
    const env = Env.prod;
    try {
      const [apyData, tvlData] = await Promise.all([
        getVaultApy({ env, vaultKey: Vault.Veda }),
        getVaultTVL({ env, vaultKey: Vault.Veda }),
      ]);

      const latestApy = apyData.length > 0 ? apyData[apyData.length - 1] : null;

      return {
        strategies: [
          {
            vault: "Veda",
            chain: "Ethereum",
            apy: latestApy
              ? `${(parseFloat(String(latestApy.apy)) * 100).toFixed(2)}%`
              : "N/A",
            tvlBtc: tvlData.btcBalance.toFixed(4),
          },
        ],
      };
    } catch {
      return { strategies: [], error: "Unable to fetch vault data" };
    }
  },
};

export const getDepositBtcAddress: ToolDefinition<
  { address: string; chainId: number },
  { btcAddress: string | null; chain: string; note: string; action?: string }
> = {
  name: "get_deposit_btc_address",
  description:
    "Get or generate a BTC deposit address for a wallet. Users send native BTC to this " +
    "address to receive LBTC on the specified EVM chain. If no address exists yet, " +
    "returns instructions to generate one (requires a wallet signature).",
  parameters: DepositBtcSchema as Record<string, unknown>,
  schema: DepositBtcZod,
  execute: async (params) => {
    const { address, chainId } = DepositBtcZod.parse(params);
    const config = getChainConfig(chainId);
    try {
      const btcAddress = await sdkGetDepositBtcAddress({
        address,
        chainId: config.chainId,
        env: config.env,
      });
      return {
        btcAddress,
        chain: config.name,
        note: "Send BTC to this address. Once confirmed and notarized, use get_deposit_status to track progress and claim your LBTC.",
      };
    } catch {
      return {
        btcAddress: null,
        chain: config.name,
        action: "generate_deposit_address",
        note: "No deposit address exists yet. To generate one, a wallet signature is required. Click the button below to sign and generate your BTC deposit address.",
      };
    }
  },
};

// ─── BTC Stake Workflow Tools ─────────────────────────────────────────

export const checkFeeAuthorization: ToolDefinition<
  { address: string; chainId: number },
  {
    chain: string;
    requiresFeeAuth: boolean;
    hasValidSignature: boolean;
    expirationDate: string | null;
    note: string;
  }
> = {
  name: "check_fee_authorization",
  description:
    "Check if a valid fee authorization signature exists for staking. " +
    "On Ethereum/Sepolia, fee auth (EIP-712) is required before generating a BTC deposit address. " +
    "On other chains, an address confirmation is required instead.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    const needsFeeAuth = requiresAutoMintFee(config.chainId);

    if (needsFeeAuth) {
      try {
        const sig = await withTimeout(
          getNetworkFeeSignature({
            address,
            chainId: config.chainId,
            env: config.env,
          }),
          10_000,
          "getNetworkFeeSignature",
        );
        const isValid =
          sig.hasSignature &&
          new Date(sig.expirationDate).getTime() > Date.now();
        return {
          chain: config.name,
          requiresFeeAuth: true,
          hasValidSignature: isValid,
          expirationDate: sig.hasSignature ? sig.expirationDate : null,
          note: isValid
            ? "Fee authorization is valid. Ready to generate deposit address."
            : "Fee authorization is needed before generating a deposit address.",
        };
      } catch {
        return {
          chain: config.name,
          requiresFeeAuth: true,
          hasValidSignature: false,
          expirationDate: null,
          note: "Fee authorization is needed before generating a deposit address.",
        };
      }
    }

    return {
      chain: config.name,
      requiresFeeAuth: false,
      hasValidSignature: false,
      expirationDate: null,
      note: "This chain requires an address confirmation signature (not fee auth). The signing will happen when generating the deposit address.",
    };
  },
};

export const prepareBtcDeposit: ToolDefinition<
  { address: string; chainId: number },
  {
    action: string;
    method: string;
    params: { address: string; chainId: number };
    description: string;
  }
> = {
  name: "prepare_btc_deposit",
  description:
    "Prepare to generate a BTC deposit address for native Bitcoin staking. " +
    "The user's wallet will be prompted to sign the required authorization " +
    "(fee auth on Ethereum/Sepolia, address confirmation on other chains), " +
    "then a unique BTC deposit address will be created. The user can then " +
    "send BTC to this address to receive LBTC.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    return {
      action: "sdk_execute",
      method: "btc.generateDepositAddress",
      params: { address, chainId: config.chainId },
      description: `Generate a BTC deposit address for ${address.slice(0, 6)}...${address.slice(-4)} on ${config.name}. Your wallet will prompt you to sign an authorization.`,
    };
  },
};

// ─── Write Tools (return tx params, don't execute) ────────────────────

export const prepareStake: ToolDefinition<{ amount: string; chainId: number }> =
  {
    name: "prepare_stake",
    description:
      "Prepare a BTC.b to LBTC stake transaction. Returns transaction parameters for the user's wallet to sign.",
    parameters: StakeSchema as Record<string, unknown>,
    schema: StakeZod,
    execute: async (params) => {
      const { amount, chainId } = StakeZod.parse(params);
      const config = getChainConfig(chainId);
      return {
        action: "sdk_execute",
        method: "evm.stake",
        params: {
          amount,
          chainId: config.chainId,
          assetIn: "BTCb",
          assetOut: "LBTC",
        },
        description: `Stake ${amount} BTC.b to receive LBTC on ${config.name}`,
      };
    },
  };

export const prepareUnstake: ToolDefinition<{
  amount: string;
  outputAsset: string;
  recipient?: string;
  chainId: number;
}> = {
  name: "prepare_unstake",
  description:
    "Prepare an LBTC unstake transaction. Returns parameters for the user's wallet to sign.",
  parameters: UnstakeSchema as Record<string, unknown>,
  schema: UnstakeZod,
  execute: async (params) => {
    const { amount, outputAsset, recipient, chainId } =
      UnstakeZod.parse(params);
    if (outputAsset === "BTC" && !recipient) {
      throw new Error("recipient address is required when unstaking to BTC");
    }
    const config = getChainConfig(chainId);
    return {
      action: "sdk_execute",
      method: "evm.unstake",
      params: {
        amount,
        outputAsset,
        recipient,
        chainId: config.chainId,
      },
      description: `Unstake ${amount} LBTC to ${outputAsset} on ${config.name}`,
    };
  },
};

export const prepareDeployToVault: ToolDefinition<{
  amount: string;
  protocol: string;
  chainId: number;
}> = {
  name: "prepare_deploy_to_vault",
  description:
    "Prepare a transaction to deploy LBTC into a DeFi vault for yield. Returns parameters for wallet signing.",
  parameters: DeployToVaultSchema as Record<string, unknown>,
  schema: DeployToVaultZod,
  execute: async (params) => {
    const { amount, protocol, chainId } = DeployToVaultZod.parse(params);
    const config = getChainConfig(chainId);
    return {
      action: "sdk_execute",
      method: "evm.deploy",
      params: {
        amount,
        protocol,
        chainId: config.chainId,
        token: "LBTC",
      },
      description: `Deploy ${amount} LBTC to ${protocol} vault on ${config.name}`,
    };
  },
};

/**
 * All Lombard tools as an array.
 */
export const allTools: AnyToolDefinition[] = [
  getLbtcBalance,
  getBtcbBalance,
  getBalance,
  getExchangeRate,
  getDepositStatusTool,
  getUnstakeStatusTool,
  getStrategies,
  getDepositBtcAddress,
  checkFeeAuthorization,
  prepareBtcDeposit,
  prepareStake,
  prepareUnstake,
  prepareDeployToVault,
];

/**
 * All Lombard tools as a name-keyed record.
 */
export const toolsByName: Record<string, AnyToolDefinition> =
  Object.fromEntries(allTools.map((t) => [t.name, t]));
