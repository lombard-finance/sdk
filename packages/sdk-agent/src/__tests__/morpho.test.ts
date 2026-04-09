import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMorphoLbtcMarkets,
  getMorphoPosition,
  prepareMorphoBorrow,
  prepareMorphoSupplyCollateral,
} from "../morpho";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock @lombard.finance/sdk for makePublicClient
const mockReadContract = vi.fn();
vi.mock("@lombard.finance/sdk", () => ({
  makePublicClient: () => ({ readContract: mockReadContract }),
  Env: { prod: "prod", testnet: "testnet" },
  ChainId: {
    ethereum: "ethereum",
    sepolia: "sepolia",
    base: "base",
    baseSepoliaTestnet: "baseSepoliaTestnet",
  },
}));

const MOCK_MARKET = {
  marketId:
    "0xbf02d6c6852fa0b8247d5514d0c91e6c1fbde9a168ac3fd2033028b5ee5ce6d0",
  loanAsset: {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  collateralAsset: {
    symbol: "LBTC",
    address: "0x8236a87084f8B84306f72007F36F2618A5634494",
    decimals: 8,
  },
  oracleAddress: "0xDCc04fFaCD7B49035cCdBbbA59a5f955944129DB",
  irmAddress: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
  lltv: "860000000000000000",
  state: {
    supplyApy: 0.034,
    borrowApy: 0.045,
    supplyAssetsUsd: 4_300_000,
    borrowAssetsUsd: 3_700_000,
    utilization: 0.86,
  },
};

const MOCK_DUST_MARKET = {
  ...MOCK_MARKET,
  marketId:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  loanAsset: {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
  },
  state: {
    supplyApy: 0.001,
    borrowApy: 0.002,
    supplyAssetsUsd: 5, // below MIN_TVL_USD threshold
    borrowAssetsUsd: 1,
    utilization: 0.2,
  },
};

function mockApiResponse(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data }),
  });
}

function mockApiError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockReadContract.mockReset();
});

// ─── getMorphoLbtcMarkets ───────────────────────────────────────────

describe("getMorphoLbtcMarkets", () => {
  it("has correct name, schema, and execute", () => {
    expect(getMorphoLbtcMarkets.name).toBe("get_morpho_lbtc_markets");
    expect(getMorphoLbtcMarkets.parameters).toHaveProperty("type");
    expect(typeof getMorphoLbtcMarkets.execute).toBe("function");
  });

  it("returns formatted markets from API", async () => {
    mockApiResponse({ markets: { items: [MOCK_MARKET] } });

    const result = await getMorphoLbtcMarkets.execute({});
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].marketId).toBe(MOCK_MARKET.marketId);
    expect(result.markets[0].loanAsset).toBe("USDC");
    expect(result.markets[0].collateralAsset).toBe("LBTC");
    expect(result.markets[0].supplyApy).toBe("3.40%");
    expect(result.markets[0].tvlUsd).toBe("$4.30M");
    expect(result.markets[0].utilization).toBe("86.0%");
    expect(result.markets[0].lltv).toBe("86%");
    expect(result.error).toBeUndefined();
  });

  it("filters out dust markets below TVL threshold", async () => {
    mockApiResponse({
      markets: { items: [MOCK_MARKET, MOCK_DUST_MARKET] },
    });

    const result = await getMorphoLbtcMarkets.execute({});
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].loanAsset).toBe("USDC");
  });

  it("sorts markets by TVL descending", async () => {
    const largerMarket = {
      ...MOCK_MARKET,
      marketId:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      loanAsset: {
        symbol: "WBTC",
        address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        decimals: 8,
      },
      state: { ...MOCK_MARKET.state, supplyAssetsUsd: 50_000_000 },
    };
    mockApiResponse({ markets: { items: [MOCK_MARKET, largerMarket] } });

    const result = await getMorphoLbtcMarkets.execute({});
    expect(result.markets).toHaveLength(2);
    expect(result.markets[0].loanAsset).toBe("WBTC");
    expect(result.markets[1].loanAsset).toBe("USDC");
  });

  it("returns error on API failure", async () => {
    mockApiError(500);

    const result = await getMorphoLbtcMarkets.execute({});
    expect(result.markets).toHaveLength(0);
    expect(result.error).toContain("500");
  });

  it("returns empty list when no markets exist", async () => {
    mockApiResponse({ markets: { items: [] } });

    const result = await getMorphoLbtcMarkets.execute({});
    expect(result.markets).toHaveLength(0);
    expect(result.note).toContain("No active");
  });
});

// ─── prepareMorphoSupplyCollateral ──────────────────────────────────

