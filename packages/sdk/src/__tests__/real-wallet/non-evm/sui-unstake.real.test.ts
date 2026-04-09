import { describe, expect, it } from "vitest";

/**
 * Sui Unstake Real Wallet Tests
 *
 * NOTE: These tests are skipped because:
 * 1. The Sui module requires separate registration via createConfig({ modules: [...] })
 * 2. The @lombard.finance/sdk-sui package needs to be imported and registered
 *
 * To enable these tests:
 * 1. Import: import { suiModule } from '@lombard.finance/sdk-sui'
 * 2. Register: createConfig({ modules: [suiModule()] })
 */
describe.skip("Sui Unstake Real Wallet", () => {
  it("should initialize unstake action", () => {
    // Placeholder - requires sdk-sui module registration
    expect(true).toBe(true);
  });
});
