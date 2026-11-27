/**
 * Morpho Blue protocol integration for LBTC markets.
 *
 * Queries the Morpho GraphQL API for market data and constructs
 * unsigned transactions for supplying LBTC as collateral.
 */
import {
  BTC_DECIMALS,
  ChainId,
  Env,
  getLbtcContractAddresses,
  makePublicClient,
} from "@lombard.finance/sdk";
import type { Address } from "viem";
import { encodeFunctionData, erc20Abi, formatUnits, parseUnits } from "viem";
import type { z } from "zod";

import { getChainConfig } from "./chains";
import {
  MorphoBorrowSchema,
  MorphoBorrowZod,
  MorphoLbtcMarketsSchema,
  MorphoLbtcMarketsZod,
  MorphoPositionSchema,
  MorphoPositionZod,
  MorphoRepaySchema,
  MorphoRepayZod,
  MorphoSupplyCollateralSchema,
  MorphoSupplyCollateralZod,
} from "./schemas";
import type { ToolDefinition } from "./tools";

// ─── Constants ──────────────────────────────────────────────────────

/** Morpho Blue singleton contract on Ethereum mainnet */
const MORPHO_BLUE_ADDRESS =
  "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const;

/** LBTC token address on Ethereum mainnet, resolved via the SDK. */
const LBTC_ADDRESS = getLbtcContractAddresses(Env.prod)[
  ChainId.ethereum
] as Address;

const MORPHO_API_URL = "https://api.morpho.org/graphql";

/** Minimum TVL in USD to surface a market (filters out dust) */
const MIN_TVL_USD = 10_000;

// ─── Morpho Blue ABI (subset) ───────────────────────────────────────

const MARKET_PARAMS_TUPLE = {
  name: "marketParams",
  type: "tuple",
  components: [
    { name: "loanToken", type: "address" },
    { name: "collateralToken", type: "address" },
    { name: "oracle", type: "address" },
    { name: "irm", type: "address" },
    { name: "lltv", type: "uint256" },
  ],
} as const;

const morphoSupplyCollateralAbi = [
  {
    name: "supplyCollateral",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: "assets", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const morphoBorrowAbi = [
  {
    name: "borrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    outputs: [
      { name: "assetsBorrowed", type: "uint256" },
      { name: "sharesBorrowed", type: "uint256" },
    ],
  },
] as const;

const morphoPositionAbi = [
  {
    name: "position",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
  {
    name: "market",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
  },
] as const;

const morphoRepayAbi = [
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      MARKET_PARAMS_TUPLE,
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "assetsRepaid", type: "uint256" },
      { name: "sharesRepaid", type: "uint256" },
    ],
  },
] as const;

