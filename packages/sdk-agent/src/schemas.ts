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
  .refine((v) => parseFloat(v) > 0 && parseFloat(v) < 1000, "Amount must be positive and under 1000");

export const CHAIN_ID_DESCRIPTION =
  "Chain ID (1=Ethereum, 11155111=Sepolia, 8453=Base, 84532=Base Sepolia)";

export const chainId = z.number().describe(CHAIN_ID_DESCRIPTION);

// ─── Zod Schemas ─────────────────────────────────────────────────────

export const AddressAndChainZod = z.object({
  address: evmAddress.describe("EVM wallet address (0x...)"),
  chainId: chainId,
});

export const ExchangeRateZod = z.object({
  chainId: z.number().optional().describe("Chain ID for environment resolution (optional)"),
});

export const StakeZod = z.object({
  amount: amount.describe("Amount of BTC.b to stake (e.g. '0.1')"),
  chainId: chainId,
});

export const UnstakeZod = z.object({
  amount: amount.describe("Amount of LBTC to unstake"),
  outputAsset: z.enum(["BTC", "BTCb"]).describe("Output: BTC (cross-chain) or BTCb (same chain)"),
  recipient: z.string().optional().describe("Destination address (required for BTC output)"),
  chainId: chainId,
});

export const BalanceZod = AddressAndChainZod;

export const StrategiesZod = z.object({
  chainId: z
    .number()
    .optional()
    .describe("Chain ID to filter strategies (optional, returns all if omitted)"),
});

export const DepositBtcZod = AddressAndChainZod;

export const DeployToVaultZod = z.object({
  amount: amount.describe("Amount of LBTC to deploy"),
  protocol: z.enum(["veda"]).describe("Vault protocol"),
  chainId: chainId,
});

export const LbtcApyZod = z.object({});

export const VaultWithdrawalZod = z.object({
  amount: amount.describe("Amount of vault shares to withdraw"),
  chainId: chainId,
});

export const ClaimDepositZod = z.object({
  depositTxHash: z.string().min(1).describe("The BTC deposit transaction hash to claim"),
  address: evmAddress.describe("EVM wallet address that owns the deposit"),
  chainId: chainId,
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

export const AddressAndChainSchema = toJsonSchema(AddressAndChainZod);
export const ExchangeRateSchema = toJsonSchema(ExchangeRateZod);
export const StakeSchema = toJsonSchema(StakeZod);
export const UnstakeSchema = toJsonSchema(UnstakeZod);
export const BalanceSchema = toJsonSchema(BalanceZod);
export const StrategiesSchema = toJsonSchema(StrategiesZod);
export const DepositBtcSchema = toJsonSchema(DepositBtcZod);
export const DeployToVaultSchema = toJsonSchema(DeployToVaultZod);
export const LbtcApySchema = toJsonSchema(LbtcApyZod);
export const VaultWithdrawalSchema = toJsonSchema(VaultWithdrawalZod);
export const ClaimDepositSchema = toJsonSchema(ClaimDepositZod);
