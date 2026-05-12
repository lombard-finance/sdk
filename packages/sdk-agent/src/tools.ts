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
  type EarnWithdrawal,
  type EarnWithdrawals,
  Env,
  fromSatoshi,
  getApy,
  getDepositBtcAddress as sdkGetDepositBtcAddress,
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  getEarnApy,
  getEarnPosition,
  getEarnTVL,
  getEarnWithdrawals,
  getExchangeRatio,
  getLBTCExchangeRate,
  getNetworkFeeSignature,
  getPointsByAddress,
  getPositionsSummary,
  getTokenContractInfo,
  getUnstakesByAddress,
  makePublicClient,
  requiresAutoMintFee,
  Token,
} from "@lombard.finance/sdk";
import { type Address, formatUnits } from "viem";
import type { z } from "zod";

import {
  LOMBARD_ASSETS,
  type LombardAsset,
  resolveAssetByAddress,
  resolveAssetByName,
} from "./assets";
import { getChainConfig } from "./chains";
import {
  AddressAndChainSchema,
  AddressAndChainZod,
  AddressOnlySchema,
  AddressOnlyZod,
  BalanceSchema,
  BalanceZod,
  CancelWithdrawalSchema,
  CancelWithdrawalZod,
  ClaimDepositSchema,
  ClaimDepositZod,
  DeployToVaultSchema,
  DeployToVaultZod,
  DepositBtcSchema,
  DepositBtcZod,
  ExchangeRateSchema,
  ExchangeRateZod,
  LbtcApySchema,
  LbtcApyZod,
  OpportunitiesSchema,
  OpportunitiesZod,
  RedeemBtcbSchema,
  RedeemBtcbZod,
  StakeSchema,
  StakeZod,
  StrategiesSchema,
  StrategiesZod,
  TokenBalanceSchema,
  TokenBalanceZod,
  TokenInfoSchema,
  TokenInfoZod,
  UnstakeSchema,
  UnstakeZod,
  VaultWithdrawalSchema,
  VaultWithdrawalZod,
} from "./schemas";
import {
  resolvePartnerId,
  validateAmountInputs,
  validateRedeemBtcbInputs,
  validateStakeInputs,
  validateUnstakeInputs,
  type ValidationFailure,
} from "./validation";

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

/**
 * Shape returned by prepare_* tools on success. The frontend executes the
 * transaction by dispatching on `method`. `valid: true` tags this as the
 * happy path so the LLM can branch cleanly on it vs ValidationFailure.
 */
export interface PreparedTx {
  valid: true;
  action: string;
  method: string;
  params: Record<string, unknown>;
  description: string;
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

  const balance = await withTimeout(
    client.readContract({
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
    }),
    10_000,
    `${token}.balanceOf on ${config.name}`,
  );

  const decimals =
    "decimals" in tokenInfo && typeof tokenInfo.decimals === "number"
      ? tokenInfo.decimals
      : 8;
  return formatUnits(balance, decimals);
}

// ─── Read Tools ───────────────────────────────────────────────────────

export const getLbtcBalance: ToolDefinition<
  { address: string; chainId: number },
  {
    balance: string;
    token: string;
    chain: string;
    address: string;
    error?: string;
  }
> = {
  name: "get_lbtc_balance",
  description: "Check the LBTC balance for a wallet address on a given chain.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const { name } = getChainConfig(chainId);
    try {
      const balance = await readTokenBalance(Token.LBTC, address, chainId);
      return { balance, token: "LBTC", chain: name, address };
    } catch (err) {
      return {
        balance: "",
        token: "LBTC",
        chain: name,
        address,
        error: err instanceof Error ? err.message : "Failed to fetch LBTC balance",
      };
    }
  },
};

export const getBtcbBalance: ToolDefinition<
  { address: string; chainId: number },
  {
    balance: string;
    token: string;
    chain: string;
    address: string;
    error?: string;
  }
