import BigNumber from "bignumber.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChainId } from "../../../common/chains";
import { Token } from "../../../tokens/token-addresses";
import { Vault } from "../../../vaults/lib/config";
import { previewVaultDeposit } from "../../../vaults/lib/ops/preview-vault-deposit";

const mockReadContract = vi.fn();

vi.mock("../../../clients/public-client", () => ({
  makePublicClient: vi.fn().mockReturnValue({
    readContract: (...args: unknown[]) => mockReadContract(...args),
  }),
}));

vi.mock("../../../tokens/tokens", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getTokenInfo: vi.fn().mockResolvedValue({
      address: "0x8236a87084f8B84306f72007F36F2618A5634494",
      abi: [],
      symbol: "LBTC",
      decimals: 8,
    }),
  };
});

describe("previewVaultDeposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should return expected shares for a deposit amount", async () => {
      // 0.001 BTC = 100000 sats → 98039 shares (rate ~1.02)
      mockReadContract.mockResolvedValueOnce(98039n);

      const result = await previewVaultDeposit({
        amount: "0.001",
        vaultKey: Vault.Veda,
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber("0.00098039"));
    });

    it("should return 0 shares for amount below minimum", async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await previewVaultDeposit({
        amount: "0.00000001", // 1 satoshi
        vaultKey: Vault.Veda,
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(result).toEqual(BigNumber(0));
    });

    it("should handle large deposit amounts", async () => {
      // 1.0 BTC = 100000000 sats → 98039215 shares
      mockReadContract.mockResolvedValueOnce(98039215n);

      const result = await previewVaultDeposit({
        amount: "1.0",
        vaultKey: Vault.Veda,
        token: Token.LBTC,
      });

      expect(result).toEqual(BigNumber("0.98039215"));
    });
  });

  describe("contract call arguments", () => {
    it("should pass correct arguments to previewDeposit", async () => {
      mockReadContract.mockResolvedValueOnce(9804n);

      await previewVaultDeposit({
        amount: "0.0001", // 10000 sats
        vaultKey: Vault.Veda,
        token: Token.LBTC,
        chainId: ChainId.ethereum,
      });

      expect(mockReadContract).toHaveBeenCalledTimes(1);
      const callArgs = mockReadContract.mock.calls[0][0];

      expect(callArgs.functionName).toBe("previewDeposit");
      // depositAsset
      expect(callArgs.args[0]).toBe(
        "0x8236a87084f8B84306f72007F36F2618A5634494",
      );
      // depositAmount: 0.0001 BTC = 10000 base units
      expect(callArgs.args[1]).toBe(10000n);
      // vault address
      expect(callArgs.args[2]).toBe(
        "0x5401b8620E5FB570064CA9114fd1e135fd77D57c",
      );
      // accountant address
      expect(callArgs.args[3]).toBe(
        "0x28634D0c5edC67CF2450E74deA49B90a4FF93dCE",
      );
    });

    it("should use Lens contract address", async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      await previewVaultDeposit({
        amount: "0.001",
        vaultKey: Vault.Veda,
      });

      const callArgs = mockReadContract.mock.calls[0][0];
      expect(callArgs.address).toBe(
        "0x5232bc0F5999f8dA604c42E1748A13a170F94A1B",
      );
    });
  });

  describe("default parameters", () => {
    it("should default token to LBTC and chain to Ethereum", async () => {
      mockReadContract.mockResolvedValueOnce(98039n);

      const result = await previewVaultDeposit({
        amount: "0.001",
        vaultKey: Vault.Veda,
      });

      expect(result).toEqual(BigNumber("0.00098039"));
    });
  });

  describe("error handling", () => {
    it("should throw for zero amount", async () => {
      await expect(
        previewVaultDeposit({ amount: "0", vaultKey: Vault.Veda }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it("should throw for negative amount", async () => {
      await expect(
        previewVaultDeposit({ amount: "-0.001", vaultKey: Vault.Veda }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it("should throw for unsupported chain", async () => {
      await expect(
        previewVaultDeposit({
          amount: "0.001",
          vaultKey: Vault.Veda,
          chainId: ChainId.sepolia,
        }),
      ).rejects.toThrow(/Unsupported chain id/);
    });

    it("should throw for unsupported token/chain combination", async () => {
      await expect(
        previewVaultDeposit({
          amount: "0.001",
          vaultKey: Vault.Veda,
          token: Token.eBTC,
          chainId: ChainId.base,
        }),
      ).rejects.toThrow(/not supported on chain/);
    });

    it("should throw for unknown vault key", async () => {
      await expect(
        previewVaultDeposit({
          amount: "0.001",
          vaultKey: "unknown" as Vault,
        }),
      ).rejects.toThrow(/Unknown vault key/);
    });
  });

  describe("cross-chain support", () => {
    it("should use Ethereum token address for cross-chain previews", async () => {
      const { getTokenInfo } = await import("../../../tokens/tokens");

      mockReadContract.mockResolvedValueOnce(9804n);

      await previewVaultDeposit({
        amount: "0.0001",
        vaultKey: Vault.Veda,
        token: Token.LBTC,
        chainId: ChainId.base,
      });

      // Should resolve Ethereum address for Lens query
      expect(getTokenInfo).toHaveBeenCalledWith(
        Token.LBTC,
        ChainId.ethereum,
        undefined,
      );
    });
  });

  describe("amount conversion", () => {
    it("should correctly convert decimal amounts to base units", async () => {
      mockReadContract.mockResolvedValueOnce(490196n);

      await previewVaultDeposit({
        amount: "0.005",
        vaultKey: Vault.Veda,
      }); // 500000 sats

      const callArgs = mockReadContract.mock.calls[0][0];
      expect(callArgs.args[1]).toBe(500000n);
    });

    it("should handle string amounts", async () => {
      mockReadContract.mockResolvedValueOnce(9804n);

      const result = await previewVaultDeposit({
        amount: "0.0001",
        vaultKey: Vault.Veda,
      });

      expect(result).toEqual(BigNumber("0.00009804"));
    });

    it("should handle number amounts", async () => {
      mockReadContract.mockResolvedValueOnce(9804n);

      const result = await previewVaultDeposit({
        amount: 0.0001,
        vaultKey: Vault.Veda,
      });

      expect(result).toEqual(BigNumber("0.00009804"));
    });

    it("should handle BigNumber amounts", async () => {
      mockReadContract.mockResolvedValueOnce(9804n);

      const result = await previewVaultDeposit({
        amount: BigNumber("0.0001"),
        vaultKey: Vault.Veda,
      });

      expect(result).toEqual(BigNumber("0.00009804"));
    });
  });
});
