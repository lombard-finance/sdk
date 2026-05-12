import { describe, expect, it, vi } from "vitest";

import {
  allTools,
  checkFeeAuthorization,
  getBalance,
  getDepositBtcAddress,
  getExchangeRate,
  getLbtcApy,
  getStrategies,
  getVaultPositions,
  prepareBtcDeposit,
  prepareClaimDeposit,
  prepareDeployToVault,
  prepareStake,
  prepareUnstake,
  prepareVaultWithdrawal,
  toolsByName,
} from "../tools";

vi.mock("@lombard.finance/sdk", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@lombard.finance/sdk",
  );
  return {
    ...actual,
    getExchangeRatio: vi.fn().mockResolvedValue({
      LBTC: { BTCTokenRatio: 1.001, tokenBTCRatio: 0.999 },
    }),
    getLBTCExchangeRate: vi.fn().mockResolvedValue({
      exchangeRate: 1,
      minAmount: 100000,
    }),
  };
});

describe("getBalance", () => {
  it("has correct name and schema", () => {
    expect(getBalance.name).toBe("get_balance");
    expect(getBalance.parameters).toHaveProperty("properties");
    expect(typeof getBalance.execute).toBe("function");
  });
});

describe("getStrategies", () => {
  it("has correct name and schema", () => {
    expect(getStrategies.name).toBe("get_strategies");
    expect(typeof getStrategies.execute).toBe("function");
  });
});

describe("getDepositBtcAddress", () => {
  it("has correct name and schema", () => {
    expect(getDepositBtcAddress.name).toBe("get_deposit_btc_address");
    expect(typeof getDepositBtcAddress.execute).toBe("function");
  });
});

describe("checkFeeAuthorization", () => {
  it("has correct name and schema", () => {
    expect(checkFeeAuthorization.name).toBe("check_fee_authorization");
    expect(checkFeeAuthorization.parameters).toHaveProperty("properties");
    expect(typeof checkFeeAuthorization.execute).toBe("function");
  });
});

describe("prepareBtcDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareBtcDeposit.name).toBe("prepare_btc_deposit");
    expect(prepareBtcDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareBtcDeposit.execute).toBe("function");
  });

  it("returns sdk_execute action with btc.generateDepositAddress method", async () => {
    const result = await prepareBtcDeposit.execute({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "btc.generateDepositAddress");
    expect(result.params).toHaveProperty("address");
    expect(result.params).toHaveProperty("chainId");
    expect(result).toHaveProperty("description");
  });
});

describe("getLbtcApy", () => {
  it("has correct name and schema", () => {
    expect(getLbtcApy.name).toBe("get_lbtc_apy");
    expect(typeof getLbtcApy.execute).toBe("function");
  });
});

describe("getVaultPositions", () => {
  it("has correct name and schema", () => {
    expect(getVaultPositions.name).toBe("get_vault_positions");
    expect(getVaultPositions.parameters).toHaveProperty("properties");
    expect(typeof getVaultPositions.execute).toBe("function");
  });
});

describe("prepareClaimDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareClaimDeposit.name).toBe("prepare_claim_deposit");
    expect(prepareClaimDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareClaimDeposit.execute).toBe("function");
  });
});

describe("allTools", () => {
  it("has 24 entries", () => {
    expect(allTools).toHaveLength(24);
  });

  it("contains all expected tools including new ones", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("get_balance");
    expect(names).toContain("get_strategies");
    expect(names).toContain("get_deposit_btc_address");
    expect(names).toContain("check_fee_authorization");
    expect(names).toContain("prepare_btc_deposit");
    expect(names).toContain("get_lbtc_apy");
    expect(names).toContain("get_vault_positions");
    expect(names).toContain("prepare_claim_deposit");
    expect(names).toContain("prepare_vault_withdrawal");
    expect(names).toContain("get_morpho_lbtc_markets");
    expect(names).toContain("prepare_morpho_supply_collateral");
    expect(names).toContain("prepare_morpho_borrow");
    expect(names).toContain("get_morpho_position");
    expect(names).toContain("get_token_balance");
    expect(names).toContain("prepare_morpho_repay");
    expect(names).toContain("get_opportunities");
  });

  it("each tool has name, description, parameters, schema, and execute", () => {
    for (const tool of allTools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("parameters");
      expect(tool).toHaveProperty("schema");
      expect(tool).toHaveProperty("execute");
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.parameters).toBe("object");
      expect(typeof tool.schema).toBe("object");
      expect(typeof tool.execute).toBe("function");
    }
  });
});

