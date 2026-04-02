import { tool, jsonSchema } from "ai";
import {
  ChainId,
  Env,
  fromSatoshi,
  getDepositsByAddress,
  getDepositStatus,
  getDepositStatusDisplay,
  getLBTCExchangeRate,
  getTokenContractInfo,
  getUnstakesByAddress,
  Token,
} from "@lombard.finance/sdk";
import { createPublicClient, formatUnits, http, type Address, type Chain } from "viem";
import { mainnet, sepolia, base, baseSepolia } from "viem/chains";

interface ChainConfig {
  chain: Chain;
  env: string;
  name: string;
}

const CHAIN_MAP: Record<number, ChainConfig> = {
  [mainnet.id]: { chain: mainnet, env: Env.prod, name: "Ethereum" },
  [sepolia.id]: { chain: sepolia, env: Env.testnet, name: "Sepolia" },
  [base.id]: { chain: base, env: Env.prod, name: "Base" },
  [baseSepolia.id]: { chain: baseSepolia, env: Env.testnet, name: "Base Sepolia" },
};

function getChainConfig(chainId: number): ChainConfig {
  const config = CHAIN_MAP[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);
  return config;
}

// Common parameter schemas using jsonSchema (avoids Zod 3/4 conflicts)
const addressAndChainParams = jsonSchema<{ address: string; chainId: number }>({
  type: "object",
  properties: {
    address: { type: "string", description: "EVM wallet address (0x...)" },
    chainId: { type: "number", description: "Chain ID (1=Ethereum, 11155111=Sepolia, 8453=Base, 84532=Base Sepolia)" },
  },
  required: ["address", "chainId"],
});

async function readTokenBalance(
  token: Token,
  address: string,
  chainId: number,
): Promise<string> {
  const { chain, env } = getChainConfig(chainId);
  const tokenInfo = await getTokenContractInfo(token, chainId as ChainId, env as Env);
  const client = createPublicClient({ chain, transport: http() });

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

  return formatUnits(balance, 8);
}

export const lombardTools = {
  get_lbtc_balance: tool({
    description:
      "Check the LBTC (Lombard Staked Bitcoin) balance for a wallet address.",
    parameters: addressAndChainParams,
    execute: async ({ address, chainId }) => {
      const balance = await readTokenBalance(Token.LBTC, address, chainId);
      const { name } = getChainConfig(chainId);
      return { balance, token: "LBTC", chain: name, address };
    },
  }),

  get_btcb_balance: tool({
    description:
      "Check the BTC.b (wrapped Bitcoin) balance for a wallet address.",
    parameters: addressAndChainParams,
    execute: async ({ address, chainId }) => {
      const balance = await readTokenBalance(Token.BTCb, address, chainId);
      const { name } = getChainConfig(chainId);
      return { balance, token: "BTC.b", chain: name, address };
    },
  }),

  get_exchange_rate: tool({
    description:
      "Get the LBTC minting rate and minimum stake amount. " +
      "The minting rate is the BTC.b-to-LBTC conversion rate when staking. " +
      "BTC.b is a 1:1 wrapped representation of BTC. " +
      "LBTC itself may trade at a slight premium or discount on secondary markets.",
    parameters: jsonSchema<{ chainId?: number }>({
      type: "object",
      properties: {
        chainId: { type: "number", description: "Chain ID for environment resolution (optional)" },
      },
    }),
    execute: async ({ chainId }) => {
      const env = chainId ? getChainConfig(chainId).env : Env.prod;
      const rate = await getLBTCExchangeRate({ env: env as Env });
      return {
        mintingRate: rate.exchangeRate,
        description: `${rate.exchangeRate} BTC.b = 1 LBTC when minting. BTC.b is 1:1 with BTC.`,
        minStakeAmountBtc: fromSatoshi(rate.minAmount).toString(),
      };
    },
  }),

  get_deposit_status: tool({
    description:
      "Check the status of all deposits for an address. Shows pending, claimable, and claimed deposits.",
    parameters: addressAndChainParams,
    execute: async ({ address, chainId }) => {
      const { env } = getChainConfig(chainId);
      const deposits = await getDepositsByAddress({
        address: address as Address,
        env: env as Env,
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
  }),

  get_unstake_status: tool({
    description:
      "Check the status of all unstake/redeem operations for an address.",
    parameters: addressAndChainParams,
    execute: async ({ address, chainId }) => {
      const { env } = getChainConfig(chainId);
      const unstakes = await getUnstakesByAddress({
        address: address as Address,
        env: env as Env,
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
  }),

  prepare_stake: tool({
    description:
      "Prepare a BTC.b to LBTC stake transaction. Returns transaction parameters for the user's wallet to sign.",
    parameters: jsonSchema<{ amount: string; chainId: number }>({
      type: "object",
      properties: {
        amount: { type: "string", description: "Amount of BTC.b to stake (e.g. '0.1')" },
        chainId: { type: "number", description: "Chain ID" },
      },
      required: ["amount", "chainId"],
    }),
    execute: async ({ amount, chainId }) => {
      const { name } = getChainConfig(chainId);
      return {
        action: "sign_transaction",
        type: "stake",
        description: `Stake ${amount} BTC.b to receive LBTC on ${name}`,
        params: { amount, tokenIn: "BTCb", tokenOut: "LBTC", chainId },
        note: "Transaction will be sent to your wallet for signing.",
      };
    },
  }),

  prepare_unstake: tool({
    description:
      "Prepare an LBTC unstake transaction. Returns parameters for the user's wallet to sign.",
    parameters: jsonSchema<{
      amount: string;
      outputAsset: "BTC" | "BTCb";
      recipient?: string;
      chainId: number;
    }>({
      type: "object",
      properties: {
        amount: { type: "string", description: "Amount of LBTC to unstake" },
        outputAsset: { type: "string", enum: ["BTC", "BTCb"], description: "Output: BTC (cross-chain) or BTCb (same chain)" },
        recipient: { type: "string", description: "Destination address (required for BTC output)" },
        chainId: { type: "number", description: "Chain ID" },
      },
      required: ["amount", "outputAsset", "chainId"],
    }),
    execute: async ({ amount, outputAsset, recipient, chainId }) => {
      const { name } = getChainConfig(chainId);
      return {
        action: "sign_transaction",
        type: "unstake",
        description: `Unstake ${amount} LBTC to ${outputAsset} on ${name}`,
        params: { amount, outputAsset, recipient, chainId },
        note: outputAsset === "BTC"
          ? "Cross-chain unstake. BTC will arrive after processing."
          : "Same-chain redeem to BTC.b.",
      };
    },
  }),

  prepare_deploy_to_vault: tool({
    description:
      "Prepare a transaction to deploy LBTC into a DeFi vault for yield. Returns parameters for wallet signing.",
    parameters: jsonSchema<{ amount: string; protocol: string; chainId: number }>({
      type: "object",
      properties: {
        amount: { type: "string", description: "Amount of LBTC to deploy" },
        protocol: { type: "string", enum: ["veda"], description: "Vault protocol" },
        chainId: { type: "number", description: "Chain ID" },
      },
      required: ["amount", "protocol", "chainId"],
    }),
    execute: async ({ amount, protocol, chainId }) => {
      const { name } = getChainConfig(chainId);
      return {
        action: "sign_transaction",
        type: "deploy_to_vault",
        description: `Deploy ${amount} LBTC to ${protocol} vault on ${name}`,
        params: { amount, protocol, token: "LBTC", chainId },
        note: "Deploying to a vault earns additional DeFi yield on top of base staking rewards.",
      };
    },
  }),
};
