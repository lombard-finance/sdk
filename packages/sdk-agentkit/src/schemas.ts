import { z } from "zod";

export const StakeBtcbToLbtcSchema = z.object({
  amount: z
    .string()
    .describe(
      "Amount of BTC.b to stake in human-readable format (e.g. '0.1' for 0.1 BTC.b). Will be converted to LBTC.",
    )
    .refine((v) => /^\d+(\.\d+)?$/.test(v), "Amount must be a numeric string")
    .refine((v) => parseFloat(v) > 0, "Amount must be positive")
    .refine((v) => parseFloat(v) < 1000, "Amount must be under 1000 BTC"),
});

export const UnstakeLbtcSchema = z.object({
  amount: z
    .string()
    .describe("Amount of LBTC to unstake in human-readable format (e.g. '0.1')")
    .refine((v) => /^\d+(\.\d+)?$/.test(v), "Amount must be a numeric string")
    .refine((v) => parseFloat(v) > 0, "Amount must be positive")
    .refine((v) => parseFloat(v) < 1000, "Amount must be under 1000 BTC"),
  recipient: z
    .string()
    .describe(
      "Destination address. For BTC output, use a Bitcoin address (e.g. bc1q...). For BTCb output, use an EVM address (e.g. 0x...).",
    )
    .refine(
      (v) =>
        /^0x[a-fA-F0-9]{40}$/.test(v) ||
        /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(v),
      "Invalid address: must be an EVM address (0x...) or a Bitcoin address (bc1.../1.../3...)",
    ),
  outputAsset: z
    .enum(["BTC", "BTCb"])
    .describe(
      "Output asset: 'BTC' for native Bitcoin (cross-chain, takes longer), 'BTCb' for wrapped BTC on the same EVM chain (faster)",
    ),
});

export const RedeemLbtcToBtcbSchema = z.object({
  amount: z
    .string()
    .describe(
      "Amount of LBTC to redeem in human-readable format (e.g. '0.1'). Will be converted to BTC.b on the same chain.",
    )
    .refine((v) => /^\d+(\.\d+)?$/.test(v), "Amount must be a numeric string")
    .refine((v) => parseFloat(v) > 0, "Amount must be positive")
    .refine((v) => parseFloat(v) < 1000, "Amount must be under 1000 BTC"),
});

export const DeployToDefiSchema = z.object({
  amount: z
    .string()
    .describe("Amount to deploy in human-readable format (e.g. '0.1')")
    .refine((v) => /^\d+(\.\d+)?$/.test(v), "Amount must be a numeric string")
    .refine((v) => parseFloat(v) > 0, "Amount must be positive")
    .refine((v) => parseFloat(v) < 1000, "Amount must be under 1000 BTC"),
  protocol: z
    .enum(["veda"])
    .describe("DeFi protocol to deploy to. 'veda' is the Veda LBTC vault."),
});

export const ClaimDepositSchema = z.object({
  depositTxHash: z
    .string()
    .describe(
      "Transaction hash of the original deposit to claim. Use get_deposit_status first to check if the deposit is claimable.",
    ),
});

export const GetLbtcBalanceSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
    .optional()
    .describe(
      "EVM address to check balance for. If omitted, uses the connected wallet address.",
    ),
});

export const GetBtcbBalanceSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
    .optional()
    .describe(
      "EVM address to check balance for. If omitted, uses the connected wallet address.",
    ),
});

export const GetLbtcExchangeRateSchema = z.object({});

export const GetDepositStatusSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
    .optional()
    .describe(
      "EVM address to check deposits for. If omitted, uses the connected wallet address.",
    ),
});

export const GetUnstakeStatusSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
    .optional()
    .describe(
      "EVM address to check unstakes for. If omitted, uses the connected wallet address.",
    ),
});
