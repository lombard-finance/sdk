// @ts-nocheck
import path from "node:path";

import dotenv from "dotenv";
import { describe, it, expect } from "vitest";
import {
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
} from "@lombard.finance/sdk-agent";
import {
  ChainId,
  Env,
  getLBTCMintingFee,
  signNetworkFee,
  storeNetworkFeeSignature,
  getNetworkFeeSignature,
  toSatoshi,
} from "@lombard.finance/sdk";
import { createWalletClient, http, type EIP1193Provider, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Load env vars from monorepo root .env
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const SKIP = !process.env.ENABLE_E2E;
const TEST_ADDRESS =
  process.env.TEST_EVM_ADDRESS || "0xa8dF6751A3E3A80cb20AF25eA9A892D29c3A65BA";
const TEST_PRIVATE_KEY = process.env.TEST_EVM_PRIVATE_KEY as `0x${string}` | undefined;
const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;

/**
 * Adapts a viem WalletClient to EIP-1193 Provider interface.
 */
function walletClientToProvider(client: WalletClient): EIP1193Provider {
  return {
    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return client.account ? [client.account.address] : [];

        case "eth_chainId":
          return client.chain?.id ? `0x${client.chain.id.toString(16)}` : "0x1";

        case "eth_signTypedData_v4": {
          const [, typedData] = params as [string, string];
          const data = JSON.parse(typedData);
          return client.signTypedData({
            account: client.account!,
            ...data,
          });
        }

        case "personal_sign": {
          const [message] = params as [string, string];
          return client.signMessage({
            account: client.account!,
            message: { raw: message as `0x${string}` },
          });
        }

        default:
          throw new Error(`Method not implemented: ${method}`);
      }
    },
    on: () => {},
    removeListener: () => {},
  } as any;
}

// ─── Flow 1: Balance Checking ─────────────────────────────────────────