describe("prepareMorphoSupplyCollateral", () => {
  const validParams = {
    marketId: MOCK_MARKET.marketId,
    amount: "0.5",
    address: "0x1234567890abcdef1234567890abcdef12345678",
  };

  it("has correct name, schema, and execute", () => {
    expect(prepareMorphoSupplyCollateral.name).toBe(
      "prepare_morpho_supply_collateral",
    );
    expect(prepareMorphoSupplyCollateral.parameters).toHaveProperty(
      "properties",
    );
    expect(typeof prepareMorphoSupplyCollateral.execute).toBe("function");
  });

  it("returns sdk_execute with approve + supplyCollateral transactions", async () => {
    mockApiResponse({ marketByUniqueKey: MOCK_MARKET });

    const result = await prepareMorphoSupplyCollateral.execute(validParams);
    expect(result.action).toBe("sdk_execute");
    expect(result.method).toBe("morpho.supplyCollateral");
    expect(result.marketId).toBe(MOCK_MARKET.marketId);

    const params = result.params as {
      chainId: number;
      transactions: { to: string; data: string; label: string }[];
    };

    // Must include chainId for frontend chain switching
    expect(params.chainId).toBe(1);

    // Params should contain a transactions array with 2 entries
    const txs = params.transactions;
    expect(txs).toHaveLength(2);

    // Approve transaction targets LBTC
    expect(txs[0].to.toLowerCase()).toBe(
      "0x8236a87084f8B84306f72007F36F2618A5634494".toLowerCase(),
    );
    expect(txs[0].data).toMatch(/^0x/);
    expect(txs[0].label).toContain("Approve");

    // Supply transaction targets Morpho Blue
    expect(txs[1].to.toLowerCase()).toBe(
      "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb".toLowerCase(),
    );
    expect(txs[1].data).toMatch(/^0x/);
    expect(txs[1].label).toContain("Supply");

    expect(result.description).toContain("USDC/LBTC");
    expect(result.error).toBeUndefined();
  });

  it("returns error when market not found", async () => {
    mockApiResponse({ marketByUniqueKey: null });

    const result = await prepareMorphoSupplyCollateral.execute(validParams);
    expect(result.action).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("returns error when collateral is not LBTC", async () => {
    const wrongCollateral = {
      ...MOCK_MARKET,
      collateralAsset: {
        symbol: "WETH",
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals: 18,
      },
    };
    mockApiResponse({ marketByUniqueKey: wrongCollateral });

    const result = await prepareMorphoSupplyCollateral.execute(validParams);
    expect(result.action).toBe("error");
    expect(result.error).toContain("not LBTC");
  });

  it("returns error on API failure", async () => {
    mockApiError(500);

    const result = await prepareMorphoSupplyCollateral.execute(validParams);
    expect(result.action).toBe("error");
    expect(result.error).toContain("500");
  });

  it("rejects invalid market ID format", () => {
    const { schema } = prepareMorphoSupplyCollateral;
    const result = schema.safeParse({
      ...validParams,
      marketId: "not-a-valid-id",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid amount", () => {
    const { schema } = prepareMorphoSupplyCollateral;
    const result = schema.safeParse({
      ...validParams,
      amount: "-1",
    });
    expect(result.success).toBe(false);
  });
});

// ─── prepareMorphoBorrow ────────────────────────────────────────────

describe("prepareMorphoBorrow", () => {
  const validParams = {
    marketId: MOCK_MARKET.marketId,
    amount: "100",
    address: "0x1234567890abcdef1234567890abcdef12345678",
  };

  it("has correct name and schema", () => {
    expect(prepareMorphoBorrow.name).toBe("prepare_morpho_borrow");
    expect(prepareMorphoBorrow.parameters).toHaveProperty("properties");
    expect(typeof prepareMorphoBorrow.execute).toBe("function");
  });

  it("returns sdk_execute with borrow transaction", async () => {
    mockApiResponse({ marketByUniqueKey: MOCK_MARKET });

    const result = await prepareMorphoBorrow.execute(validParams);
    expect(result.action).toBe("sdk_execute");
    expect(result.method).toBe("morpho.borrow");

    const params = result.params as {
      chainId: number;
      transactions: { to: string; data: string; label: string }[];
    };
    expect(params.chainId).toBe(1);
    expect(params.transactions).toHaveLength(1);
    // Borrow targets Morpho Blue contract
    expect(params.transactions[0].to.toLowerCase()).toBe(
      "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb".toLowerCase(),
    );
    expect(params.transactions[0].data).toMatch(/^0x/);
    expect(params.transactions[0].label).toContain("Borrow");
    expect(result.description).toContain("USDC");
  });

  it("returns error when market not found", async () => {
    mockApiResponse({ marketByUniqueKey: null });

    const result = await prepareMorphoBorrow.execute(validParams);
    expect(result.action).toBe("error");
    expect(result.error).toContain("not found");
  });
});

// ─── getMorphoPosition ──────────────────────────────────────────────

describe("getMorphoPosition", () => {
  const validParams = {
    marketId: MOCK_MARKET.marketId,
    address: "0x1234567890abcdef1234567890abcdef12345678",
  };

  it("has correct name and schema", () => {
    expect(getMorphoPosition.name).toBe("get_morpho_position");
    expect(getMorphoPosition.parameters).toHaveProperty("properties");
    expect(typeof getMorphoPosition.execute).toBe("function");
  });

  it("returns position data with collateral and borrows", async () => {
    mockApiResponse({ marketByUniqueKey: MOCK_MARKET });
    // position() returns [supplyShares, borrowShares, collateral]
    mockReadContract.mockResolvedValueOnce([0n, 50000000n, 10000000n]);
    // market() returns [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
    mockReadContract.mockResolvedValueOnce([
      4000000000000n,
      4000000000000n,
      3000000000000n,
      3000000000000n,
      1000000n,
      0n,
    ]);

    const result = await getMorphoPosition.execute(validParams);
    expect(result.collateral).toBe("0.1"); // 10000000 / 1e8
    expect(result.loanAsset).toBe("USDC");
    expect(result.collateralAsset).toBe("LBTC");
    expect(result.lltv).toBe("86%");
    expect(result.error).toBeUndefined();
  });

  it("returns empty position for no collateral", async () => {
    mockApiResponse({ marketByUniqueKey: MOCK_MARKET });
    mockReadContract.mockResolvedValueOnce([0n, 0n, 0n]);
    mockReadContract.mockResolvedValueOnce([0n, 0n, 0n, 0n, 0n, 0n]);

    const result = await getMorphoPosition.execute(validParams);
    expect(result.collateral).toBe("0");
    expect(result.healthStatus).toBe("No position");
  });

  it("returns error when market not found", async () => {
    mockApiResponse({ marketByUniqueKey: null });

    const result = await getMorphoPosition.execute(validParams);
    expect(result.error).toContain("not found");
  });
});
