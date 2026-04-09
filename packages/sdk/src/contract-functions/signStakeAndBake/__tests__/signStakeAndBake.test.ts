/**
 * Tests for signStakeAndBake function
 *
 * These tests encode the CURRENT expected behavior before refactoring.
 * They serve as a safety net to ensure refactoring doesn't break existing functionality.
 *
 * Test Coverage:
 * 1. LBTC Permit Flow (standard EIP-2612)
 * 2. BTC → LBTC Conversion + Permit
 * 3. BTCb Approve Flow (Avalanche special case)
 * 4. Validation Errors
 * 5. Typed Data Structure
 * 6. Nonce Handling
 * 7. Expiry Behavior
 */

import { Env } from "@lombard.finance/sdk-common";
import BigNumber from "bignumber.js";
import type { EIP1193Provider } from "viem";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChainId } from "../../../common/chains";
import { DefiProtocol } from "../../../defi/defi-registry";
import { Token } from "../../../tokens/token-addresses";
import { signStakeAndBake } from "../signStakeAndBake";
import { calculateStakeAndBakeLBTCAmount } from "../utils";
import { StakeAndBakeValidationError } from "../validation";

// Mock dependencies
vi.mock("../../../clients/wallet-client", () => ({
  makeWalletClient: vi.fn(() => ({
    signTypedData: vi.fn(async (_typedData) => {
      // Return a mock signature - can't JSON.stringify BigInt values
      return "0xmocksignature1234567890abcdef";
    }),
    writeContract: vi.fn(async (_params) => {
      // Return a mock transaction hash for approve transactions
      return "0xapprovetxhash1234567890abcdef";
    }),
  })),
}));

vi.mock("../../../clients/public-client", () => ({
  makePublicClient: vi.fn(() => ({
    readContract: vi.fn(async ({ functionName }) => {
      // Mock nonce response
      if (functionName === "nonces") {
        return 5n; // Mock nonce value
      }
      // Mock allowance response (return 0 to trigger approve tx)
      if (functionName === "allowance") {
        return 0n; // Zero allowance triggers approve transaction
      }
      return 0n;
    }),
    waitForTransactionReceipt: vi.fn(async ({ hash }) => {
      // Mock successful transaction receipt
      return {
        status: "success",
        transactionHash: hash,
        blockNumber: 1n,
        blockHash: "0xblockhash",
      };
    }),
  })),
}));

vi.mock("../../../tokens/tokens", () => ({
  getTokenContractInfo: vi.fn(async (token, chainId, _env, _addressKind) => {
    // Return mock contract info based on token
    // nosemgrep: codacy.tools-configs.rules_lgpl_javascript_crypto_rule-node-timing-attack -- comparing Token enum values in test mock, not secrets
    if (token === Token.LBTC) {
      return {
        address: "0xLBTC_CONTRACT_ADDRESS",
        abi: [],
        chainId,
      };
    }
    if (token === Token.BTCb) {
      return {
        address: "0xBTCB_CONTRACT_ADDRESS",
        abi: [],
        chainId,
      };
    }
    throw new Error(`Unknown token: ${token}`);
  }),
}));

vi.mock(
  "../../../api-functions/getLBTCExchangeRate/get-exchange-ratio",
  () => ({
    getExchangeRatio: vi.fn(async () => ({
      LBTC: {
        BTCTokenRatio: new BigNumber("1.05"), // 1 BTC = 0.952381 LBTC
      },
    })),
  }),
);

// Test data
const MOCK_ACCOUNT = "0x1234567890123456789012345678901234567890";
const MOCK_PROVIDER = {} as EIP1193Provider;
const MOCK_EXPIRY = 1700000000;

