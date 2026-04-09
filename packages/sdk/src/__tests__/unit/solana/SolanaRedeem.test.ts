/**
 * SolanaRedeem Unit Tests
 *
 * Tests for the Solana BTC.b → BTC redeem action with mocked providers.
 */

import { Env } from "@lombard.finance/sdk-common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolanaRedeem } from "../../../chains/solana/actions/redeem/SolanaRedeem";
import { PartnerConfiguration } from "../../../client/PartnerConfiguration";
import { AssetId, Chain } from "../../../core";
import { NonEvmUnstakeStatus } from "../../../shared/constants/statusConstants";
import type { SolanaCoreContext } from "../../../shared/context";

// ═══════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockSolanaService() {
  return {
    signLbtcDestination: vi.fn().mockResolvedValue({ signature: "0xmock" }),
    unstake: vi.fn().mockResolvedValue({ txHash: "mock-unstake-tx-hash" }),
    redeemForBtc: vi.fn().mockResolvedValue({ txHash: "mock-redeem-tx-hash" }),
  };
}

function createMockContext(
  overrides: Partial<SolanaCoreContext> = {},
): SolanaCoreContext {
  return {
    env: Env.dev,
    partner: new PartnerConfiguration({ partnerId: "test-partner" }),
    getProvider: vi.fn().mockResolvedValue({}),
    solana: createMockSolanaService(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("SolanaRedeem", () => {
  let mockCtx: SolanaCoreContext;

  const validParams = {
    assetIn: AssetId.BTCb,
    assetOut: AssetId.BTC,
    sourceChain: Chain.SOLANA_DEVNET,
    destChain: Chain.BITCOIN_SIGNET,
  };

  const validPrepareParams = {
    amount: "0.001",
    recipient: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  };

  beforeEach(() => {
    mockCtx = createMockContext({ env: Env.dev });
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("initialization", () => {
    it("should initialize with IDLE status in dev env", () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      expect(redeem.status).toBe(NonEvmUnstakeStatus.IDLE);
    });

    it("should initialize with IDLE status in stage env", () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const redeem = new SolanaRedeem(stageCtx, validParams);
      expect(redeem.status).toBe(NonEvmUnstakeStatus.IDLE);
    });

    it("should throw for testnet env (not yet supported)", () => {
      const testnetCtx = createMockContext({ env: Env.testnet });
      expect(() => new SolanaRedeem(testnetCtx, validParams)).toThrow();
    });

    it("should throw for ibc env (not yet supported)", () => {
      const ibcCtx = createMockContext({ env: Env.ibc });
      expect(() => new SolanaRedeem(ibcCtx, validParams)).toThrow();
    });

    it("should throw for prod env (not yet supported)", () => {
      const prodCtx = createMockContext({ env: Env.prod });
      expect(() => new SolanaRedeem(prodCtx, validParams)).toThrow();
    });

    it("should throw for unsupported source chain", () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM,
      };
      expect(() => new SolanaRedeem(mockCtx, invalidParams)).toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Prepare Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("prepare", () => {
    it("should transition to READY status on valid prepare", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await redeem.prepare(validPrepareParams);

      expect(redeem.status).toBe(NonEvmUnstakeStatus.READY);
      expect(redeem.amount).toBe("0.001");
      expect(redeem.recipient).toBe(validPrepareParams.recipient);
    });

    it("should validate BTC address format", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(
        redeem.prepare({ amount: "0.001", recipient: "invalid-btc-address" }),
      ).rejects.toThrow();
    });

    it("should validate amount is positive", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(
        redeem.prepare({
          amount: "0",
          recipient: validPrepareParams.recipient,
        }),
      ).rejects.toThrow();
    });

    it("should throw if called when not IDLE", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await expect(redeem.prepare(validPrepareParams)).rejects.toThrow(
        /prepare/,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Execute Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("execute", () => {
    it("should call solana service redeemForBtc method", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      const result = await redeem.execute();

      expect(mockCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(String),
          btcAddress: validPrepareParams.recipient,
          network: "devnet",
          env: Env.dev,
        }),
      );
      expect(result.txHash).toBe("mock-redeem-tx-hash");
    });

    it("should transition to CONFIRMING status after execute", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await redeem.execute();

      // The Solana burn and GMP dispatch are complete, but the Bitcoin-side
      // BTC release is cross-chain async — the SDK cannot track it, so the
      // flow terminates at CONFIRMING, not COMPLETED.
      expect(redeem.status).toBe(NonEvmUnstakeStatus.CONFIRMING);
    });

    it("should throw if called when not READY", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(redeem.execute()).rejects.toThrow(/execute/);
    });

    it("should set txHash property on success", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await redeem.execute();

      expect(redeem.txHash).toBe("mock-redeem-tx-hash");
    });

    it("should handle service errors", async () => {
      mockCtx.solana.redeemForBtc = vi
        .fn()
        .mockRejectedValue(new Error("Transaction failed"));

      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await expect(redeem.execute()).rejects.toThrow("Transaction failed");
      expect(redeem.isFailed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Network Mapping Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe("network mapping", () => {
    it("should use devnet for dev env", async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);
      await redeem.execute();

      expect(mockCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({ network: "devnet" }),
      );
    });

    it("should use devnet for stage env", async () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const redeem = new SolanaRedeem(stageCtx, validParams);
      await redeem.prepare(validPrepareParams);
      await redeem.execute();

      expect(stageCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({ network: "devnet" }),
      );
    });
  });
});
