import { describe, expect, it } from "vitest";

import { Chain, Env } from "@lombard.finance/sdk";

import { getAvailableChains, getDefaultChain } from "../chains";

describe("getAvailableChains", () => {
  it("returns correct prod chains", () => {
    const chains = getAvailableChains(Env.prod);
    const values = chains.map((c) => c.value);

    expect(values).toContain(Chain.ETHEREUM);
    expect(values).toContain(Chain.BASE);
    expect(values).toContain(Chain.BSC);
    expect(values).toContain(Chain.KATANA);
    expect(values).toContain(Chain.SONIC);
    expect(values).toContain(Chain.MONAD);
    expect(values).toContain(Chain.STABLE);

    // BOB should NOT be in prod
    expect(values).not.toContain(Chain.BOB);
  });

  it("returns correct stage chains", () => {
    const chains = getAvailableChains(Env.stage);
    const values = chains.map((c) => c.value);

    expect(values).toContain(Chain.BASE_SEPOLIA);
    expect(values).toContain(Chain.SEPOLIA);
    expect(values).toContain(Chain.BSC_TESTNET);

    // Stage should NOT have Fuji
    expect(values).not.toContain(Chain.AVALANCHE_FUJI);

    // Stage should NOT have Holesky, Sonic Testnet, Katana Tatara, Berachain Bartio
    expect(values).not.toContain(Chain.HOLESKY);
    expect(values).not.toContain(Chain.BERACHAIN_BARTIO);
  });

  it("returns correct testnet chains", () => {
    const chains = getAvailableChains(Env.testnet);
    const values = chains.map((c) => c.value);

    expect(values).toContain(Chain.BASE_SEPOLIA);
    expect(values).toContain(Chain.SEPOLIA);
    expect(values).toContain(Chain.BSC_TESTNET);
    expect(values).toContain(Chain.AVALANCHE_FUJI);

    // Testnet should NOT have old unsupported chains
    expect(values).not.toContain(Chain.HOLESKY);
    expect(values).not.toContain(Chain.BERACHAIN_BARTIO);
  });

  it("stage and testnet have different chain counts", () => {
    const stageChains = getAvailableChains(Env.stage);
    const testnetChains = getAvailableChains(Env.testnet);

    expect(stageChains.length).toBe(3);
    expect(testnetChains.length).toBe(4);
  });
});

describe("getDefaultChain", () => {
  it("returns Ethereum for prod", () => {
    expect(getDefaultChain(Env.prod)).toBe(Chain.ETHEREUM);
  });

  it("returns Base Sepolia for stage", () => {
    expect(getDefaultChain(Env.stage)).toBe(Chain.BASE_SEPOLIA);
  });

  it("returns Base Sepolia for testnet", () => {
    expect(getDefaultChain(Env.testnet)).toBe(Chain.BASE_SEPOLIA);
  });
});