/** Morpho oracles expose price() returning collateral price in loan token terms, scaled by 1e36 */
const morphoOracleAbi = [
  {
    name: "price",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Morpho Blue uses 1e36 as the oracle price scale factor */
const ORACLE_PRICE_SCALE = 10n ** 36n;

/** WAD = 10^18, the precision Morpho Blue uses for LTV / LLTV ratios. */
const WAD = 10n ** 18n;

/**
 * Fraction of LLTV below which a position is considered Healthy.
 * Above this and up to LLTV, the position is At risk; at/above LLTV it is
 * Liquidatable. Mirrors common Morpho UI conventions.
 */
const HEALTHY_THRESHOLD = 0.8;

export type MorphoHealthStatus =
  | "Empty"
  | "Bad debt"
  | "Collateral only (no borrows)"
  | "Unknown (oracle unavailable)"
  | "Healthy"
  | "At risk"
  | "Liquidatable";

export interface MorphoPositionHealthInputs {
  /** Raw collateral amount as returned by `Morpho.position`. */
  collateralRaw: bigint;
  /** Borrow amount in loan-asset units, after converting shares to assets. */
  borrowAssetsRaw: bigint;
  /** Oracle price scaled by `ORACLE_PRICE_SCALE` (1e36). */
  oraclePrice: bigint;
  /** Liquidation LTV as returned by `Morpho.market`, scaled by WAD (1e18). */
  lltvRaw: bigint;
}

export interface MorphoPositionHealth {
  /** LTV as a 0-1 fraction; 0 when there is no debt. */
  currentLtv: number;
  /** LLTV as a 0-1 fraction. */
  lltv: number;
  healthStatus: MorphoHealthStatus;
}

/**
 * Classifies a Morpho Blue position's health from the raw on-chain values.
 * Extracted from the `get_morpho_position` tool so it can be unit-tested
 * without an RPC dependency.
 */
export function computeMorphoPositionHealth({
  collateralRaw,
  borrowAssetsRaw,
  oraclePrice,
  lltvRaw,
}: MorphoPositionHealthInputs): MorphoPositionHealth {
  const lltv = Number(formatUnits(lltvRaw, 18));

  if (collateralRaw === 0n) {
    return {
      currentLtv: 0,
      lltv,
      healthStatus: borrowAssetsRaw > 0n ? "Bad debt" : "Empty",
    };
  }
  if (borrowAssetsRaw === 0n) {
    return {
      currentLtv: 0,
      lltv,
      healthStatus: "Collateral only (no borrows)",
    };
  }
  if (oraclePrice === 0n) {
    return {
      currentLtv: 0,
      lltv,
      healthStatus: "Unknown (oracle unavailable)",
    };
  }

  // LTV = borrowAssets / (collateral * oraclePrice / ORACLE_PRICE_SCALE)
  const collateralValue = (collateralRaw * oraclePrice) / ORACLE_PRICE_SCALE;
  const ltvWad = (borrowAssetsRaw * WAD) / collateralValue;
  const currentLtv = Number(formatUnits(ltvWad, 18));

  const lltvHealthy = lltv * HEALTHY_THRESHOLD;
  let healthStatus: MorphoHealthStatus;
  if (currentLtv < lltvHealthy) healthStatus = "Healthy";
  else if (currentLtv < lltv) healthStatus = "At risk";
  else healthStatus = "Liquidatable";

  return { currentLtv, lltv, healthStatus };
}

// ─── GraphQL Queries ────────────────────────────────────────────────

const LBTC_MARKETS_QUERY = `{
  markets(where: {
    collateralAssetAddress_in: ["${LBTC_ADDRESS}"],
    chainId_in: [1]
  }) {
    items {
      marketId: uniqueKey
      loanAsset { symbol address decimals }
      collateralAsset { symbol address decimals }
      oracleAddress
      irmAddress
      lltv
      state {
        supplyApy
        borrowApy
        supplyAssetsUsd
        borrowAssetsUsd
        utilization
      }
    }
  }
}`;

function marketByIdQuery(marketId: string): string {
  return `{
    marketByUniqueKey(uniqueKey: "${marketId}", chainId: 1) {
      marketId: uniqueKey
      loanAsset { symbol address decimals }
      collateralAsset { symbol address decimals }
      oracleAddress
      irmAddress
      lltv
      state {
        supplyApy
        borrowApy
        supplyAssetsUsd
        borrowAssetsUsd
        utilization
      }
    }
  }`;
}

// ─── Types ──────────────────────────────────────────────────────────

interface MorphoMarketRaw {
  marketId: string;
  loanAsset: { symbol: string; address: string; decimals: number };
  collateralAsset: { symbol: string; address: string; decimals: number };
  oracleAddress: string;
  irmAddress: string;
  lltv: string;
  state: {
    supplyApy: number;
    borrowApy: number;
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
  };
}

// ─── API Helpers ────────────────────────────────────────────────────

async function queryMorphoApi<T>(query: string): Promise<T> {
  const res = await fetch(MORPHO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Morpho API returned ${res.status}`);
  }
  const json = (await res.json()) as {
    data: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`Morpho API error: ${json.errors[0].message}`);
  }
  return json.data;
}

function formatMarket(m: MorphoMarketRaw) {
  const tvlUsd = m.state.supplyAssetsUsd;
  return {
    marketId: m.marketId,
    loanAsset: m.loanAsset.symbol,
    loanAssetAddress: m.loanAsset.address,
    collateralAsset: m.collateralAsset.symbol,
    collateralAssetAddress: m.collateralAsset.address,
    supplyApy: `${(m.state.supplyApy * 100).toFixed(2)}%`,
    borrowApy: `${(m.state.borrowApy * 100).toFixed(2)}%`,
    tvlUsd: `$${tvlUsd >= 1_000_000 ? `${(tvlUsd / 1_000_000).toFixed(2)}M` : tvlUsd >= 1_000 ? `${(tvlUsd / 1_000).toFixed(1)}K` : tvlUsd.toFixed(0)}`,
    utilization: `${(m.state.utilization * 100).toFixed(1)}%`,
    lltv: `${((Number(m.lltv) / 1e18) * 100).toFixed(0)}%`,
    description: `Borrow ${m.loanAsset.symbol} against LBTC collateral (${(m.state.supplyApy * 100).toFixed(2)}% supply APY, ${((Number(m.lltv) / 1e18) * 100).toFixed(0)}% LLTV)`,
  };
}

// ─── Tool Definitions ───────────────────────────────────────────────

export const getMorphoLbtcMarkets: ToolDefinition<
  z.infer<typeof MorphoLbtcMarketsZod>,
  {
    markets: ReturnType<typeof formatMarket>[];
    note: string;
    error?: string;
  }
> = {
  name: "get_morpho_lbtc_markets",
  description:
    "List Morpho Blue lending markets where LBTC is used as collateral. " +
    "Returns market IDs, loan assets, supply/borrow APYs, TVL, and utilization. " +
    "Use this to find markets where users can supply LBTC as collateral to borrow other assets.",
  parameters: MorphoLbtcMarketsSchema as Record<string, unknown>,
  schema: MorphoLbtcMarketsZod,
  execute: async (_params) => {
    try {
      const data = await queryMorphoApi<{
        markets: { items: MorphoMarketRaw[] };
      }>(LBTC_MARKETS_QUERY);

      const active = data.markets.items
        .filter((m) => m.state.supplyAssetsUsd >= MIN_TVL_USD)
        .sort((a, b) => b.state.supplyAssetsUsd - a.state.supplyAssetsUsd)
        .map(formatMarket);

      return {
        markets: active,
        note:
          active.length > 0
            ? `Found ${active.length} active Morpho markets with LBTC collateral on Ethereum mainnet. Supply LBTC as collateral to borrow the loan asset.`
            : "No active Morpho markets found for LBTC.",
      };
    } catch (err) {
      return {
        markets: [],
        note: "",
        error:
          err instanceof Error ? err.message : "Failed to fetch Morpho markets",
      };
    }
  },
};

export const prepareMorphoSupplyCollateral: ToolDefinition<
  z.infer<typeof MorphoSupplyCollateralZod>,
  {
    action: string;
    method?: string;
    params?: Record<string, unknown>;
    marketId: string;
    description: string;
    error?: string;
  }
> = {
  name: "prepare_morpho_supply_collateral",
  description:
    "Prepare transactions to supply LBTC as collateral to a Morpho Blue market. " +
    "Returns two unsigned transactions: (1) ERC-20 approve for the Morpho contract, " +
    "and (2) supplyCollateral call. The user's wallet signs both.",
  parameters: MorphoSupplyCollateralSchema as Record<string, unknown>,
  schema: MorphoSupplyCollateralZod,
  execute: async (params) => {
    const { marketId, amount, address } =
      MorphoSupplyCollateralZod.parse(params);

    try {
      // Fetch full market params from Morpho API
      const data = await queryMorphoApi<{
        marketByUniqueKey: MorphoMarketRaw | null;
      }>(marketByIdQuery(marketId));

      const market = data.marketByUniqueKey;
      if (!market) {
        return {
          action: "error",
          marketId,
          description: "",
          error: `Market ${marketId} not found on Morpho.`,
        };
      }

      // Verify LBTC is the collateral asset
      if (
        market.collateralAsset.address.toLowerCase() !==
        LBTC_ADDRESS.toLowerCase()
      ) {
        return {
          action: "error",
          marketId,
          description: "",
          error: `This market uses ${market.collateralAsset.symbol} as collateral, not LBTC.`,
        };
      }

      const assetsRaw = parseUnits(amount, BTC_DECIMALS);

      // 1. ERC-20 approve
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [MORPHO_BLUE_ADDRESS, assetsRaw],
      });

      // 2. supplyCollateral
      const marketParams = {
        loanToken: market.loanAsset.address as Address,
        collateralToken: market.collateralAsset.address as Address,
        oracle: market.oracleAddress as Address,
        irm: market.irmAddress as Address,
        lltv: BigInt(market.lltv),
      };

      const supplyData = encodeFunctionData({
        abi: morphoSupplyCollateralAbi,
        functionName: "supplyCollateral",
        args: [
          marketParams,
          assetsRaw,
          address as Address,
          "0x" as `0x${string}`,
        ],
      });

      return {
        action: "sdk_execute",
        method: "morpho.supplyCollateral",
        params: {
          chainId: 1, // Morpho Blue is Ethereum mainnet only
          transactions: [
            {
              to: LBTC_ADDRESS,
              data: approveData,
              label: `Approve Morpho to spend ${amount} LBTC`,
            },
            {
              to: MORPHO_BLUE_ADDRESS,
              data: supplyData,
              label: `Supply ${amount} LBTC as collateral to ${market.loanAsset.symbol}/LBTC market`,
            },
          ],
        },
        marketId,
        description: `Supply ${amount} LBTC as collateral to the ${market.loanAsset.symbol}/LBTC Morpho market (${((Number(market.lltv) / 1e18) * 100).toFixed(0)}% LLTV, ${(market.state.supplyApy * 100).toFixed(2)}% supply APY). This requires two transactions: approve + supply.`,
      };
    } catch (err) {
      return {
        action: "error",
        marketId,
        description: "",
        error:
          err instanceof Error
            ? err.message
            : "Failed to prepare Morpho supply",
      };
    }
  },
};

// ─── Borrow Tool ────────────────────────────────────────────────────

export const prepareMorphoBorrow: ToolDefinition<
  z.infer<typeof MorphoBorrowZod>,
  {
    action: string;
    method?: string;
    params?: Record<string, unknown>;
    marketId: string;
    description: string;
    error?: string;
  }
> = {
  name: "prepare_morpho_borrow",
  description:
    "Prepare a transaction to borrow from a Morpho Blue market where the user has LBTC collateral. " +
    "The user must have already supplied LBTC as collateral to this market. " +
    "Returns an unsigned borrow transaction for the user's wallet to sign.",
  parameters: MorphoBorrowSchema as Record<string, unknown>,
  schema: MorphoBorrowZod,
  execute: async (params) => {
    const { marketId, amount, address } = MorphoBorrowZod.parse(params);

    try {
      const data = await queryMorphoApi<{
        marketByUniqueKey: MorphoMarketRaw | null;
      }>(marketByIdQuery(marketId));

      const market = data.marketByUniqueKey;
      if (!market) {
        return {
          action: "error",
          marketId,
          description: "",
          error: `Market ${marketId} not found on Morpho.`,
        };
      }

      const borrowAmount = parseUnits(amount, market.loanAsset.decimals);

      const marketParams = {
        loanToken: market.loanAsset.address as Address,
        collateralToken: market.collateralAsset.address as Address,
        oracle: market.oracleAddress as Address,
        irm: market.irmAddress as Address,
        lltv: BigInt(market.lltv),
      };

      const borrowData = encodeFunctionData({
        abi: morphoBorrowAbi,
        functionName: "borrow",
        args: [
          marketParams,
          borrowAmount,
          0n, // shares = 0 means borrow by asset amount
          address as Address, // onBehalf
          address as Address, // receiver
        ],
      });

      return {
        action: "sdk_execute",
        method: "morpho.borrow",
        params: {
          chainId: 1,
          transactions: [
            {
              to: MORPHO_BLUE_ADDRESS,
              data: borrowData,
              label: `Borrow ${amount} ${market.loanAsset.symbol} from ${market.loanAsset.symbol}/LBTC market`,
            },
          ],
        },
        marketId,
        description: `Borrow ${amount} ${market.loanAsset.symbol} against your LBTC collateral on the ${market.loanAsset.symbol}/LBTC Morpho market (${(market.state.borrowApy * 100).toFixed(2)}% borrow APY).`,
      };
    } catch (err) {
      return {
        action: "error",
        marketId,
        description: "",
        error:
          err instanceof Error
            ? err.message
            : "Failed to prepare Morpho borrow",
      };
    }
  },
};

// ─── Repay Tool ─────────────────────────────────────────────────────

export const prepareMorphoRepay: ToolDefinition<
  z.infer<typeof MorphoRepayZod>,
  {
    action: string;
    method?: string;
    params?: Record<string, unknown>;
    marketId: string;
    description: string;
    error?: string;
  }
> = {
  name: "prepare_morpho_repay",
  description:
    "Prepare transactions to repay borrowed assets on a Morpho Blue market. " +
    "Returns two unsigned transactions: (1) ERC-20 approve for the Morpho contract, " +
    "and (2) repay call. The user must have the loan asset in their wallet.",
  parameters: MorphoRepaySchema as Record<string, unknown>,
  schema: MorphoRepayZod,
  execute: async (params) => {
    const { marketId, amount, address } = MorphoRepayZod.parse(params);

    try {
      const data = await queryMorphoApi<{
        marketByUniqueKey: MorphoMarketRaw | null;
      }>(marketByIdQuery(marketId));

      const market = data.marketByUniqueKey;
      if (!market) {
        return {
          action: "error",
          marketId,
          description: "",
          error: `Market ${marketId} not found on Morpho.`,
        };
      }

      const repayAmount = parseUnits(amount, market.loanAsset.decimals);

      // 1. ERC-20 approve for the loan asset
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [MORPHO_BLUE_ADDRESS, repayAmount],
      });

      // 2. Repay
      const marketParams = {
        loanToken: market.loanAsset.address as Address,
        collateralToken: market.collateralAsset.address as Address,
        oracle: market.oracleAddress as Address,
        irm: market.irmAddress as Address,
        lltv: BigInt(market.lltv),
      };

      const repayData = encodeFunctionData({
        abi: morphoRepayAbi,
        functionName: "repay",
        args: [
          marketParams,
          repayAmount,
          0n, // shares = 0 means repay by asset amount
          address as Address, // onBehalf
          "0x" as `0x${string}`, // data (no callback)
        ],
      });

      return {
        action: "sdk_execute",
        method: "morpho.repay",
        params: {
          chainId: 1,
          transactions: [
            {
              to: market.loanAsset.address,
              data: approveData,
              label: `Approve Morpho to spend ${amount} ${market.loanAsset.symbol}`,
            },
            {
              to: MORPHO_BLUE_ADDRESS,
              data: repayData,
              label: `Repay ${amount} ${market.loanAsset.symbol} on ${market.loanAsset.symbol}/LBTC market`,
            },
          ],
        },
        marketId,
        description: `Repay ${amount} ${market.loanAsset.symbol} on the ${market.loanAsset.symbol}/${market.collateralAsset.symbol} Morpho market. This requires two transactions: approve + repay.`,
      };
    } catch (err) {
      return {
        action: "error",
        marketId,
        description: "",
        error:
          err instanceof Error
            ? err.message
            : "Failed to prepare Morpho repay",
      };
    }
  },
};

// ─── Position Tool ──────────────────────────────────────────────────

export const getMorphoPosition: ToolDefinition<
  z.infer<typeof MorphoPositionZod>,
  {
    collateral: string;
    borrowAssets: string;
    loanAsset: string;
    loanAssetAddress: string;
    collateralAsset: string;
    collateralAssetAddress: string;
    lltv: string;
    currentLtv: string;
    healthStatus: string;
    error?: string;
  }
> = {
  name: "get_morpho_position",
  description:
    "Get the user's position in a Morpho Blue market: collateral deposited, amount borrowed, " +
    "current LTV, and health status. Returns token addresses for use with get_token_balance.",
  parameters: MorphoPositionSchema as Record<string, unknown>,
  schema: MorphoPositionZod,
  execute: async (params) => {
    const { marketId, address } = MorphoPositionZod.parse(params);
    const empty = {
      collateral: "0",
      borrowAssets: "0",
      loanAsset: "",
      loanAssetAddress: "",
      collateralAsset: "LBTC",
      collateralAssetAddress: LBTC_ADDRESS,
      lltv: "",
      currentLtv: "0%",
      healthStatus: "No position",
    };

    try {
      // Fetch market metadata
      const data = await queryMorphoApi<{
        marketByUniqueKey: MorphoMarketRaw | null;
      }>(marketByIdQuery(marketId));

      const market = data.marketByUniqueKey;
      if (!market) {
        return { ...empty, error: `Market ${marketId} not found.` };
      }

      // Read on-chain position and market state
      const config = getChainConfig(1);
      const client = makePublicClient({
        chainId: config.chainId,
        env: config.env,
      });

      // Read on-chain: position, market totals, and oracle price
      const [positionResult, marketState, oraclePrice] = await Promise.all([
        client.readContract({
          address: MORPHO_BLUE_ADDRESS,
          abi: morphoPositionAbi,
          functionName: "position",
          args: [marketId as `0x${string}`, address as Address],
        }),
        client.readContract({
          address: MORPHO_BLUE_ADDRESS,
          abi: morphoPositionAbi,
          functionName: "market",
          args: [marketId as `0x${string}`],
        }),
        client.readContract({
          address: market.oracleAddress as Address,
          abi: morphoOracleAbi,
          functionName: "price",
        }),
      ]);

      const collateralRaw = positionResult[2]; // uint128
      const borrowSharesRaw = positionResult[1]; // uint128

      // Convert borrow shares to assets: assets = shares * totalAssets / totalShares
      const totalBorrowAssets = marketState[2]; // uint128
      const totalBorrowShares = marketState[3]; // uint128
      const borrowAssetsRaw =
        totalBorrowShares > 0n
          ? (borrowSharesRaw * totalBorrowAssets) / totalBorrowShares
          : 0n;

      const collateral = formatUnits(collateralRaw, BTC_DECIMALS);
      const borrowAssets = formatUnits(
        borrowAssetsRaw,
        market.loanAsset.decimals,
      );

      const { currentLtv, lltv, healthStatus } = computeMorphoPositionHealth({
        collateralRaw,
        borrowAssetsRaw,
        oraclePrice: oraclePrice as bigint,
        lltvRaw: BigInt(market.lltv),
      });

      return {
        collateral,
        borrowAssets,
        loanAsset: market.loanAsset.symbol,
        loanAssetAddress: market.loanAsset.address,
        collateralAsset: market.collateralAsset.symbol,
        collateralAssetAddress: market.collateralAsset.address,
        lltv: `${(lltv * 100).toFixed(0)}%`,
        currentLtv: `${(currentLtv * 100).toFixed(1)}%`,
        healthStatus,
      };
    } catch (err) {
      return {
        ...empty,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch Morpho position",
      };
    }
  },
};
