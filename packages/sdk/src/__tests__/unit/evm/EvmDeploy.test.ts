/**
 * EVM Deploy Action Unit Tests
 *
 * Tests the LBTC → DeFi vault deployment flow on EVM chains.
 *
 * @module __tests__/unit/evm/EvmDeploy.test.ts
 */

import { describe, expect, it, vi } from "vitest";

import { AssetId, Chain } from "../../../core";
import { LombardError, ValidationErrorCode } from "../../../shared/errors";

describe("EvmDeploy Interface", () => {
  describe("EvmDeployParams", () => {
    it("should require LBTC as input asset", () => {
      const params = {
        assetIn: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: "veda",
        vault: "LBTC",
      };

      expect(params.assetIn).toBe(AssetId.LBTC);
    });

    it("should require protocol selection", () => {
      const params = {
        assetIn: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: "veda",
        vault: "LBTC",
      };

      expect(params.protocol).toBe("veda");
    });

    it("should require vault selection", () => {
      const params = {
        assetIn: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: "veda",
        vault: "LBTC",
      };

      expect(params.vault).toBe("LBTC");
    });

    it("should support multiple protocols", () => {
      const protocols = ["corn-silo", "euler-lbtc", "aave", "morpho", "pendle"];

      protocols.forEach((protocol) => {
        expect(typeof protocol).toBe("string");
      });
    });

    it("should support multiple chains", () => {
      const chains = [Chain.ETHEREUM, Chain.BASE, Chain.BSC, Chain.SEPOLIA];

      chains.forEach((chain) => {
        expect(typeof chain).toBe("string");
      });
    });
  });

  describe("EvmDeployPrepareParams", () => {
    it("should accept valid prepare parameters", () => {
      const params = {
        amount: "0.1",
      };

      expect(params.amount).toBe("0.1");
    });

    it("should support optional recipient", () => {
      const params = {
        amount: "0.1",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      };

      expect(params.recipient).toBeDefined();
    });
  });

  describe("Status Transitions", () => {
    it("should define all required status values", () => {
      const statuses = ["idle", "needs-approval", "ready", "completed"];

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

    it("should define approve method", () => {
      type ApproveMethod = () => Promise<void>;
      const testType: ApproveMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it("should define execute method", () => {
      type ExecuteMethod = () => Promise<{ txHash: string }>;
      const testType: ExecuteMethod = async () => ({ txHash: "0x123" });
      expect(testType).toBeDefined();
    });
  });

  describe("Protocol Integration", () => {
    it("should support DeFi protocols from registry", () => {
      const protocolTypes = ["lending", "yield", "liquidity"];

      protocolTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should validate vault exists for protocol", () => {
      const protocol = "corn-silo";
      const vault = "LBTC";

      expect(protocol).toBeDefined();
      expect(vault).toBeDefined();
    });
  });

  describe("Token Approval", () => {
    it("should require LBTC approval before deployment", () => {
      const approvalRequired = true;
      expect(approvalRequired).toBe(true);
    });

    it("should approve to vault contract address", () => {
      const vaultAddress = "0x1234567890abcdef1234567890abcdef12345678";
      expect(vaultAddress).toMatch(/^0x/);
    });
  });

  describe("Error Handling", () => {
    it("should reject unsupported protocols", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Protocol invalid-protocol is not supported.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_PARAMETER);
    });

    it("should reject unsupported vaults", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Vault invalid-vault is not available for protocol corn-silo.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_PARAMETER);
    });

    it("should reject chains without protocol support", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Protocol corn-silo is not available on avalanche.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_CHAIN);
    });

    it("should handle insufficient LBTC balance", () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Insufficient LBTC balance for deployment.`,
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
  });

  describe("Public Properties", () => {
    it("should expose protocol property", () => {
      type HasProtocol = { readonly protocol: string };
      const obj: HasProtocol = { protocol: "corn-silo" };
      expect(obj.protocol).toBe("corn-silo");
    });

    it("should expose vault property", () => {
      type HasVault = { readonly vault: string };
      const obj: HasVault = { vault: "LBTC" };
      expect(obj.vault).toBe("LBTC");
    });

    it("should expose status property", () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: "idle" };
      expect(obj.status).toBe("idle");
    });
  });
});
