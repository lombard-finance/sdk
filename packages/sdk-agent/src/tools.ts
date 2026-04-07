/**
 * Framework-agnostic tool definitions for Lombard protocol operations.
 *
 * Each tool has:
 * - name: unique identifier
 * - description: what the tool does (for LLM context)
 * - parameters: JSON Schema for input validation
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
  getTokenContractInfo,
  getUnstakesByAddress,
  getVaultApy,
  getVaultTVL,
  Token,
  Vault,
} from "@lombard.finance/sdk";
import { type Address,createPublicClient, formatUnits, http } from "viem";

import { getChainConfig } from "./chains";
import {
  AddressAndChainSchema,
  BalanceSchema,
  DeployToVaultSchema,
  DepositBtcSchema,
  ExchangeRateSchema,
  StakeSchema,
  StrategiesSchema,
  UnstakeSchema,
} from "./schemas";

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: TParams) => Promise<TResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>;

// ─── Helpers ──────────────────────────────────────────────────────────

async function readTokenBalance(
  token: Token,
  address: string,
  chainId: number,
): Promise<string> {
  const config = getChainConfig(chainId);
  const tokenInfo = await getTokenContractInfo(token, config.chainId, config.env);
  const client = createPublicClient({ chain: config.chain, transport: http() });

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

  // LBTC and BTC.b both use 8 decimals
  return formatUnits(balance, 8);
}

// ─── Read Tools ───────────────────────────────────────────────────────

export const getLbtcBalance: ToolDefinition<
  { address: string; chainId: number },
  { balance: string; token: string; chain: string; address: string }
> = {
  name: "get_lbtc_balance",
  description: "Check the LBTC (Lombard Staked Bitcoin) balance for a wallet address.",
  parameters: AddressAndChainSchema,
  execute: async ({ address, chainId }) => {
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
  description: "Check the BTC.b (wrapped Bitcoin) balance for a wallet address.",
  parameters: AddressAndChainSchema,
  execute: async ({ address, chainId }) => {
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
  }
> = {
  name: "get_exchange_rate",
  description:
    "Get the current LBTC/BTC exchange rate and minimum stake amount. " +
    "LBTC accrues staking yield over time, so 1 LBTC is worth slightly more than 1 BTC.",
  parameters: ExchangeRateSchema,
  execute: async ({ chainId }) => {
    try {
      const env = chainId ? getChainConfig(chainId).env : Env.prod;
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
        error: err instanceof Error ? err.message : "Failed to fetch exchange rate",
      };
    }
  },
};

export const getDepositStatusTool: ToolDefinition<{ address: string; chainId: number }> = {
  name: "get_deposit_status",
  description:
    "Check the status of all deposits for an address. Shows pending, claimable, and claimed deposits.",
  parameters: AddressAndChainSchema,
  execute: async ({ address, chainId }: { address: string; chainId: number }) => {
    const { env } = getChainConfig(chainId);
    const deposits = await getDepositsByAddress({ address: address as Address, env });

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

export const getUnstakeStatusTool: ToolDefinition<{ address: string; chainId: number }> = {
  name: "get_unstake_status",
  description: "Check the status of all unstake/redeem operations for an address.",
  parameters: AddressAndChainSchema,
  execute: async ({ address, chainId }: { address: string; chainId: number }) => {
    const { env } = getChainConfig(chainId);
    const unstakes = await getUnstakesByAddress({ address: address as Address, env });

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
  parameters: BalanceSchema,
  execute: async ({ address, chainId }) => {
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
  { strategies: Array<{ vault: string; chain: string; apy: string; tvlBtc: string }> }
> = {
  name: "get_strategies",
  description:
    "List available yield strategies (DeFi vaults) where LBTC can be deployed for additional yield. " +
    "Returns vault name, chain, current APY, and TVL for each strategy.",
  parameters: StrategiesSchema,
  // Vault data is mainnet-only regardless of chainId
  execute: async ({ chainId: _chainId }) => {
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
            apy: latestApy ? `${latestApy.apy.toFixed(2)}%` : "N/A",
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
  parameters: DepositBtcSchema,
  execute: async ({ address, chainId }) => {
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

// ─── Write Tools (return tx params, don't execute) ────────────────────

export const prepareStake: ToolDefinition<{ amount: string; chainId: number }> = {
  name: "prepare_stake",
  description:
    "Prepare a BTC.b to LBTC stake transaction. Returns transaction parameters for the user's wallet to sign.",
  parameters: StakeSchema,
  execute: async ({ amount, chainId }: { amount: string; chainId: number }) => {
    const { name } = getChainConfig(chainId);
    return {
      action: "sign_transaction",
      type: "stake",
      description: `Stake ${amount} BTC.b to receive LBTC on ${name}`,
      params: { amount, tokenIn: "BTCb", tokenOut: "LBTC", chainId },
      note: "Transaction will be sent to your wallet for signing.",
    };
  },
};

export const prepareUnstake: ToolDefinition<{ amount: string; outputAsset: string; recipient?: string; chainId: number }> = {
  name: "prepare_unstake",
  description:
    "Prepare an LBTC unstake transaction. Returns parameters for the user's wallet to sign.",
  parameters: UnstakeSchema,
  execute: async ({
    amount,
    outputAsset,
    recipient,
    chainId,
  }: {
    amount: string;
    outputAsset: string;
    recipient?: string;
    chainId: number;
  }) => {
    if (outputAsset === "BTC" && !recipient) {
      throw new Error("recipient address is required when unstaking to BTC");
    }
    const { name } = getChainConfig(chainId);
    return {
      action: "sign_transaction",
      type: "unstake",
      description: `Unstake ${amount} LBTC to ${outputAsset} on ${name}`,
      params: { amount, outputAsset, recipient, chainId },
      note:
        outputAsset === "BTC"
          ? "Cross-chain unstake. BTC will arrive after processing."
          : "Same-chain redeem to BTC.b.",
    };
  },
};

export const prepareDeployToVault: ToolDefinition<{ amount: string; protocol: string; chainId: number }> = {
  name: "prepare_deploy_to_vault",
  description:
    "Prepare a transaction to deploy LBTC into a DeFi vault for yield. Returns parameters for wallet signing.",
  parameters: DeployToVaultSchema,
  execute: async ({
    amount,
    protocol,
    chainId,
  }: {
    amount: string;
    protocol: string;
    chainId: number;
  }) => {
    const { name } = getChainConfig(chainId);
    return {
      action: "sign_transaction",
      type: "deploy_to_vault",
      description: `Deploy ${amount} LBTC to ${protocol} vault on ${name}`,
      params: { amount, protocol, token: "LBTC", chainId },
      note: "Deploying to a vault earns additional DeFi yield on top of base staking rewards.",
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
  prepareStake,
  prepareUnstake,
  prepareDeployToVault,
];

/**
 * All Lombard tools as a name-keyed record.
 */
export const toolsByName: Record<string, AnyToolDefinition> = Object.fromEntries(
  allTools.map((t) => [t.name, t]),
);
