import { describe, expect, it } from "vitest";

/**
 * Solana Unstake Real Wallet Tests
 *
 * NOTE: These tests are skipped because:
 * 1. The Solana module requires separate registration via createConfig({ modules: [...] })
 * 2. The @lombard.finance/sdk-solana package needs to be imported and registered
 *
 * To enable these tests:
 * 1. Import: import { solanaModule } from '@lombard.finance/sdk-solana'
 * 2. Register: createConfig({ modules: [solanaModule()] })
 */
describe.skip("Solana Unstake Real Wallet", () => {
  it("should prepare unstake transaction", () => {
    // Placeholder - requires sdk-solana module registration
    expect(true).toBe(true);
  });
});