describe.skipIf(SKIP)("Flow 1: Balance Checking", () => {
  it("reads LBTC balance on Ethereum mainnet", async () => {
    const result = await getLbtcBalance.execute({
      address: TEST_ADDRESS,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("token", "LBTC");
    expect(result).toHaveProperty("chain", "Ethereum");
    expect(typeof result.balance).toBe("string");
    // Balance should be a valid numeric string
    expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
  });

  it("reads BTC.b balance on Ethereum mainnet", async () => {
    const result = await getBtcbBalance.execute({
      address: TEST_ADDRESS,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result).toHaveProperty("balance");
    expect(result).toHaveProperty("token", "BTC.b");
    expect(result).toHaveProperty("chain", "Ethereum");
    expect(typeof result.balance).toBe("string");
    expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
  });

  it("reads combined balance on Ethereum mainnet", async () => {
    const result = await getBalance.execute({
      address: TEST_ADDRESS,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result).toHaveProperty("lbtc");
    expect(result).toHaveProperty("btcb");
    expect(result).toHaveProperty("chain", "Ethereum");
    expect(typeof result.lbtc).toBe("string");
    expect(typeof result.btcb).toBe("string");
    expect(Number(result.lbtc)).toBeGreaterThanOrEqual(0);
    expect(Number(result.btcb)).toBeGreaterThanOrEqual(0);
  });

  it("reads balance on Sepolia testnet", async () => {
    const result = await getBalance.execute({
      address: TEST_ADDRESS,
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("lbtc");
    expect(result).toHaveProperty("btcb");
    expect(result).toHaveProperty("chain", "Sepolia");
    expect(typeof result.lbtc).toBe("string");
    expect(typeof result.btcb).toBe("string");
  });
});

// ─── Flow 2: Exchange Rate ────────────────────────────────────────────

describe.skipIf(SKIP)("Flow 2: Exchange Rate", () => {
  it("returns real LBTC/BTC ratio from mainnet (not 1:1)", async () => {
    const result = await getExchangeRate.execute({
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result).toHaveProperty("lbtcToBtc");
    expect(result).toHaveProperty("btcToLbtc");
    expect(typeof result.lbtcToBtc).toBe("string");
    expect(typeof result.btcToLbtc).toBe("string");
    // Rate should not be exactly 1.0 (yield has accrued)
    const lbtcToBtc = parseFloat(result.lbtcToBtc);
    expect(lbtcToBtc).not.toBe(1.0);
    expect(lbtcToBtc).toBeGreaterThan(0);
  });

  it("ratio shows LBTC > BTC (yield accrued)", async () => {
    const result = await getExchangeRate.execute({
      chainId: MAINNET_CHAIN_ID,
    });
    const lbtcToBtc = parseFloat(result.lbtcToBtc);
    // 1 LBTC should be worth > 1 BTC because staking yield accrues
    expect(lbtcToBtc).toBeGreaterThan(1.0);
  });

  it("returns minimum stake amount", async () => {
    const result = await getExchangeRate.execute({
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result).toHaveProperty("minStakeAmountBtc");
    expect(typeof result.minStakeAmountBtc).toBe("string");
    const minStake = parseFloat(result.minStakeAmountBtc);
    expect(minStake).toBeGreaterThan(0);
    // Minimum stake should be reasonable (less than 1 BTC)
    expect(minStake).toBeLessThan(1);
  });
});

// ─── Flow 3: Yield Strategies ─────────────────────────────────────────

describe.skipIf(SKIP)("Flow 3: Yield Strategies", () => {
  it("returns at least one strategy", async () => {
    const result = await getStrategies.execute({});
    expect(result).toHaveProperty("strategies");
    expect(Array.isArray(result.strategies)).toBe(true);
    expect(result.strategies.length).toBeGreaterThanOrEqual(1);
  });

  it("Veda vault has APY > 0", async () => {
    const result = await getStrategies.execute({});
    const veda = result.strategies.find(
      (s: { vault: string }) => s.vault === "Veda",
    );
    expect(veda).toBeDefined();
    // APY is formatted as "X.XX%", parse the numeric part
    const apyStr = veda!.apy.replace("%", "");
    const apyNum = parseFloat(apyStr);
    expect(apyNum).toBeGreaterThan(0);
  });

  it("Veda vault has TVL > 0", async () => {
    const result = await getStrategies.execute({});
    const veda = result.strategies.find(
      (s: { vault: string }) => s.vault === "Veda",
    );
    expect(veda).toBeDefined();
    const tvl = parseFloat(veda!.tvlBtc);
    expect(tvl).toBeGreaterThan(0);
  });
});

// ─── Flow 4: BtcStake Fee Authorization ──────────────────────────────

describe.skipIf(SKIP || !TEST_PRIVATE_KEY)(
  "Flow 4: BtcStake Fee Authorization",
  () => {
    // Shared state across sequential tests in this flow
    let storedSignature: string;
    let storedTypedData: string;

    it("gets the current minting fee on Sepolia", async () => {
      const fee = await getLBTCMintingFee({
        chainId: ChainId.sepolia,
        env: Env.testnet,
      });
      // Fee is a BigNumber in BTC (human-readable)
      expect(fee).toBeDefined();
      const feeNum = fee.toNumber();
      expect(feeNum).toBeGreaterThanOrEqual(0);
    });

    it("signs a network fee authorization (EIP-712)", async () => {
      const account = privateKeyToAccount(TEST_PRIVATE_KEY!);
      const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http(),
      });
      const provider = walletClientToProvider(walletClient);

      // Get current fee first
      const fee = await getLBTCMintingFee({
        chainId: ChainId.sepolia,
        env: Env.testnet,
      });

      // signNetworkFee expects fee in satoshis (integer), but getLBTCMintingFee
      // returns BTC (human-readable). Convert back to satoshis.
      const feeSatoshi = toSatoshi(fee);

      const result = await signNetworkFee({
        fee: feeSatoshi.toString(),
        account: account.address,
        chainId: ChainId.sepolia,
        provider,
        env: Env.testnet,
      });

      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("typedData");
      expect(typeof result.signature).toBe("string");
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(typeof result.typedData).toBe("string");
      // typedData should be valid JSON
      const parsed = JSON.parse(result.typedData);
      expect(parsed).toHaveProperty("domain");
      expect(parsed).toHaveProperty("message");
      expect(parsed).toHaveProperty("primaryType", "feeApproval");

      // Save for subsequent tests
      storedSignature = result.signature;
      storedTypedData = result.typedData;
    });

    it("stores the fee signature with the API", async () => {
      expect(storedSignature).toBeDefined();
      expect(storedTypedData).toBeDefined();

      const account = privateKeyToAccount(TEST_PRIVATE_KEY!);

      try {
        const status = await storeNetworkFeeSignature({
          signature: storedSignature,
          typedData: storedTypedData,
          address: account.address,
          env: Env.testnet,
        });
        expect(status).toBe("success");
      } catch (err) {
        // If a valid signature already exists, the API rejects duplicates.
        // This is expected when tests run repeatedly with the same wallet.
        const message = err instanceof Error ? err.message : String(err);
        expect(message).toContain("Active signature already exists");
      }
    });

    it("retrieves the stored fee signature", async () => {
      const account = privateKeyToAccount(TEST_PRIVATE_KEY!);

      const result = await getNetworkFeeSignature({
        address: account.address,
        chainId: ChainId.sepolia,
        env: Env.testnet,
      });

      expect(result).toHaveProperty("hasSignature");
      expect(result).toHaveProperty("expirationDate");
      expect(typeof result.hasSignature).toBe("boolean");
      expect(result.hasSignature).toBe(true);

      // expirationDate may be a unix timestamp (seconds) or ISO string
      const raw = result.expirationDate;
      const expMs = typeof raw === "string" && /^\d+$/.test(raw)
        ? Number(raw) * 1000
        : new Date(raw).getTime();
      expect(expMs).toBeGreaterThan(Date.now());
    });
  },
);

// ─── Flow 5: BTC Deposit Address ─────────────────────────────────────

describe.skipIf(SKIP)("Flow 5: BTC Deposit Address", () => {
  it("checks for existing deposit address", async () => {
    const result = await getDepositBtcAddress.execute({
      address: TEST_ADDRESS,
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("chain", "Sepolia");
    // May return a BTC address or null with a note
    if (result.btcAddress) {
      expect(typeof result.btcAddress).toBe("string");
      // BTC addresses start with 1, 3, bc1, or tb1 (testnet)
      expect(result.btcAddress).toMatch(/^(1|3|bc1|tb1)/);
    } else {
      expect(result.note).toBeDefined();
      expect(typeof result.note).toBe("string");
    }
  });
});

// ─── Flow 6: Deposit Status Tracking ─────────────────────────────────

describe.skipIf(SKIP)("Flow 6: Deposit Status Tracking", () => {
  it("fetches deposits for test wallet on Sepolia", async () => {
    const result = await getDepositStatusTool.execute({
      address: TEST_ADDRESS,
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("deposits");
    expect(Array.isArray(result.deposits)).toBe(true);
    // If there are deposits, verify their shape
    if (result.deposits.length > 0) {
      const deposit = result.deposits[0];
      expect(deposit).toHaveProperty("txHash");
      expect(deposit).toHaveProperty("status");
      expect(deposit).toHaveProperty("statusLabel");
      expect(typeof deposit.txHash).toBe("string");
    }
  });

  it("fetches unstakes for test wallet on Sepolia", async () => {
    const result = await getUnstakeStatusTool.execute({
      address: TEST_ADDRESS,
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("unstakes");
    expect(Array.isArray(result.unstakes)).toBe(true);
    // If there are unstakes, verify their shape
    if (result.unstakes.length > 0) {
      const unstake = result.unstakes[0];
      expect(unstake).toHaveProperty("txHash");
      expect(unstake).toHaveProperty("payoutStatus");
      expect(typeof unstake.txHash).toBe("string");
    }
  });
});

// ─── Flow 7: Write Tool Parameter Generation ─────────────────────────

describe.skipIf(SKIP)("Flow 7: Write Tool Parameter Generation", () => {
  it("prepareStake returns sdk_execute with evm.stake method", async () => {
    const result = await prepareStake.execute({
      amount: "0.001",
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "evm.stake");
    expect(result).toHaveProperty("params");
    expect(result.params).toHaveProperty("amount", "0.001");
    expect(result.params).toHaveProperty("chainId", SEPOLIA_CHAIN_ID);
    expect(result.params).toHaveProperty("assetIn", "BTCb");
    expect(result.params).toHaveProperty("assetOut", "LBTC");
    expect(result).toHaveProperty("description");
    expect(typeof result.description).toBe("string");
  });

  it("prepareUnstake returns sdk_execute with evm.unstake method", async () => {
    const result = await prepareUnstake.execute({
      amount: "0.001",
      outputAsset: "BTCb",
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "evm.unstake");
    expect(result).toHaveProperty("params");
    expect(result.params).toHaveProperty("amount", "0.001");
    expect(result.params).toHaveProperty("outputAsset", "BTCb");
    expect(result.params).toHaveProperty("chainId", SEPOLIA_CHAIN_ID);
  });

  it("prepareDeployToVault returns sdk_execute with evm.deploy method", async () => {
    const result = await prepareDeployToVault.execute({
      amount: "0.001",
      protocol: "veda",
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "evm.deploy");
    expect(result).toHaveProperty("params");
    expect(result.params).toHaveProperty("amount", "0.001");
    expect(result.params).toHaveProperty("protocol", "veda");
    expect(result.params).toHaveProperty("token", "LBTC");
  });

  it("prepareUnstake validates BTC output requires recipient", async () => {
    await expect(
      prepareUnstake.execute({
        amount: "0.001",
        outputAsset: "BTC",
        chainId: SEPOLIA_CHAIN_ID,
      }),
    ).rejects.toThrow("recipient address is required when unstaking to BTC");
  });
});