> = {
  name: "get_btcb_balance",
  description:
    "Check the BTC.b (cross-chain Bitcoin) balance for a wallet address on a given chain.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const { name } = getChainConfig(chainId);
    try {
      const balance = await readTokenBalance(Token.BTCb, address, chainId);
      return { balance, token: "BTC.b", chain: name, address };
    } catch (err) {
      return {
        balance: "",
        token: "BTC.b",
        chain: name,
        address,
        error: err instanceof Error ? err.message : "Failed to fetch BTC.b balance",
      };
    }
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
          rawPayload: d.rawPayload || null,
          proofSignature: d.proof || null,
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
  {
    lbtc: string;
    btcb: string;
    chain: string;
    address: string;
    error?: string;
  }
> = {
  name: "get_balance",
  description:
    "Check both LBTC and BTC.b balances for a wallet on a given chain in a single call.",
  parameters: BalanceSchema as Record<string, unknown>,
  schema: BalanceZod,
  execute: async (params) => {
    const { address, chainId } = BalanceZod.parse(params);
    const config = getChainConfig(chainId);
    const [lbtc, btcb] = await Promise.all([
      readTokenBalance(Token.LBTC, address, chainId).catch((e) =>
        e instanceof Error ? `error: ${e.message}` : "error",
      ),
      readTokenBalance(Token.BTCb, address, chainId).catch((e) =>
        e instanceof Error ? `error: ${e.message}` : "error",
      ),
    ]);
    return { lbtc, btcb, chain: config.name, address };
  },
};

// ─── Generic ERC-20 balance reading ─────────────────────────────────

const erc20BalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * Schema for get_token_info. The tool accepts either a free-text symbol/name
 * (LBTC, BTCe, "Bitcoin Earn vault share") OR a contract address scoped to
 * a chain. At least one must be provided.
 */
export const getTokenInfo: ToolDefinition<
  { query?: string; address?: string; chainId?: number },
  {
    found: boolean;
    asset?: {
      symbol: string;
      name: string;
      description: string;
      decimals: number;
      isLombardIssued: boolean;
      isYieldBearing: boolean;
      addresses: Record<string, string>;
      notes?: string;
    };
    suggestions?: string[];
    note: string;
  }
> = {
  name: "get_token_info",
  description:
    "Look up a Lombard-related asset by symbol, alias, or contract address. Returns the canonical name, description, decimals, and per-chain contract addresses. Use this whenever the user mentions a token you're not sure about (BTCe, LBTCv, etc.) before telling them you don't recognize it.",
  parameters: TokenInfoSchema as Record<string, unknown>,
  schema: TokenInfoZod,
  execute: async (params) => {
    const suggestions = LOMBARD_ASSETS.map((a) => a.symbol);

    const formatAsset = (asset: LombardAsset) => {
      const addrMap: Record<string, string> = {};
      for (const [k, v] of Object.entries(asset.addresses)) {
        if (v) addrMap[k] = v;
      }
      return {
        symbol: asset.symbol,
        name: asset.name,
        description: asset.description,
        decimals: asset.decimals,
        isLombardIssued: asset.isLombardIssued,
        isYieldBearing: asset.isYieldBearing,
        addresses: addrMap,
        ...(asset.notes ? { notes: asset.notes } : {}),
      };
    };

    if (params.address && typeof params.chainId === "number") {
      const found = resolveAssetByAddress(params.chainId, params.address);
      if (found) {
        return {
          found: true,
          asset: formatAsset(found),
          note: `Address ${params.address} on chainId ${params.chainId} is ${found.symbol}.`,
        };
      }
      return {
        found: false,
        suggestions,
        note: `Address ${params.address} on chainId ${params.chainId} is not a Lombard-issued asset.`,
      };
    }

    if (params.query) {
      const found = resolveAssetByName(params.query);
      if (found) {
        return {
          found: true,
          asset: formatAsset(found),
          note: `Resolved "${params.query}" to ${found.symbol}.`,
        };
      }
      return {
        found: false,
        suggestions,
        note: `"${params.query}" is not a known Lombard asset. Known symbols: ${suggestions.join(", ")}.`,
      };
    }

    return {
      found: false,
      suggestions,
      note: "Provide a `query` (symbol/name) or both `address` and `chainId`.",
    };
  },
};

export const getTokenBalance: ToolDefinition<
  { tokenAddress: string; address: string; chainId: number },
  {
    balance: string;
    symbol: string;
    tokenAddress: string;
    chain: string;
    error?: string;
  }
> = {
  name: "get_token_balance",
  description:
    "Check the balance of any ERC-20 token for a wallet address. " +
    "Requires the token contract address (0x...). Get addresses from other tool results " +
    "(e.g. loanAsset.address from get_morpho_lbtc_markets). " +
    "Reads symbol and decimals directly from the contract. " +
    "Use this for tokens beyond LBTC and BTC.b.",
  parameters: TokenBalanceSchema as Record<string, unknown>,
  schema: TokenBalanceZod,
  execute: async (params) => {
    const { tokenAddress, address, chainId } = TokenBalanceZod.parse(params);
    const config = getChainConfig(chainId);
    const client = makePublicClient({
      chainId: config.chainId,
      env: config.env,
    });

    try {
      const [balance, decimals, symbol] = await Promise.all([
        client.readContract({
          address: tokenAddress as Address,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [address as Address],
        }),
        client.readContract({
          address: tokenAddress as Address,
          abi: erc20BalanceAbi,
          functionName: "decimals",
        }),
        client.readContract({
          address: tokenAddress as Address,
          abi: erc20BalanceAbi,
          functionName: "symbol",
        }),
      ]);
      return {
        balance: formatUnits(balance, decimals),
        symbol,
        tokenAddress,
        chain: config.name,
      };
    } catch (err) {
      return {
        balance: "",
        symbol: "",
        tokenAddress,
        chain: config.name,
        error:
          err instanceof Error ? err.message : "Failed to read token balance",
      };
    }
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
    "List available yield strategies where LBTC can be deployed for additional yield. " +
    "Currently includes Bitcoin Earn (passive vault yield). Returns name, chain, APY, and TVL.",
  parameters: StrategiesSchema as Record<string, unknown>,
  schema: StrategiesZod,
  // Vault data is mainnet-only regardless of chainId
  execute: async (params) => {
    const { chainId: _chainId } = StrategiesZod.parse(params);
    // Vault APY only works on Ethereum mainnet — always query prod/mainnet
    const env = Env.prod;
    try {
      const [apyData, tvlData] = await Promise.all([
        getEarnApy({ env }),
        getEarnTVL({ env }),
      ]);

      const latestApy = apyData.length > 0 ? apyData[apyData.length - 1] : null;

      return {
        strategies: [
          {
            vault: "Bitcoin Earn",
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

// ─── Opportunities Tool ─────────────────────────────────────────────

const BFF_BASE_URL =
  process.env.LOMBARD_BFF_URL || "https://bff.prod.lombard-fi.com";

export const getOpportunities: ToolDefinition<
  { category?: string; chain?: string; protocol?: string },
  {
    opportunities: Array<{
      id: string;
      name: string;
      category: string;
      protocol: string;
      chain: string;
      tokens: Record<string, string | undefined>;
      metrics: Record<string, number | undefined>;
      luxMultiplier?: string;
      description?: string;
      url?: string;
    }>;
    error?: string;
  }
> = {
  name: "get_opportunities",
  description:
    "List LBTC and BTC.b DeFi opportunities across protocols and chains. " +
    "Includes borrow-stables, looping, DEX LP, automated strategies, and more. " +
    "Filter by category (borrow-stables, looping, dex-lp, automated-strategy, other), chain, or protocol.",
  parameters: OpportunitiesSchema as Record<string, unknown>,
  schema: OpportunitiesZod,
  execute: async (params) => {
    const { category, chain, protocol } = OpportunitiesZod.parse(params);
    try {
      const queryParts: string[] = [];
      if (category) queryParts.push(`category=${encodeURIComponent(category)}`);
      if (chain) queryParts.push(`chain=${encodeURIComponent(chain)}`);
      if (protocol)
        queryParts.push(`protocol=${encodeURIComponent(protocol)}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await fetch(`${BFF_BASE_URL}/opportunities-api${qs}`);
      if (!res.ok) {
        throw new Error(`BFF returned ${res.status}`);
      }
      const data = (await res.json()) as {
        opportunities: Array<Record<string, unknown>>;
      };
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opportunities: data.opportunities as any[],
      };
    } catch (err) {
      return {
        opportunities: [],
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch opportunities",
      };
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
        partnerId: resolvePartnerId(config.env),
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
    "Prepare a native BTC -> LBTC deposit address. Use this when the user wants LBTC (yield-bearing). The wallet will prompt for fee authorization (Ethereum/Sepolia) or an address confirmation (other chains), then a unique BTC deposit address is generated.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    return {
      action: "sdk_execute",
      method: "btc.generateDepositAddress",
      params: { address, chainId: config.chainId },
      description: `Generate a BTC deposit address for ${address} on ${config.name}. The deposit will mint LBTC. Your wallet will prompt you to sign an authorization.`,
    };
  },
};

export const prepareBtcToBtcbDeposit: ToolDefinition<
  { address: string; chainId: number },
  {
    action: string;
    method: string;
    params: { address: string; chainId: number };
    description: string;
  }
> = {
  name: "prepare_btc_to_btcb_deposit",
  description:
    "Prepare a native BTC -> BTC.b deposit address. Use this when the user wants BTC.b (cross-chain wrapped Bitcoin, NOT yield-bearing). Distinct flow from prepare_btc_deposit (which produces LBTC). The wallet will prompt for the required authorization, then a unique BTC deposit address is generated that mints BTC.b on the destination EVM chain.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    return {
      action: "sdk_execute",
      method: "btc.generateBtcbDepositAddress",
      params: { address, chainId: config.chainId },
      description: `Generate a BTC -> BTC.b deposit address for ${address} on ${config.name}. The deposit will mint BTC.b on the destination EVM chain. Your wallet will prompt you to sign an authorization.`,
    };
  },
};

// ─── Write Tools (return tx params, don't execute) ────────────────────

export const prepareStake: ToolDefinition<
  { amount: string; chainId: number },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_stake",
  description:
    "Prepare a BTC.b → LBTC stake. Returns transaction parameters for the user's wallet to sign, or a validation failure listing what to ask the user for.",
  parameters: StakeSchema as Record<string, unknown>,
  schema: StakeZod,
  execute: async (params) => {
    const parsed = StakeZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const v = validateStakeInputs(parsed.data);
    if (!v.valid) return v;
    const { amount, chainId } = parsed.data;
    const config = getChainConfig(chainId);
    return {
      valid: true,
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

export const prepareUnstake: ToolDefinition<
  {
    amount: string;
    outputAsset: string;
    recipient?: string;
    chainId: number;
  },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_unstake",
  description:
    "Prepare an LBTC unstake. When outputAsset is 'BTC', the user MUST supply a Bitcoin destination address — do not infer or fill it from prior context. Returns either prepared transaction parameters or a validation failure listing what to ask the user for.",
  parameters: UnstakeSchema as Record<string, unknown>,
  schema: UnstakeZod,
  execute: async (params) => {
    const parsed = UnstakeZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const v = validateUnstakeInputs(parsed.data);
    if (!v.valid) return v;
    const { amount, outputAsset, recipient, chainId } = parsed.data;
    const config = getChainConfig(chainId);
    return {
      valid: true,
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

export const prepareRedeemBtcb: ToolDefinition<
  { amount: string; recipient: string; chainId: number },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_redeem_btcb",
  description:
    "Prepare a redemption of BTC.b for native BTC. Distinct from prepare_unstake (which operates on LBTC). The user MUST supply a Bitcoin destination address — do not infer or fill it from prior context. Returns either prepared transaction parameters or a validation failure listing what to ask the user for.",
  parameters: RedeemBtcbSchema as Record<string, unknown>,
  schema: RedeemBtcbZod,
  execute: async (params) => {
    const parsed = RedeemBtcbZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const v = validateRedeemBtcbInputs(parsed.data);
    if (!v.valid) return v;
    const { amount, recipient, chainId } = parsed.data;
    const config = getChainConfig(chainId);
    return {
      valid: true,
      action: "sdk_execute",
      method: "evm.redeemBtcb",
      params: {
        amount,
        recipient,
        chainId: config.chainId,
      },
      description: `Redeem ${amount} BTC.b to native BTC on ${config.name}. Destination: ${recipient}.`,
    };
  },
};

export const prepareDeployToVault: ToolDefinition<
  { amount: string; chainId: number },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_deploy_to_vault",
  description:
    "Prepare a transaction to deploy LBTC into Bitcoin Earn. Returns prepared transaction parameters or a validation failure.",
  parameters: DeployToVaultSchema as Record<string, unknown>,
  schema: DeployToVaultZod,
  execute: async (params) => {
    const parsed = DeployToVaultZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const v = validateAmountInputs(parsed.data);
    if (!v.valid) return v;
    const { amount, chainId } = parsed.data;
    const config = getChainConfig(chainId);
    return {
      valid: true,
      action: "sdk_execute",
      method: "evm.deploy",
      params: { amount, chainId: config.chainId, token: "LBTC" },
      description: `Deploy ${amount} LBTC to Bitcoin Earn on ${config.name}`,
    };
  },
};

export const prepareVaultWithdrawal: ToolDefinition<
  { amount: string; address: string; chainId: number },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_vault_withdrawal",
  description:
    "Prepare a withdrawal from Bitcoin Earn. Only one active withdrawal is allowed per user per vault — this tool checks first and refuses if one is already queued, returning its details so you can offer the user prepare_cancel_withdrawal. On success, returns prepared transaction parameters.",
  parameters: VaultWithdrawalSchema as Record<string, unknown>,
  schema: VaultWithdrawalZod,
  execute: async (params) => {
    const parsed = VaultWithdrawalZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const v = validateAmountInputs(parsed.data);
    if (!v.valid) return v;
    const { amount, address, chainId } = parsed.data;
    const config = getChainConfig(chainId);

    // Pre-flight: only one active withdrawal allowed per user per vault.
    // If one already exists, refuse with its details so the LLM can offer
    // prepare_cancel_withdrawal instead of stacking a second request.
    try {
      const data = (await withTimeout(
        getEarnWithdrawals({
          account: address as Address,
          chainId: config.chainId,
          env: config.env,
        }),
        15_000,
        "getEarnWithdrawals",
      )) as EarnWithdrawals;
      const active = data.open[0];
      if (active) {
        return {
          valid: false,
          missing: [],
          errors: [
            `An active withdrawal already exists for ${address} on ${config.name}: ${active.shareAmount.toString()} shares queued (request tx ${active.txHash}). Only one active withdrawal is allowed per vault.`,
          ],
          note: `Tell the user about the existing withdrawal (shareAmount=${active.shareAmount.toString()}, txHash=${active.txHash}, deadline=${active.deadline}) and ask whether they want to cancel it via prepare_cancel_withdrawal before queuing a new one. Do not retry prepare_vault_withdrawal until they confirm.`,
        };
      }
    } catch (err) {
      // If the check itself fails, don't block the user — surface the
      // error in the note but proceed. A backend stall here would
      // otherwise lock the user out of withdrawing entirely.
      return {
        valid: false,
        missing: [],
        errors: [
          err instanceof Error
            ? `Could not verify active withdrawals: ${err.message}`
            : "Could not verify active withdrawals.",
        ],
        note: "The active-withdrawal check failed. Tell the user this is a backend issue, suggest they run get_vault_withdrawals manually to confirm no active withdrawal exists, and only proceed with prepare_vault_withdrawal after they confirm.",
      };
    }

    return {
      valid: true,
      action: "sdk_execute",
      method: "evm.withdrawFromVault",
      params: { amount, chainId: config.chainId },
      description: `Withdraw ${amount} shares from Bitcoin Earn on ${config.name}. Withdrawals are queued and may take time to process.`,
    };
  },
};

// ─── APY & Vault Position Tools ──────────────────────────────────────

export const getLbtcApy: ToolDefinition<
  Record<string, never>,
  { baseApy: string; effectiveApy: string; description: string; error?: string }
> = {
  name: "get_lbtc_apy",
  description:
    "Get the current LBTC base staking APY (annual percentage yield). " +
    "Returns both the base and effective APY for LBTC staking.",
  parameters: LbtcApySchema as Record<string, unknown>,
  schema: LbtcApyZod,
  execute: async () => {
    try {
      const apy = await withTimeout(
        getApy({ env: Env.prod }),
        10_000,
        "getApy",
      );
      const basePercent = apy.baseApy.multipliedBy(100).toFixed(2);
      const effectivePercent = apy.effectiveApy.multipliedBy(100).toFixed(2);
      return {
        baseApy: apy.baseApy.toString(),
        effectiveApy: apy.effectiveApy.toString(),
        description: `LBTC base staking APY: ${basePercent}%. Effective APY (with compounding/incentives): ${effectivePercent}%.`,
      };
    } catch (err) {
      return {
        baseApy: "",
        effectiveApy: "",
        description: "",
        error: err instanceof Error ? err.message : "Failed to fetch LBTC APY",
      };
    }
  },
};

export const getVaultPositions: ToolDefinition<
  { address: string; chainId: number },
  {
    shares: string;
    shareValue: string;
    estimatedLbtcValue: string;
    vault: string;
    chain: string;
    error?: string;
  }
> = {
  name: "get_vault_positions",
  description:
    "Get a user's Bitcoin Earn positions including shares held and their estimated LBTC value. " +
    "Currently supports Bitcoin Earn on Ethereum mainnet.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    try {
      const position = await withTimeout(
        getEarnPosition({ address, chainId: config.chainId }),
        10_000,
        "getEarnPosition",
      );
      return {
        shares: position.totalShares.toString(),
        shareValue: position.exchangeRate.toString(),
        estimatedLbtcValue: position.position.toString(),
        vault: "Bitcoin Earn",
        chain: config.name,
      };
    } catch (err) {
      return {
        shares: "",
        shareValue: "",
        estimatedLbtcValue: "",
        vault: "Bitcoin Earn",
        chain: config.name,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch vault positions",
      };
    }
  },
};

// ─── Claim Deposit Tool ─────────────────────────────────────────────

export const prepareClaimDeposit: ToolDefinition<
  { depositTxHash: string; address: string; chainId: number },
  {
    action: string;
    method: string;
    params: {
      depositTxHash: string;
      rawPayload: string;
      proofSignature: string;
      chainId: number;
    };
    description: string;
    error?: string;
  }
> = {
  name: "prepare_claim_deposit",
  description:
    "Prepare a transaction to claim (mint) LBTC from a notarized BTC deposit. " +
    "Checks if the deposit is claimable and returns the transaction parameters for wallet signing.",
  parameters: ClaimDepositSchema as Record<string, unknown>,
  schema: ClaimDepositZod,
  execute: async (params) => {
    const { depositTxHash, address, chainId } = ClaimDepositZod.parse(params);
    const config = getChainConfig(chainId);
    const deposits = await getDepositsByAddress({
      address: address as Address,
      env: config.env,
    });

    const deposit = deposits.find((d) => d.txHash === depositTxHash);

    if (!deposit) {
      return {
        action: "error",
        method: "",
        params: {
          depositTxHash,
          rawPayload: "",
          proofSignature: "",
          chainId: config.chainId,
        },
        description: "",
        error:
          "Could not find a deposit with this transaction hash for the given address. Use get_deposit_status to verify the transaction hash.",
      };
    }

    const status = getDepositStatus(deposit);

    if (status !== "claimable") {
      const display = getDepositStatusDisplay(status);
      return {
        action: "error",
        method: "",
        params: {
          depositTxHash,
          rawPayload: "",
          proofSignature: "",
          chainId: config.chainId,
        },
        description: "",
        error: `Deposit is not claimable. Current status: ${display.label}. ${display.description}`,
      };
    }

    return {
      action: "sdk_execute",
      method: "evm.claimDeposit",
      params: {
        depositTxHash,
        rawPayload: deposit.rawPayload!,
        proofSignature: deposit.proof!,
        chainId: config.chainId,
      },
      description: `Claim LBTC from deposit ${depositTxHash.slice(0, 10)}... on ${config.name}. Your wallet will prompt you to sign the mint transaction.`,
    };
  },
};

// ─── Cancel Withdrawal Tool ────────────────────────────────────────

export const prepareCancelWithdrawal: ToolDefinition<
  { address: string; chainId: number },
  PreparedTx | ValidationFailure
> = {
  name: "prepare_cancel_withdrawal",
  description:
    "Cancel an active Bitcoin Earn withdrawal that has not yet been processed. Looks up the user's active withdrawal first; refuses if none exists, includes its details in the description if one does, then returns the cancel transaction parameters.",
  parameters: CancelWithdrawalSchema as Record<string, unknown>,
  schema: CancelWithdrawalZod,
  execute: async (params) => {
    const parsed = CancelWithdrawalZod.safeParse(params);
    if (!parsed.success) {
      return {
        valid: false,
        missing: [],
        errors: parsed.error.issues.map((i) => i.message),
        note: "Surface the listed errors to the user and re-prompt with valid input.",
      };
    }
    const { address, chainId } = parsed.data;
    const config = getChainConfig(chainId);

    let activeDetails = "";
    try {
      const data = (await withTimeout(
        getEarnWithdrawals({
          account: address as Address,
          chainId: config.chainId,
          env: config.env,
        }),
        15_000,
        "getEarnWithdrawals",
      )) as EarnWithdrawals;
      const active = data.open[0];
      if (!active) {
        return {
          valid: false,
          missing: [],
          errors: [
            `No active withdrawal found for ${address} on ${config.name}. There is nothing to cancel.`,
          ],
          note: "Tell the user there is no active withdrawal to cancel. If they think there should be, suggest get_vault_withdrawals to inspect their full withdrawal history.",
        };
      }
      activeDetails = ` Active withdrawal: ${active.shareAmount.toString()} shares (request tx ${active.txHash}, deadline ${active.deadline}).`;
    } catch (err) {
      return {
        valid: false,
        missing: [],
        errors: [
          err instanceof Error
            ? `Could not verify active withdrawals before cancelling: ${err.message}`
            : "Could not verify active withdrawals before cancelling.",
        ],
        note: "Backend issue. Ask the user to retry in a moment, or to verify via get_vault_withdrawals first.",
      };
    }

    return {
      valid: true,
      action: "sdk_execute",
      method: "evm.cancelWithdrawal",
      params: { chainId: config.chainId },
      description: `Cancel pending Bitcoin Earn withdrawal on ${config.name}.${activeDetails} Your wallet will prompt you to sign the cancellation transaction.`,
    };
  },
};

// ─── Vault Withdrawals Tool ────────────────────────────────────────

export const getVaultWithdrawalsTool: ToolDefinition<
  { address: string; chainId: number },
  {
    withdrawals: {
      open: Array<{
        txHash: string;
        shareAmount: string;
        deadline: number;
        timestamp: number;
      }>;
      fulfilled: Array<{
        txHash: string;
        shareAmount: string;
        amount: string;
        fulfilledTxHash: string | null;
      }>;
      cancelled: Array<{
        txHash: string;
        shareAmount: string;
        timestamp: number;
      }>;
      expired: Array<{
        txHash: string;
        shareAmount: string;
        timestamp: number;
      }>;
    };
    chain: string;
    error?: string;
  }
> = {
  name: "get_vault_withdrawals",
  description:
    "Get all vault withdrawals for an address, including open (pending), fulfilled, cancelled, and expired withdrawals.",
  parameters: AddressAndChainSchema as Record<string, unknown>,
  schema: AddressAndChainZod,
  execute: async (params) => {
    const { address, chainId } = AddressAndChainZod.parse(params);
    const config = getChainConfig(chainId);
    try {
      const data = (await withTimeout(
        getEarnWithdrawals({
          account: address as Address,
          chainId: config.chainId,
          env: config.env,
        }),
        15_000,
        "getEarnWithdrawals",
      )) as EarnWithdrawals;
      return {
        withdrawals: {
          open: data.open.map((w: EarnWithdrawal) => ({
            txHash: w.txHash,
            shareAmount: w.shareAmount.toString(),
            deadline: w.deadline,
            timestamp: w.timestamp,
          })),
          fulfilled: data.fulfilled.map((w: EarnWithdrawal) => ({
            txHash: w.txHash,
            shareAmount: w.shareAmount.toString(),
            amount: w.amount?.toString() ?? "unknown",
            fulfilledTxHash: w.fulfilledTxHash ?? null,
          })),
          cancelled: data.cancelled.map((w: EarnWithdrawal) => ({
            txHash: w.txHash,
            shareAmount: w.shareAmount.toString(),
            timestamp: w.timestamp,
          })),
          expired: data.expired.map((w: EarnWithdrawal) => ({
            txHash: w.txHash,
            shareAmount: w.shareAmount.toString(),
            timestamp: w.timestamp,
          })),
        },
        chain: config.name,
      };
    } catch (err) {
      return {
        withdrawals: { open: [], fulfilled: [], cancelled: [], expired: [] },
        chain: config.name,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch vault withdrawals",
      };
    }
  },
};

// ─── Lux Points Tool ──────────────────────────────────────────────

export const getLuxPoints: ToolDefinition<
  { address: string },
  {
    points: {
      totalPoints: number;
      holdingPoints: number;
      protocolPoints: number;
      referralPoints: number;
      badgesPoints: number;
      protocolPointsBreakdown: Record<string, number>;
    };
    season: number;
    error?: string;
  }
> = {
  name: "get_lux_points",
  description:
    "Get the Lux reward points for a wallet address. Returns the current season's points " +
    "including holding, protocol, referral, and badge points.",
  parameters: AddressOnlySchema as Record<string, unknown>,
  schema: AddressOnlyZod,
  execute: async (params) => {
    const { address } = AddressOnlyZod.parse(params);
    try {
      const data = await withTimeout(
        getPointsByAddress({
          address,
          env: Env.prod,
          season: 2,
        }),
        10_000,
        "getPointsByAddress",
      );
      return {
        points: {
          totalPoints: data.totalPoints,
          holdingPoints: data.holdingPoints,
          protocolPoints: data.protocolPoints,
          referralPoints: data.referralPoints,
          badgesPoints: data.badgesPoints,
          protocolPointsBreakdown: data.protocolPointsBreakdown,
        },
        season: 2,
      };
    } catch (err) {
      return {
        points: {
          totalPoints: 0,
          holdingPoints: 0,
          protocolPoints: 0,
          referralPoints: 0,
          badgesPoints: 0,
          protocolPointsBreakdown: {},
        },
        season: 2,
        error:
          err instanceof Error ? err.message : "Failed to fetch Lux points",
      };
    }
  },
};

// ─── Positions Summary Tool ───────────────────────────────────────

export const getPositionsSummaryTool: ToolDefinition<
  { address: string },
  {
    btcPriceUsd: string;
    btcValue: string;
    btcPnl: string;
    positions: Array<{
      token: string | undefined;
      type: string;
      balance: string;
      pnl: string;
      rate: string;
    }>;
    lastUpdated: string;
    inProgress: boolean;
    error?: string;
  }
> = {
  name: "get_positions_summary",
  description:
    "Get an aggregated portfolio summary for a wallet address, including total BTC value, " +
    "profit/loss, and a breakdown of individual positions (holdings and DeFi).",
  parameters: AddressOnlySchema as Record<string, unknown>,
  schema: AddressOnlyZod,
  execute: async (params) => {
    const { address } = AddressOnlyZod.parse(params);
    try {
      const data = await withTimeout(
        getPositionsSummary({
          account: address as Address,
          env: Env.prod,
        }),
        10_000,
        "getPositionsSummary",
      );
      return {
        btcPriceUsd: data.btcPrice.price.toString(),
        btcValue: data.btcValue.toString(),
        btcPnl: data.btcPnl.toString(),
        positions: data.snapshot.map((p) => ({
          token: p.token,
          type: p.type,
          balance: p.balance.toString(),
          pnl: p.pnl.toString(),
          rate: p.rate.toString(),
        })),
        lastUpdated: data.lastUpdated.toISOString(),
        inProgress: data.inProgress,
      };
    } catch (err) {
      return {
        btcPriceUsd: "",
        btcValue: "",
        btcPnl: "",
        positions: [],
        lastUpdated: "",
        inProgress: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch positions summary",
      };
    }
  },
};

import {
  getMorphoLbtcMarkets,
  getMorphoPosition,
  prepareMorphoBorrow,
  prepareMorphoRepay,
  prepareMorphoSupplyCollateral,
} from "./morpho";

export {
  getMorphoLbtcMarkets,
  getMorphoPosition,
  prepareMorphoBorrow,
  prepareMorphoRepay,
  prepareMorphoSupplyCollateral,
};

/**
 * All Lombard tools as an array.
 */
export const allTools: AnyToolDefinition[] = [
  getLbtcBalance,
  getBtcbBalance,
  getBalance,
  getTokenBalance,
  getTokenInfo,
  getExchangeRate,
  getDepositStatusTool,
  getUnstakeStatusTool,
  getStrategies,
  getOpportunities,
  getDepositBtcAddress,
  checkFeeAuthorization,
  prepareBtcDeposit,
  prepareBtcToBtcbDeposit,
  prepareStake,
  prepareUnstake,
  prepareRedeemBtcb,
  prepareDeployToVault,
  prepareVaultWithdrawal,
  prepareCancelWithdrawal,
  getLbtcApy,
  getVaultPositions,
  prepareClaimDeposit,
  getMorphoLbtcMarkets,
  prepareMorphoSupplyCollateral,
  prepareMorphoBorrow,
  prepareMorphoRepay,
  getMorphoPosition,
];

/**
 * All Lombard tools as a name-keyed record.
 */
export const toolsByName: Record<string, AnyToolDefinition> =
  Object.fromEntries(allTools.map((t) => [t.name, t]));
