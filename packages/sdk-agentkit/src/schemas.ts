import { z } from "zod";

export const StakeBtcbToLbtcSchema = z.object({
  amount: z
    .string()
    .describe(
      "Amount of BTC.b to stake in human-readable format (e.g. '0.1' for 0.1 BTC.b). Will be converted to LBTC.",
    ),
});

export const UnstakeLbtcSchema = z.object({
  amount: z
    .string()
    .describe(
      "Amount of LBTC to unstake in human-readable format (e.g. '0.1')",
    ),
  recipient: z
    .string()
    .describe(
      "Destination address. For BTC output, use a Bitcoin address (e.g. bc1q...). For BTCb output, use an EVM address (e.g. 0x...).",
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
    ),
});

export const DeployToDefiSchema = z.object({
  amount: z
    .string()
    .describe("Amount to deploy in human-readable format (e.g. '0.1')"),
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
    .optional()
    .describe(
      "EVM address to check balance for. If omitted, uses the connected wallet address.",
    ),
});

export const GetBtcbBalanceSchema = z.object({
  address: z
    .string()
    .optional()
    .describe(
      "EVM address to check balance for. If omitted, uses the connected wallet address.",
    ),
});

export const GetLbtcExchangeRateSchema = z.object({});

export const GetDepositStatusSchema = z.object({
  address: z
    .string()
    .optional()
    .describe(
      "EVM address to check deposits for. If omitted, uses the connected wallet address.",
    ),
});

export const GetUnstakeStatusSchema = z.object({
  address: z
    .string()
    .optional()
    .describe(
      "EVM address to check unstakes for. If omitted, uses the connected wallet address.",
    ),
});
