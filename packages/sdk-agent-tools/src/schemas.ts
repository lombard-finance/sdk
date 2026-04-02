/**
 * JSON Schema definitions for all Lombard agent tools.
 * Framework-agnostic — these can be used with any AI SDK that accepts JSON Schema.
 */

export const CHAIN_ID_DESCRIPTION =
  "Chain ID (1=Ethereum, 11155111=Sepolia, 8453=Base, 84532=Base Sepolia)";

export const AddressAndChainSchema = {
  type: "object" as const,
  properties: {
    address: { type: "string" as const, description: "EVM wallet address (0x...)" },
    chainId: { type: "number" as const, description: CHAIN_ID_DESCRIPTION },
  },
  required: ["address", "chainId"],
};

export const ExchangeRateSchema = {
  type: "object" as const,
  properties: {
    chainId: { type: "number" as const, description: "Chain ID for environment resolution (optional)" },
  },
};

export const StakeSchema = {
  type: "object" as const,
  properties: {
    amount: { type: "string" as const, description: "Amount of BTC.b to stake (e.g. '0.1')" },
    chainId: { type: "number" as const, description: CHAIN_ID_DESCRIPTION },
  },
  required: ["amount", "chainId"],
};

export const UnstakeSchema = {
  type: "object" as const,
  properties: {
    amount: { type: "string" as const, description: "Amount of LBTC to unstake" },
    outputAsset: {
      type: "string" as const,
      enum: ["BTC", "BTCb"],
      description: "Output: BTC (cross-chain) or BTCb (same chain)",
    },
    recipient: { type: "string" as const, description: "Destination address (required for BTC output)" },
    chainId: { type: "number" as const, description: CHAIN_ID_DESCRIPTION },
  },
  // Note: recipient is required when outputAsset is "BTC" but JSON Schema
  // cannot express conditional requirements. Validated at execution time.
  required: ["amount", "outputAsset", "chainId"],
};

export const BalanceSchema = AddressAndChainSchema;

export const StrategiesSchema = {
  type: "object" as const,
  properties: {
    chainId: {
      type: "number" as const,
      description: "Chain ID to filter strategies (optional, returns all if omitted)",
    },
  },
};

export const DepositBtcSchema = AddressAndChainSchema;

export const DeployToVaultSchema = {
  type: "object" as const,
  properties: {
    amount: { type: "string" as const, description: "Amount of LBTC to deploy" },
    protocol: { type: "string" as const, enum: ["veda"], description: "Vault protocol" },
    chainId: { type: "number" as const, description: CHAIN_ID_DESCRIPTION },
  },
  required: ["amount", "protocol", "chainId"],
};
