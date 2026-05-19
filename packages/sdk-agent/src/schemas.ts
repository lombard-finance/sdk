/**
 * Zod schema definitions for all Lombard agent tools.
 * These are the single source of truth; JSON Schema versions are derived automatically.
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ─── Shared field schemas ────────────────────────────────────────────

export const evmAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

export const amount = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Must be a numeric string")
  .refine(
    (v) => parseFloat(v) > 0 && parseFloat(v) < 1000,
    "Amount must be positive and under 1000",
  );

export const CHAIN_ID_DESCRIPTION =
  "Chain ID. Default to the user's connected chain (provided in your wallet context) unless they specify a different one. Supported: 1=Ethereum, 11155111=Sepolia, 8453=Base, 84532=Base Sepolia.";

export const chainId = z.number().describe(CHAIN_ID_DESCRIPTION);

// ─── Zod Schemas ─────────────────────────────────────────────────────

export const AddressAndChainZod = z.object({
  address: evmAddress.describe("EVM wallet address (0x...)"),
  chainId: chainId,
});

export const ExchangeRateZod = z.object({
  chainId: z
    .number()
    .optional()
    .describe("Chain ID for environment resolution (optional)"),
});

export const StakeZod = z.object({
  amount: amount.describe("Amount of BTC.b to stake (e.g. '0.1')"),
  chainId: chainId,
});

export const LbtcToBtcZod = z.object({
  amount: amount.describe("Amount of LBTC to convert to native BTC"),
  recipient: z
    .string()
    .describe(
      "Bitcoin destination address. MUST be a valid Bitcoin address for the network (bc1.../1.../3... mainnet; tb1.../m.../n.../2... testnet). Ask the user for this explicitly, never infer from prior context.",
    ),
  chainId: chainId,
});

export const LbtcToBtcbZod = z.object({
  amount: amount.describe("Amount of LBTC to convert to BTC.b on the same chain"),
  chainId: chainId,
});

export const BalanceZod = AddressAndChainZod;

export const StrategiesZod = z.object({
  chainId: z
    .number()
    .optional()
    .describe(
      "Chain ID to filter strategies (optional, returns all if omitted)",
    ),
});

export const DepositBtcZod = AddressAndChainZod;

export const DeployToVaultZod = z.object({
  amount: amount.describe("Amount of LBTC to deploy"),
  chainId: chainId,
});

export const LbtcApyZod = z.object({});

export const VaultWithdrawalZod = z.object({
  amount: amount.describe("Amount of vault shares to withdraw"),
  address: evmAddress.describe(
    "EVM wallet address requesting the withdrawal. Used to check for an existing active withdrawal (only one is allowed per user per vault).",
  ),
  chainId: chainId,
});

export const ClaimDepositZod = z.object({
  depositTxHash: z
    .string()
    .min(1)
    .describe("The BTC deposit transaction hash to claim"),
  address: evmAddress.describe("EVM wallet address that owns the deposit"),
  chainId: chainId,
});

export const RedeemBtcbZod = z.object({
  amount: amount.describe("Amount of BTC.b to redeem for native BTC"),
  recipient: z
    .string()
    .describe(
      "Bitcoin destination address for the redeemed BTC. MUST be a valid Bitcoin address for the network (bc1.../1.../3... mainnet; tb1.../m.../n.../2... testnet). Ask the user for this explicitly — never infer from prior context.",
    ),
  chainId: chainId,
});

export const TokenInfoZod = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Free-text token name or symbol (e.g. 'BTCe', 'LBTC', 'Bitcoin Earn vault share').",
    ),
  address: z
    .string()
    .optional()
    .describe(
      "Optional contract address (0x...). When provided, chainId is required too.",
    ),
  chainId: z
    .number()
    .optional()
    .describe("Chain ID for an address-based lookup."),
});

// ─── Cancel Withdrawal Schema ──────────────────────────────────────

export const CancelWithdrawalZod = z.object({
  address: evmAddress.describe(
    "EVM wallet address that owns the active withdrawal being cancelled.",
  ),
  chainId: chainId,
});

// ─── Address-Only Schema ───────────────────────────────────────────

export const AddressOnlyZod = z.object({
  address: evmAddress.describe("EVM wallet address (0x...)"),
});

// ─── Opportunities Schema ───────────────────────────────────────────

export const OpportunitiesZod = z.object({
  category: z
    .string()
    .optional()
    .describe(
      "Filter by category: automated-strategy, borrow-stables, looping, dex-lp, other",
    ),
  chain: z.string().optional().describe("Filter by chain (e.g. Ethereum, Base, Solana)"),
  protocol: z.string().optional().describe("Filter by protocol (e.g. Morpho, Aave, Uniswap)"),
});

// ─── Generic Token Balance Schema ────────────────────────────────────

export const TokenBalanceZod = z.object({
  tokenAddress: evmAddress.describe(
    "ERC-20 token contract address (0x...). Get this from tool results like get_morpho_lbtc_markets, not from memory.",
  ),
  address: evmAddress.describe("EVM wallet address to check balance for"),
  chainId: chainId,
});

// ─── Morpho Schemas ─────────────────────────────────────────────────

export const MorphoLbtcMarketsZod = z.object({});

export const morphoMarketId = z
  .string()
  .regex(
    /^0x[a-fA-F0-9]{64}$/,
    "Invalid Morpho market ID (must be 0x + 64 hex chars)",
  )
  .describe("Morpho Blue market ID (from get_morpho_lbtc_markets)");

export const MorphoSupplyCollateralZod = z.object({
  marketId: morphoMarketId,
  amount: amount.describe(
    "Amount of LBTC to supply as collateral (e.g. '0.1')",
  ),
  address: evmAddress.describe("EVM wallet address supplying the collateral"),
});

export const MorphoBorrowZod = z.object({
  marketId: morphoMarketId,
  amount: amount.describe(
    "Amount of loan asset to borrow (e.g. '100' for 100 USDC)",
  ),
  address: evmAddress.describe("EVM wallet address borrowing the asset"),
});

export const MorphoRepayZod = z.object({
  marketId: morphoMarketId,
  amount: amount.describe(
    "Amount of loan asset to repay (e.g. '1' for 1 USDC)",
  ),
  address: evmAddress.describe("EVM wallet address repaying the debt"),
});

export const MorphoPositionZod = z.object({
  marketId: morphoMarketId,
  address: evmAddress.describe("EVM wallet address to check position for"),
});

// ─── Derived JSON Schemas (backward-compatible exports) ──────────────

interface JsonObjectSchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

function toJsonSchema(zodSchema: z.ZodType): JsonObjectSchema {
  return zodToJsonSchema(zodSchema, { target: "openAi" }) as JsonObjectSchema;
}

export const CancelWithdrawalSchema = toJsonSchema(CancelWithdrawalZod);
export const AddressOnlySchema = toJsonSchema(AddressOnlyZod);
export const AddressAndChainSchema = toJsonSchema(AddressAndChainZod);
export const ExchangeRateSchema = toJsonSchema(ExchangeRateZod);
export const StakeSchema = toJsonSchema(StakeZod);
export const LbtcToBtcSchema = toJsonSchema(LbtcToBtcZod);
export const LbtcToBtcbSchema = toJsonSchema(LbtcToBtcbZod);
export const BalanceSchema = toJsonSchema(BalanceZod);
export const StrategiesSchema = toJsonSchema(StrategiesZod);
export const DepositBtcSchema = toJsonSchema(DepositBtcZod);
export const DeployToVaultSchema = toJsonSchema(DeployToVaultZod);
export const LbtcApySchema = toJsonSchema(LbtcApyZod);
export const VaultWithdrawalSchema = toJsonSchema(VaultWithdrawalZod);
export const ClaimDepositSchema = toJsonSchema(ClaimDepositZod);
export const OpportunitiesSchema = toJsonSchema(OpportunitiesZod);
export const TokenBalanceSchema = toJsonSchema(TokenBalanceZod);
export const TokenInfoSchema = toJsonSchema(TokenInfoZod);
export const RedeemBtcbSchema = toJsonSchema(RedeemBtcbZod);
export const MorphoLbtcMarketsSchema = toJsonSchema(MorphoLbtcMarketsZod);
export const MorphoSupplyCollateralSchema = toJsonSchema(
  MorphoSupplyCollateralZod,
);
export const MorphoBorrowSchema = toJsonSchema(MorphoBorrowZod);
export const MorphoRepaySchema = toJsonSchema(MorphoRepayZod);
export const MorphoPositionSchema = toJsonSchema(MorphoPositionZod);
