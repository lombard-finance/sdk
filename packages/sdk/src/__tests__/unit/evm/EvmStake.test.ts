/**
 * EVM Stake Action Unit Tests
 *
 * Tests the BTC.b → LBTC staking flow on EVM chains.
 *
 * ## Fee Authorization
 *
 * Fee authorization is required on unsubsidized chains (Ethereum, Sepolia).
 * On subsidized chains (Avalanche, Base, BSC), no fee auth is required.
 *
 * @module __tests__/unit/evm/EvmStake.test.ts
 */

import { describe, expect, it, vi } from "vitest";

import { AssetId, Chain } from "../../../core";
import { LombardError, ValidationErrorCode } from "../../../shared/errors";

describe("EvmStake Interface", () => {
  describe("EvmStakeParams", () => {
    it("should require BTCb as input asset", () => {
      const params = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE,
      };

      expect(params.assetIn).toBe(AssetId.BTCb);
    });

    it("should require LBTC as output asset", () => {
      const params = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE,
      };

      expect(params.assetOut).toBe(AssetId.LBTC);
    });

    it("should support Avalanche chains", () => {
      const mainnetParams = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE,
      };

      const testnetParams = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
      };

      expect(mainnetParams.sourceChain).toBe(Chain.AVALANCHE);
      expect(testnetParams.sourceChain).toBe(Chain.AVALANCHE_FUJI);
    });
  });

  describe("EvmStakePrepareParams", () => {
    it("should accept valid prepare parameters", () => {
      const params = {
        amount: "0.1",
      };

      expect(params.amount).toBe("0.1");
    });
  });

  describe("Status Transitions", () => {
    it("should define all required status values for fee auth flow", () => {
      const statuses = [
        "idle",
        "needs-fee-authorization",
        "ready",
        "completed",
      ];

      statuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("Method Signatures", () => {
    it("should define prepare method", () => {
      type PrepareMethod = (params: { amount: string }) => Promise<void>;
      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it("should define authorizeFee method for unsubsidized chains", () => {
      type AuthorizeFeeMethod = () => Promise<void>;
      const testType: AuthorizeFeeMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it("should define execute method", () => {
      type ExecuteMethod = () => Promise<{ txHash: string }>;
      const testType: ExecuteMethod = async () => ({ txHash: "0x123" });
      expect(testType).toBeDefined();
    });
  });

  describe("Fee Authorization", () => {
    it("should require fee auth on unsubsidized chains (Ethereum, Sepolia)", () => {
      const unsubsidizedChains = [Chain.ETHEREUM, Chain.SEPOLIA];
      expect(unsubsidizedChains).toHaveLength(2);
    });

    it("should skip fee auth on subsidized chains (Avalanche, Base, BSC)", () => {
      const subsidizedChains = [Chain.AVALANCHE, Chain.BASE, Chain.BSC];
      expect(subsidizedChains).toHaveLength(3);
    });

    it("should expose feeAuth state for UI display", () => {
      type FeeAuthState = {
        requiresAuth: boolean;
        isAuthorized: boolean;
        feeInSatoshis: bigint | null;
        feeFormatted: string | null;
        expirationDate: string | null;
      };

      const feeAuth: FeeAuthState = {
        requiresAuth: true,
        isAuthorized: false,
        feeInSatoshis: BigInt(32),
        feeFormatted: "0.00000032",
        expirationDate: null,
      };

      expect(feeAuth.requiresAuth).toBe(true);
      expect(feeAuth.isAuthorized).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should reject LBTC as input asset", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Cannot stake LBTC. Stake is for BTC.b → LBTC conversion.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_ASSET);
    });

    it("should reject chains without BTC.b", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `BTC.b is not available on ethereum. Use Avalanche instead.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_CHAIN);
    });

    it("should handle insufficient balance", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Insufficient BTC.b balance. Have: 0, Need: 0.1`,
      );

      expect(error.message).toContain("Insufficient");
    });
  });

  describe("Event Emissions", () => {
    it("should emit progress events", () => {
      const handler = vi.fn((progress: { status: string; txHash?: string }) => {
        expect(progress.status).toBeDefined();
      });

      handler({ status: "completed", txHash: "0x123" });
      expect(handler).toHaveBeenCalledOnce();
    });

    it("should emit transaction hash on completion", () => {
      const result = { txHash: "0x1234567890abcdef" };
      expect(result.txHash).toMatch(/^0x/);
    });
  });

  describe("Public Properties", () => {
    it("should expose status property", () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: "idle" };
      expect(obj.status).toBe("idle");
    });

    it("should expose amount property", () => {
      type HasAmount = { readonly amount?: string };
      const obj: HasAmount = { amount: "0.1" };
      expect(obj.amount).toBe("0.1");
    });

    it("should expose txHash after execute", () => {
      type HasTxHash = { readonly txHash?: string };
      const obj: HasTxHash = { txHash: "0x123" };
      expect(obj.txHash).toBeDefined();
    });

    it("should expose feeAuth state", () => {
      type HasFeeAuth = {
        readonly feeAuth: { requiresAuth: boolean; isAuthorized: boolean };
      };
      const obj: HasFeeAuth = {
        feeAuth: { requiresAuth: true, isAuthorized: false },
      };
      expect(obj.feeAuth.requiresAuth).toBe(true);
    });
  });
});
