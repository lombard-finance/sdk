import BigNumber from "bignumber.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  allTools,
  checkFeeAuthorization,
  getBalance,
  getDepositBtcAddress,
  getEarnPositions,
  getEarnStrategiesTool,
  getExchangeRate,
  getLbtcApy,
  getTokenInfo,
  prepareBtcbToLbtcStake,
  prepareBtcToBtcbDeposit,
  prepareBtcToLbtcDeposit,
  prepareCancelEarnWithdrawal,
  prepareClaimLbtcDeposit,
  prepareEarnDeposit,
  prepareEarnWithdrawal,
  prepareLbtcToBtc,
  prepareLbtcToBtcb,
  prepareRedeemBtcb,
  toolsByName,
} from "../tools";

const mockGetEarnWithdrawals = vi.fn();

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
    getEarnWithdrawals: (params: unknown) => mockGetEarnWithdrawals(params),
  };
});

function withdrawalsResponse(open: number) {
  return {
    open: Array.from({ length: open }).map((_, i) => ({
      shareAmount: new BigNumber(100 * (i + 1)),
      deadline: 1_900_000_000 + i,
      timestamp: 1_800_000_000 + i,
      txHash: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${i.toString().padStart(4, "0")}`,
      blockNumber: 12_000_000 + i,
    })),
    fulfilled: [],
    cancelled: [],
    expired: [],
  };
}

describe("getBalance", () => {
  it("has correct name and schema", () => {
    expect(getBalance.name).toBe("get_balance");
    expect(getBalance.parameters).toHaveProperty("properties");
    expect(typeof getBalance.execute).toBe("function");
  });
});

describe("getEarnStrategiesTool", () => {
  it("has correct name and schema", () => {
    expect(getEarnStrategiesTool.name).toBe("get_earn_strategies");
    expect(typeof getEarnStrategiesTool.execute).toBe("function");
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

describe("prepareBtcToLbtcDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareBtcToLbtcDeposit.name).toBe("prepare_btc_to_lbtc_deposit");
    expect(prepareBtcToLbtcDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareBtcToLbtcDeposit.execute).toBe("function");
  });

  it("returns sdk_execute action with btc.generateDepositAddress method", async () => {
    const result = await prepareBtcToLbtcDeposit.execute({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "btc.generateLbtcDepositAddress");
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

describe("getEarnPositions", () => {
  it("has correct name and schema", () => {
    expect(getEarnPositions.name).toBe("get_earn_positions");
    expect(getEarnPositions.parameters).toHaveProperty("properties");
    expect(typeof getEarnPositions.execute).toBe("function");
  });
});

describe("prepareClaimLbtcDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareClaimLbtcDeposit.name).toBe("prepare_claim_lbtc_deposit");
    expect(prepareClaimLbtcDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareClaimLbtcDeposit.execute).toBe("function");
  });
});

describe("allTools", () => {
  it("has 32 entries", () => {
    expect(allTools).toHaveLength(32);
  });

  it("contains all expected tools including new ones", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("get_balance");
    expect(names).toContain("get_earn_strategies");
    expect(names).toContain("get_deposit_btc_address");
    expect(names).toContain("check_fee_authorization");
    expect(names).toContain("prepare_btc_to_lbtc_deposit");
    expect(names).toContain("prepare_btc_to_btcb_deposit");
    expect(names).toContain("get_lbtc_apy");
    expect(names).toContain("get_earn_positions");
    expect(names).toContain("prepare_claim_lbtc_deposit");
    expect(names).toContain("prepare_earn_withdrawal");
    expect(names).toContain("prepare_cancel_earn_withdrawal");
    expect(names).toContain("get_morpho_lbtc_markets");
    expect(names).toContain("prepare_morpho_supply_collateral");
    expect(names).toContain("prepare_morpho_borrow");
    expect(names).toContain("get_morpho_position");
    expect(names).toContain("get_token_balance");
    expect(names).toContain("prepare_morpho_repay");
    expect(names).toContain("get_lbtc_defi_opportunities");
    expect(names).toContain("prepare_btcb_to_lbtc_stake");
    expect(names).toContain("prepare_lbtc_to_btc");
    expect(names).toContain("prepare_lbtc_to_btcb");
    expect(names).toContain("prepare_redeem_btcb");
    expect(names).toContain("get_redemption_status");
    expect(names).toContain("get_earn_withdrawals");
    expect(names).toContain("get_lux_points");
    expect(names).toContain("get_positions_summary");
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
    expect(toolsByName).toHaveProperty("get_earn_strategies");
    expect(toolsByName).toHaveProperty("get_deposit_btc_address");
    expect(toolsByName).toHaveProperty("check_fee_authorization");
    expect(toolsByName).toHaveProperty("prepare_btc_to_lbtc_deposit");
    expect(toolsByName).toHaveProperty("get_lbtc_apy");
    expect(toolsByName).toHaveProperty("get_earn_positions");
    expect(toolsByName).toHaveProperty("prepare_claim_lbtc_deposit");
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

  describe("prepareLbtcToBtc", () => {
    it("returns valid:false when recipient is missing", async () => {
      const result = await prepareLbtcToBtc.execute({
        amount: "0.5",
        chainId: 1,
      } as unknown as { amount: string; recipient: string; chainId: number });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns valid:false when amount is below minimum", async () => {
      const result = await prepareLbtcToBtc.execute({
        amount: "0.0000001",
        recipient: MAINNET_BECH32,
        chainId: 1,
      });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns valid:false when recipient looks like an EVM address", async () => {
      const result = await prepareLbtcToBtc.execute({
        amount: "0.5",
        recipient: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns a prepared tx (valid:true) when all inputs check out", async () => {
      const result = await prepareLbtcToBtc.execute({
        amount: "0.5",
        recipient: MAINNET_BECH32,
        chainId: 1,
      });
      expect(result).toMatchObject({
        valid: true,
        action: "sdk_execute",
        method: "evm.lbtcToBtc",
      });
    });
  });

  describe("prepareLbtcToBtcb", () => {
    it("returns valid:false when amount is below minimum", async () => {
      const result = await prepareLbtcToBtcb.execute({
        amount: "0.0000001",
        chainId: 11155111,
      });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns a prepared tx (valid:true) for a valid same-chain redemption", async () => {
      const result = await prepareLbtcToBtcb.execute({
        amount: "0.5",
        chainId: 1,
      });
      expect(result).toMatchObject({
        valid: true,
        action: "sdk_execute",
        method: "evm.lbtcToBtcb",
      });
    });
  });

  describe("prepareBtcbToLbtcStake", () => {
    it("returns valid:false when amount is below MIN_STAKE_AMOUNT_BTC", async () => {
      const result = await prepareBtcbToLbtcStake.execute({ amount: "0.00001", chainId: 1 });
      expect(result).toMatchObject({ valid: false });
    });

    it("returns a prepared tx (valid:true) for a valid stake", async () => {
      const result = await prepareBtcbToLbtcStake.execute({ amount: "0.5", chainId: 1 });
      expect(result).toMatchObject({ valid: true, method: "evm.btcbToLbtc" });
    });
  });

  describe("prepareEarnDeposit / prepareEarnWithdrawal", () => {
    it("deploy returns valid:false on zero amount", async () => {
      const result = await prepareEarnDeposit.execute({ amount: "0", chainId: 1 });
      expect(result).toMatchObject({ valid: false });
    });

    it("deploy returns valid:true on positive amount", async () => {
      const result = await prepareEarnDeposit.execute({ amount: "0.1", chainId: 1 });
      expect(result).toMatchObject({ valid: true, method: "evm.earnDeposit" });
    });

    it("withdrawal returns valid:false on negative-looking amount", async () => {
      const result = await prepareEarnWithdrawal.execute({
        amount: "-0.5",
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      });
      expect(result).toMatchObject({ valid: false });
    });
  });
});

// ─── Truncation guard: prepare_btc_to_lbtc_deposit emits the full address ───

describe("prepare_btc_to_lbtc_deposit does not truncate the wallet address", () => {
  it("emits the full 0x-prefixed 40-char address in the description", async () => {
    const fullAddr = "0x1234567890abcdef1234567890abcdef12345678";
    const result = await prepareBtcToLbtcDeposit.execute({
      address: fullAddr,
      chainId: 1,
    });
    expect(result.description).toContain(fullAddr);
    expect(result.description).not.toMatch(/0x[0-9a-f]{4}\.\.\.[0-9a-f]{4}/i);
  });
});

// ─── BTC -> BTC.b deposit tool ──────────────────────────────────────

describe("prepareBtcToBtcbDeposit", () => {
  it("registers under the new name and is in allTools", () => {
    expect(prepareBtcToBtcbDeposit.name).toBe("prepare_btc_to_btcb_deposit");
    expect(toolsByName).toHaveProperty("prepare_btc_to_btcb_deposit");
    expect(allTools.map((t) => t.name)).toContain(
      "prepare_btc_to_btcb_deposit",
    );
  });

  it("returns btc.generateBtcbDepositAddress as the method", async () => {
    const result = await prepareBtcToBtcbDeposit.execute({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result).toMatchObject({
      action: "sdk_execute",
      method: "btc.generateBtcbDepositAddress",
    });
  });

  it("description names BTC.b explicitly (not LBTC) so the LLM doesn't conflate the flows", async () => {
    const result = await prepareBtcToBtcbDeposit.execute({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.description).toMatch(/BTC\.b/);
    expect(result.description).not.toMatch(/mint LBTC/);
  });
});

// ─── Withdrawal pre-flight (one active per user per vault) ─────────

const TEST_ADDR = "0x1234567890abcdef1234567890abcdef12345678";

describe("prepare_earn_withdrawal active-withdrawal pre-flight", () => {
  beforeEach(() => {
    mockGetEarnWithdrawals.mockReset();
  });

  it("returns valid:true when there is no active withdrawal", async () => {
    mockGetEarnWithdrawals.mockResolvedValue(withdrawalsResponse(0));

    const result = await prepareEarnWithdrawal.execute({
      amount: "0.5",
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({
      valid: true,
      method: "evm.earnWithdrawal",
    });
    expect(mockGetEarnWithdrawals).toHaveBeenCalledOnce();
  });

  it("refuses with valid:false and surfaces existing withdrawal details when one is already queued", async () => {
    mockGetEarnWithdrawals.mockResolvedValue(withdrawalsResponse(1));

    const result = await prepareEarnWithdrawal.execute({
      amount: "0.5",
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.errors.join(" ")).toMatch(/active withdrawal already exists/i);
      expect(result.note).toMatch(/prepare_cancel_earn_withdrawal/);
      // Existing withdrawal details surfaced verbatim
      expect(result.errors.join(" ")).toContain("100"); // shareAmount
      expect(result.note).toMatch(/0xaaaaaaaa/); // txHash prefix
    }
  });

  it("surfaces the error when the pre-flight check itself fails (does not silently queue)", async () => {
    mockGetEarnWithdrawals.mockRejectedValue(new Error("BFF timeout"));

    const result = await prepareEarnWithdrawal.execute({
      amount: "0.5",
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.errors.join(" ")).toMatch(/Could not verify/i);
    }
  });
});

// ─── prepare_cancel_earn_withdrawal ─────────────────────────────────────

describe("prepare_cancel_earn_withdrawal", () => {
  beforeEach(() => {
    mockGetEarnWithdrawals.mockReset();
  });

  it("refuses with valid:false when there is no active withdrawal to cancel", async () => {
    mockGetEarnWithdrawals.mockResolvedValue(withdrawalsResponse(0));

    const result = await prepareCancelEarnWithdrawal.execute({
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.errors.join(" ")).toMatch(/No active withdrawal/i);
    }
  });

  it("returns the cancel tx with active withdrawal details in the description", async () => {
    mockGetEarnWithdrawals.mockResolvedValue(withdrawalsResponse(1));

    const result = await prepareCancelEarnWithdrawal.execute({
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({
      valid: true,
      action: "sdk_execute",
      method: "evm.cancelEarnWithdrawal",
    });
    if ("valid" in result && result.valid === true) {
      expect(result.description).toContain("100"); // shareAmount
      expect(result.description).toMatch(/0xaaaaaaaa/); // txHash prefix
      expect(result.description).toMatch(/Cancel pending Bitcoin Earn/i);
    }
  });

  it("surfaces the error if the lookup itself fails", async () => {
    mockGetEarnWithdrawals.mockRejectedValue(new Error("BFF timeout"));

    const result = await prepareCancelEarnWithdrawal.execute({
      address: TEST_ADDR,
      chainId: 1,
    });

    expect(result).toMatchObject({ valid: false });
  });
});

// ─── get_token_info ─────────────────────────────────────────────────

describe("get_token_info", () => {
  it("resolves canonical Lombard symbols", async () => {
    const result = await getTokenInfo.execute({ query: "BTCe" });
    expect(result.found).toBe(true);
    expect(result.asset?.symbol).toBe("BTCe");
    expect(result.asset?.isYieldBearing).toBe(true);
    expect(result.asset?.description.toLowerCase()).toContain("bitcoin earn");
  });

  it("resolves aliases", async () => {
    const lbtc = await getTokenInfo.execute({ query: "Lombard BTC" });
    expect(lbtc.found).toBe(true);
    expect(lbtc.asset?.symbol).toBe("LBTC");

    const btcb = await getTokenInfo.execute({ query: "BTCb" });
    expect(btcb.found).toBe(true);
    expect(btcb.asset?.symbol).toBe("BTC.b");
  });

  it("resolves a BTCe contract address scoped to its chain", async () => {
    // BTCe contract address on Ethereum mainnet
    const result = await getTokenInfo.execute({
      address: "0x3a4baaBf4DC9910596821615e848f0e6545762F3",
      chainId: 1,
    });
    expect(result.found).toBe(true);
    expect(result.asset?.symbol).toBe("BTCe");
  });

  it("returns found:false with suggestions for unknown tokens", async () => {
    const result = await getTokenInfo.execute({ query: "DOGE" });
    expect(result.found).toBe(false);
    expect(result.suggestions).toContain("BTCe");
    expect(result.suggestions).toContain("LBTC");
    expect(result.note).toMatch(/Known symbols/i);
  });

  it("returns guidance when neither query nor address provided", async () => {
    const result = await getTokenInfo.execute({});
    expect(result.found).toBe(false);
    expect(result.note).toMatch(/Provide a `query`/);
  });
});

// ─── prepare_redeem_btcb (BTC.b -> native BTC) ──────────────────────

describe("prepare_redeem_btcb", () => {
  const MAINNET_BECH32 = "bc1q9zpgru5xkx4ekzgdsv9zg9pe6ye2qu5jq3jukx";
  const TESTNET_BECH32 =
    "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3";

  it("is registered with the correct name + method", async () => {
    expect(prepareRedeemBtcb.name).toBe("prepare_redeem_btcb");
    expect(toolsByName).toHaveProperty("prepare_redeem_btcb");
    expect(allTools.map((t) => t.name)).toContain("prepare_redeem_btcb");
  });

  it("returns valid:true with method evm.redeemBtcb on the happy path", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.5",
      recipient: MAINNET_BECH32,
      chainId: 1,
    });
    expect(result).toMatchObject({
      valid: true,
      action: "sdk_execute",
      method: "evm.btcbToBtc",
    });
    if ("valid" in result && result.valid === true) {
      expect(result.params).toMatchObject({
        amount: "0.5",
        recipient: MAINNET_BECH32,
      });
    }
  });

  it("rejects when recipient is missing", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.5",
      recipient: "",
      chainId: 1,
    });
    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.missing).toContain("recipient");
    }
  });

  it("rejects an EVM address in the recipient slot", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.5",
      recipient: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.errors.join(" ")).toMatch(/valid Bitcoin address/i);
    }
  });

  it("rejects a mainnet recipient on a testnet chain", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.5",
      recipient: MAINNET_BECH32,
      chainId: 11155111, // sepolia
    });
    expect(result).toMatchObject({ valid: false });
  });

  it("accepts a testnet recipient on Sepolia", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.5",
      recipient: TESTNET_BECH32,
      chainId: 11155111,
    });
    expect(result).toMatchObject({ valid: true, method: "evm.btcbToBtc" });
  });

  it("rejects amounts below MIN_REDEEM_AMOUNT_BTC", async () => {
    const result = await prepareRedeemBtcb.execute({
      amount: "0.0000001",
      recipient: MAINNET_BECH32,
      chainId: 1,
    });
    expect(result).toMatchObject({ valid: false });
    if ("valid" in result && result.valid === false) {
      expect(result.errors.join(" ")).toMatch(/minimum/i);
    }
  });
});