describe("toolsByName", () => {
  it("maps tool names correctly", () => {
    for (const tool of allTools) {
      expect(toolsByName[tool.name]).toBe(tool);
    }
  });

  it("has the same number of entries as allTools", () => {
    expect(Object.keys(toolsByName)).toHaveLength(allTools.length);
  });

  it("contains new tools", () => {
    expect(toolsByName).toHaveProperty("get_balance");
    expect(toolsByName).toHaveProperty("get_strategies");
    expect(toolsByName).toHaveProperty("get_deposit_btc_address");
    expect(toolsByName).toHaveProperty("check_fee_authorization");
    expect(toolsByName).toHaveProperty("prepare_btc_deposit");
    expect(toolsByName).toHaveProperty("get_lbtc_apy");
    expect(toolsByName).toHaveProperty("get_vault_positions");
    expect(toolsByName).toHaveProperty("prepare_claim_deposit");
    expect(toolsByName).toHaveProperty("get_morpho_lbtc_markets");
    expect(toolsByName).toHaveProperty("prepare_morpho_supply_collateral");
    expect(toolsByName).toHaveProperty("prepare_morpho_borrow");
    expect(toolsByName).toHaveProperty("get_morpho_position");
  });
});

describe("getExchangeRate.execute", () => {
  it("returns lbtcToBtc, btcToLbtc, description, and minStakeAmountBtc", async () => {
    const result = await getExchangeRate.execute({});
    expect(result).toHaveProperty("lbtcToBtc");
    expect(result).toHaveProperty("btcToLbtc");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("minStakeAmountBtc");
    expect(typeof result.lbtcToBtc).toBe("string");
    expect(typeof result.btcToLbtc).toBe("string");
    expect(typeof result.description).toBe("string");
    expect(typeof result.minStakeAmountBtc).toBe("string");
  });
});

// ─── Validate-first behavior on prepare_* tools ────────────────────

describe("prepare_* tools: validate-first contract", () => {
  const MAINNET_BECH32 = "bc1q9zpgru5xkx4ekzgdsv9zg9pe6ye2qu5jq3jukx";

  describe("prepareUnstake", () => {
    it("returns valid:false when outputAsset='BTC' and recipient is missing", async () => {
      const result = await prepareUnstake.execute({
        amount: "0.5",
        outputAsset: "BTC",
        chainId: 1,
      });
      expect(result).toMatchObject({ valid: false });
      if (!("valid" in result) || result.valid === true) throw new Error("expected validation failure");
      expect(result.missing).toContain("recipient");
    });

    it("returns valid:false when amount is below minimum", async () => {
      const result = await prepareUnstake.execute({
        amount: "0.0000001",
        outputAsset: "BTCb",
        chainId: 11155111,
      });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns valid:false when recipient looks like an EVM address on BTC output", async () => {
      const result = await prepareUnstake.execute({
        amount: "0.5",
        outputAsset: "BTC",
        recipient: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns a prepared tx (valid:true) when all inputs check out", async () => {
      const result = await prepareUnstake.execute({
        amount: "0.5",
        outputAsset: "BTC",
        recipient: MAINNET_BECH32,
        chainId: 1,
      });
      expect(result).toMatchObject({
        valid: true,
        action: "sdk_execute",
        method: "evm.unstake",
      });
    });
  });

  describe("prepareStake", () => {
    it("returns valid:false when amount is below MIN_STAKE_AMOUNT_BTC", async () => {
      const result = await prepareStake.execute({ amount: "0.00001", chainId: 1 });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns a prepared tx (valid:true) for a valid stake", async () => {
      const result = await prepareStake.execute({ amount: "0.5", chainId: 1 });
      expect(result).toMatchObject({ valid: true, method: "evm.stake" });
    });
  });

  describe("prepareDeployToVault / prepareVaultWithdrawal", () => {
    it("deploy returns valid:false on zero amount", async () => {
      const result = await prepareDeployToVault.execute({ amount: "0", chainId: 1 });
      expect(result).toMatchObject({ valid: false });
    });

    it("deploy returns valid:true on positive amount", async () => {
      const result = await prepareDeployToVault.execute({ amount: "0.1", chainId: 1 });
      expect(result).toMatchObject({ valid: true, method: "evm.deploy" });
    });

    it("withdrawal returns valid:false on negative-looking amount", async () => {
      const result = await prepareVaultWithdrawal.execute({ amount: "-0.5", chainId: 1 });
      expect(result).toMatchObject({ valid: false });
    });
  });
});

// ─── Truncation guard: prepare_btc_deposit emits the full address ───

describe("prepare_btc_deposit does not truncate the wallet address", () => {
  it("emits the full 0x-prefixed 40-char address in the description", async () => {
    const fullAddr = "0x1234567890abcdef1234567890abcdef12345678";
    const result = await prepareBtcDeposit.execute({
      address: fullAddr,
      chainId: 1,
    });
    expect(result.description).toContain(fullAddr);
    expect(result.description).not.toMatch(/0x[0-9a-f]{4}\.\.\.[0-9a-f]{4}/i);
  });
});
