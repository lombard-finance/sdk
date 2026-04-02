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

const SKIP = !process.env.ENABLE_E2E;
const TEST_ADDRESS =
  process.env.TEST_EVM_ADDRESS || "0xa8dF6751A3E3A80cb20AF25eA9A892D29c3A65BA";
const SEPOLIA_CHAIN_ID = 11155111;

describe.skipIf(SKIP)("E2E: sdk-agent-tools on Sepolia", () => {
  describe("get_lbtc_balance", () => {
    it("returns balance for test wallet", async () => {
      const result = await getLbtcBalance.execute({
        address: TEST_ADDRESS,
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("balance");
      expect(result).toHaveProperty("token", "LBTC");
      expect(result).toHaveProperty("chain", "Sepolia");
      expect(typeof result.balance).toBe("string");
    });
  });

  describe("get_btcb_balance", () => {
    it("returns balance for test wallet", async () => {
      const result = await getBtcbBalance.execute({
        address: TEST_ADDRESS,
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("balance");
      expect(result).toHaveProperty("token", "BTC.b");
      expect(result).toHaveProperty("chain", "Sepolia");
    });
  });

  describe("get_balance", () => {
    it("returns both LBTC and BTC.b balances", async () => {
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

  describe("get_exchange_rate", () => {
    it("returns LBTC/BTC exchange rate and min amount", async () => {
      const result = await getExchangeRate.execute({
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("lbtcToBtc");
      expect(result).toHaveProperty("btcToLbtc");
      expect(result).toHaveProperty("minStakeAmountBtc");
      expect(result).toHaveProperty("description");
      expect(typeof result.lbtcToBtc).toBe("string");
      expect(typeof result.btcToLbtc).toBe("string");
    });
  });

  describe("get_deposit_status", () => {
    it("returns deposits array for test wallet", async () => {
      const result = await getDepositStatusTool.execute({
        address: TEST_ADDRESS,
        chainId: SEPOLIA_CHAIN_ID,
      });
      // Result may have deposits array or message
      expect(result).toHaveProperty("deposits");
    });
  });

  describe("get_unstake_status", () => {
    it("returns unstakes array for test wallet", async () => {
      const result = await getUnstakeStatusTool.execute({
        address: TEST_ADDRESS,
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("unstakes");
    });
  });

  describe("get_strategies", () => {
    it("returns strategy list", async () => {
      // Queries mainnet (prod) regardless of chainId param
      const result = await getStrategies.execute({});
      expect(result).toHaveProperty("strategies");
      expect(Array.isArray(result.strategies)).toBe(true);
      if (result.strategies.length > 0) {
        expect(result.strategies[0]).toHaveProperty("vault");
        expect(result.strategies[0]).toHaveProperty("apy");
      }
    });
  });

  describe("get_deposit_btc_address", () => {
    it("returns a BTC deposit address or a not-found message", async () => {
      const result = await getDepositBtcAddress.execute({
        address: TEST_ADDRESS,
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("chain", "Sepolia");
      // May return null btcAddress if test wallet has no pre-existing deposit address
      if (result.btcAddress) {
        expect(typeof result.btcAddress).toBe("string");
      } else {
        expect(result.note).toContain("No deposit address");
      }
    });
  });

  // Write tools return tx params, no real network call needed
  describe("prepare_stake", () => {
    it("returns stake transaction params", async () => {
      const result = await prepareStake.execute({
        amount: "0.001",
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("action", "sign_transaction");
      expect(result).toHaveProperty("type", "stake");
      expect(result).toHaveProperty("params");
    });
  });

  describe("prepare_unstake", () => {
    it("returns unstake transaction params", async () => {
      const result = await prepareUnstake.execute({
        amount: "0.001",
        outputAsset: "BTCb",
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("action", "sign_transaction");
      expect(result).toHaveProperty("type", "unstake");
    });
  });

  describe("prepare_deploy_to_vault", () => {
    it("returns vault deploy transaction params", async () => {
      const result = await prepareDeployToVault.execute({
        amount: "0.001",
        protocol: "veda",
        chainId: SEPOLIA_CHAIN_ID,
      });
      expect(result).toHaveProperty("action", "sign_transaction");
      expect(result).toHaveProperty("type", "deploy_to_vault");
    });
  });
});