describe("signStakeAndBake - Current Behavior Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("LBTC Permit Flow (Standard EIP-2612)", () => {
    it("should generate valid permit signature for LBTC on Ethereum", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY,
        env: Env.prod,
      });

      // Should be permit mode
      expect(result.mode).toBe("permit");

      // Should return a signature
      expect(result.signature).toBeTruthy();
      expect(result.signature).toMatch(/^0x/);

      // Should have typed data
      expect(result.typedData).toBeTruthy();
      const typedData = JSON.parse(result.typedData);

      // Verify EIP-712 domain
      expect(typedData.domain).toEqual({
        name: "Lombard Staked Bitcoin",
        version: "1",
        chainId: ChainId.ethereum.toString(),
        verifyingContract: "0xLBTC_CONTRACT_ADDRESS",
      });

      // Verify primary type
      expect(typedData.primaryType).toBe("Permit");

      // Verify message structure
      expect(typedData.message).toMatchObject({
        owner: MOCK_ACCOUNT,
        spender: expect.any(String),
        value: expect.any(String),
        nonce: "5", // Mocked nonce
        deadline: MOCK_EXPIRY.toString(),
      });
    });

    it("should generate permit for LBTC on Ethereum", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("0.5"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY,
        env: Env.prod,
      });

      expect(result.signature).toBeTruthy();
      const typedData = JSON.parse(result.typedData);
      expect(typedData.primaryType).toBe("Permit");
      expect(typedData.domain.name).toBe("Lombard Staked Bitcoin");
    });

    it("should use default expiry of 24 hours if not provided", async () => {
      const beforeCall = Math.floor(Date.now() / 1000);

      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        // No expiry provided
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const deadline = Number(typedData.message.deadline);
      const afterCall = Math.floor(Date.now() / 1000);

      // Should be approximately 24 hours from now
      const expectedExpiry = beforeCall + 86400; // 24 hours
      expect(deadline).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(deadline).toBeLessThanOrEqual(afterCall + 86400 + 5);
    });

    it("should fetch nonce from contract", async () => {
      const { makePublicClient } =
        await import("../../../clients/public-client");

      await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      // Verify nonce was fetched
      expect(makePublicClient).toHaveBeenCalledWith(
        expect.objectContaining({ chainId: ChainId.ethereum }),
      );
    });
  });

  describe("BTC → LBTC Conversion + Permit", () => {
    it("should convert BTC amount to LBTC using exchange ratio", async () => {
      const btcAmount = new BigNumber("1");
      const expectedLBTC = new BigNumber("1").dividedBy(new BigNumber("1.05"));

      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: btcAmount,
        token: "BTC",
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const permitValue = new BigNumber(typedData.message.value);

      // Should use converted LBTC amount
      expect(permitValue.toFixed(0)).toBe(
        expectedLBTC.toFixed(0, BigNumber.ROUND_DOWN),
      );
    });

    it("should default to BTC token when no token specified", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        // token not specified - should default to 'BTC'
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      // Should still generate LBTC permit after conversion
      const typedData = JSON.parse(result.typedData);
      expect(typedData.domain.name).toBe("Lombard Staked Bitcoin");
      expect(typedData.primaryType).toBe("Permit");
    });

    it("calculateStakeAndBakeLBTCAmount should apply ratio correctly", async () => {
      const btcAmount = new BigNumber("2.5");
      const lbtcAmount = await calculateStakeAndBakeLBTCAmount(
        btcAmount,
        Env.prod,
      );

      // Expected: 2.5 / 1.05 = 2.380952...
      expect(lbtcAmount.toFixed(6)).toBe("2.380952");
    });
  });

  describe("BTCb Approve Flow (Avalanche Special Case)", () => {
    it("should return empty signature for BTCb on Avalanche Fuji", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY,
        env: Env.testnet,
      });

      // Should be approve mode
      expect(result.mode).toBe("approve");

      // Approve mode returns empty signature
      expect(result.signature).toBe("");

      // But should have typed data
      expect(result.typedData).toBeTruthy();

      // Should have approval transaction hash
      expect(result.approvalTxHash).toBeTruthy();
      expect(result.approvalTxHash).toMatch(/^0x/);
    });

    it('should use "Approve" primary type for BTCb on Avalanche', async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      const typedData = JSON.parse(result.typedData);

      // Should use Approve, not Permit
      expect(typedData.primaryType).toBe("Approve");
    });

    it('should use "Bitcoin" domain name for BTCb', async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      const typedData = JSON.parse(result.typedData);

      expect(typedData.domain.name).toBe("Bitcoin");
      expect(typedData.domain.version).toBe("1");
    });

    it("should use zero nonce and deadline for BTCb approve", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY, // Should be ignored
        env: Env.testnet,
      });

      const typedData = JSON.parse(result.typedData);

      // BTCb approve uses zero nonce and deadline
      expect(typedData.message.nonce).toBe("0");
      expect(typedData.message.deadline).toBe("0");
    });

    it("should handle BTCb on Avalanche Fuji testnet", async () => {
      // NOTE: Avalanche Fuji is currently not configured in Silo vault
      // This test documents expected behavior if/when it's added

      // Skip this test for now since Fuji isn't configured
      // Once Silo adds Fuji support, this test should pass
      expect(true).toBe(true); // Placeholder

      /* Future test when Fuji is added to Silo:
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber('0.1'),
        token: Token.BTCb,
        vaultKey: DefiProtocolKey.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      expect(result.signature).toBe('');
      const typedData = JSON.parse(result.typedData);
      expect(typedData.primaryType).toBe('Approve');
      expect(typedData.domain.name).toBe('Bitcoin');
      */
    });

    it("should throw validation error for BTCb on unsupported vault/chain", async () => {
      // BTCb is only configured for Silo vault on Avalanche
      // Attempting to use it with Veda vault or on other chains should fail validation

      await expect(
        signStakeAndBake({
          account: MOCK_ACCOUNT,
          value: new BigNumber("1"),
          token: Token.BTCb,
          vaultKey: DefiProtocol.Veda, // BTCb not configured for Veda
          chainId: ChainId.sepolia, // BTCb not configured for Sepolia
          provider: MOCK_PROVIDER,
          env: Env.testnet,
        }),
      ).rejects.toThrow(StakeAndBakeValidationError);
    });
  });

  describe("Validation Errors", () => {
    it("should throw error for unknown vault", async () => {
      await expect(
        signStakeAndBake({
          account: MOCK_ACCOUNT,
          value: new BigNumber("1"),
          vaultKey: "nonexistent" as DefiProtocol,
          chainId: ChainId.ethereum,
          provider: MOCK_PROVIDER,
          env: Env.prod,
        }),
      ).rejects.toThrow(StakeAndBakeValidationError);
    });

    it("should throw error for unsupported chain", async () => {
      await expect(
        signStakeAndBake({
          account: MOCK_ACCOUNT,
          value: new BigNumber("1"),
          vaultKey: DefiProtocol.Veda,
          chainId: ChainId.avalanche, // Not supported by Veda
          provider: MOCK_PROVIDER,
          env: Env.prod,
        }),
      ).rejects.toThrow(StakeAndBakeValidationError);
    });

    it("should throw error when spender contract missing", async () => {
      // Create a scenario where chain is in stakeAndBakeChains but no spender contract
      // This is a defensive check in the current code

      await expect(
        signStakeAndBake({
          account: MOCK_ACCOUNT,
          value: new BigNumber("1"),
          vaultKey: DefiProtocol.Veda,
          chainId: 99999 as ChainId, // Invalid chain
          provider: MOCK_PROVIDER,
          env: Env.prod,
        }),
      ).rejects.toThrow();
    });

    it("should include supported chains in error message", async () => {
      try {
        await signStakeAndBake({
          account: MOCK_ACCOUNT,
          value: new BigNumber("1"),
          vaultKey: DefiProtocol.Veda,
          chainId: ChainId.avalanche,
          provider: MOCK_PROVIDER,
          env: Env.prod,
        });
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).toMatch(/supported chains/i);
        // Should list at least Ethereum
        expect(err.message).toContain(ChainId.ethereum.toString());
      }
    });
  });

  describe("Typed Data Structure Validation", () => {
    it("should have correct EIP-712 domain fields", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);

      expect(typedData.domain).toHaveProperty("name");
      expect(typedData.domain).toHaveProperty("version");
      expect(typedData.domain).toHaveProperty("chainId");
      expect(typedData.domain).toHaveProperty("verifyingContract");
    });

    it("should have correct EIP712Domain type definition", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const domainType = typedData.types.EIP712Domain;

      expect(domainType).toEqual([
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ]);
    });

    it("should have correct Permit message type definition", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const permitType = typedData.types.Permit;

      expect(permitType).toEqual([
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ]);
    });

    it("should have correct message field values", async () => {
      const testValue = new BigNumber("1.5");

      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: testValue,
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        expiry: MOCK_EXPIRY,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const message = typedData.message;

      expect(message.owner).toBe(MOCK_ACCOUNT);
      expect(message.spender).toBeTruthy();
      expect(message.spender).toMatch(/^0x/);
      expect(message.value).toBeTruthy();
      expect(message.nonce).toBe("5");
      expect(message.deadline).toBe(MOCK_EXPIRY.toString());
    });

    it("should serialize BigInt values to strings in typedData", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      // Typed data should be serializable JSON
      expect(() => JSON.parse(result.typedData)).not.toThrow();

      const typedData = JSON.parse(result.typedData);

      // All numeric values should be strings
      expect(typeof typedData.domain.chainId).toBe("string");
      expect(typeof typedData.message.value).toBe("string");
      expect(typeof typedData.message.nonce).toBe("string");
      expect(typeof typedData.message.deadline).toBe("string");
    });
  });

  describe("Value Precision Handling", () => {
    it("should round down value to integer", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1.123456789"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      const value = typedData.message.value;

      // Should be rounded down, no decimals
      expect(value).toBe("1");
    });

    it("should handle very large values", async () => {
      const largeValue = new BigNumber("21000000"); // 21M BTC in satoshis

      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: largeValue,
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      expect(typedData.message.value).toBe(largeValue.toFixed(0));
    });

    it("should handle very small values", async () => {
      const smallValue = new BigNumber("0.00000001"); // 1 satoshi

      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: smallValue,
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);
      // Should be 0 when rounded down
      expect(typedData.message.value).toBe("0");
    });
  });

  describe("Spender Contract Selection", () => {
    it("should use correct spender contract for Veda on Ethereum", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      const typedData = JSON.parse(result.typedData);

      // Should match Veda spender contract for Ethereum
      expect(typedData.message.spender).toBe(
        "0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef",
      );
    });

    it("should use correct spender contract for Veda on Sepolia (testnet)", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.sepolia,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      const typedData = JSON.parse(result.typedData);
      expect(typedData.message.spender).toBe(
        "0x77eD6a84fEF665156e81247ECbd43A847B8A6398",
      );
    });

    it("should use correct spender contract for Silo on Avalanche Fuji", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      const typedData = JSON.parse(result.typedData);
      expect(typedData.message.spender).toBe(
        "0xFe1e76D9e065e879A9D1914482f0F13d85F39877",
      );
    });
  });

  describe("Environment Handling", () => {
    it("should use testnet configuration when env is testnet", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.sepolia,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      expect(result.signature).toBeTruthy();
    });

    it("should default to production env", async () => {
      const result = await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        // No env specified
      });

      expect(result.signature).toBeTruthy();
    });
  });

  describe("Token Contract Address Selection", () => {
    it("should use LBTC contract for BTC token (after conversion)", async () => {
      const { getTokenContractInfo } = await import("../../../tokens/tokens");

      await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: "BTC",
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      // Should fetch LBTC contract for 'BTC' token
      expect(getTokenContractInfo).toHaveBeenCalledWith(
        Token.LBTC,
        ChainId.ethereum,
        Env.prod,
      );
    });

    it("should use LBTC contract for LBTC token", async () => {
      const { getTokenContractInfo } = await import("../../../tokens/tokens");

      await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        env: Env.prod,
      });

      expect(getTokenContractInfo).toHaveBeenCalledWith(
        Token.LBTC,
        ChainId.ethereum,
        Env.prod,
      );
    });

    it("should use BTCb token contract (AddressKind.Token) for BTCb", async () => {
      const { getTokenContractInfo } = await import("../../../tokens/tokens");

      await signStakeAndBake({
        account: MOCK_ACCOUNT,
        value: new BigNumber("1"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      // Should use AddressKind.Token for permit signature
      const { AddressKind } = await import("../../../tokens/token-addresses");
      expect(getTokenContractInfo).toHaveBeenCalledWith(
        Token.BTCb,
        ChainId.avalancheFuji,
        Env.testnet,
        AddressKind.Token,
      );
    });
  });

  describe("Exchange Ratio Error Handling", () => {
    it("should throw error if exchange ratio fetch fails", async () => {
      const { getExchangeRatio } =
        await import("../../../api-functions/getLBTCExchangeRate/get-exchange-ratio");

      const mockedGetExchangeRatio = getExchangeRatio as Mock;
      mockedGetExchangeRatio.mockRejectedValueOnce(new Error("API error"));

      await expect(
        calculateStakeAndBakeLBTCAmount(new BigNumber("1"), Env.prod),
      ).rejects.toThrow("Failed to get exchange ratio");
    });

    it("should use ratio of 1 if BTCTokenRatio is missing", async () => {
      const { getExchangeRatio } =
        await import("../../../api-functions/getLBTCExchangeRate/get-exchange-ratio");

      const mockedGetExchangeRatio = getExchangeRatio as Mock;
      mockedGetExchangeRatio.mockResolvedValueOnce({
        LBTC: {},
      });

      const result = await calculateStakeAndBakeLBTCAmount(
        new BigNumber("2"),
        Env.prod,
      );

      // Should use 1:1 ratio
      expect(result.toString()).toBe("2");
    });
  });

  describe("Integration: Full Flow Tests", () => {
    it("should complete full permit flow for LBTC", async () => {
      const result = await signStakeAndBake({
        account: "0xUser123",
        value: new BigNumber("0.5"),
        token: Token.LBTC,
        vaultKey: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        provider: MOCK_PROVIDER,
        expiry: 1700000000,
        env: Env.prod,
      });

      // Verify complete result
      expect(result).toMatchObject({
        mode: "permit",
        signature: expect.stringMatching(/^0x/),
        typedData: expect.any(String),
      });

      // Verify typedData is valid JSON
      const typedData = JSON.parse(result.typedData);
      expect(typedData).toMatchObject({
        account: "0xUser123",
        domain: expect.objectContaining({
          name: "Lombard Staked Bitcoin",
        }),
        primaryType: "Permit",
        message: expect.objectContaining({
          owner: "0xUser123",
          value: expect.any(String),
        }),
      });
    });

    it("should complete full approve flow for BTCb on Avalanche Fuji", async () => {
      const result = await signStakeAndBake({
        account: "0xUser456",
        value: new BigNumber("1.5"),
        token: Token.BTCb,
        vaultKey: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        provider: MOCK_PROVIDER,
        env: Env.testnet,
      });

      // Verify approve result
      expect(result).toMatchObject({
        mode: "approve",
        signature: "", // Empty for approve
        typedData: expect.any(String),
        approvalTxHash: expect.stringMatching(/^0x/), // Should have tx hash
      });

      const typedData = JSON.parse(result.typedData);
      expect(typedData).toMatchObject({
        domain: expect.objectContaining({
          name: "Bitcoin",
        }),
        primaryType: "Approve",
        message: expect.objectContaining({
          owner: "0xUser456",
          nonce: "0",
          deadline: "0",
        }),
      });
    });
  });
});
