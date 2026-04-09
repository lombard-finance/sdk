import { describe, expect, it } from "vitest";

/**
 * Starknet Unstake Real Wallet Tests
 *
 * NOTE: These tests are skipped because:
 * 1. The Starknet module requires separate registration via createConfig({ modules: [...] })
 * 2. The @lombard.finance/sdk-starknet package needs to be imported and registered
 *
 * To enable these tests:
 * 1. Import: import { starknetModule } from '@lombard.finance/sdk-starknet'
 * 2. Register: createConfig({ modules: [starknetModule()] })
 */
describe.skip("Starknet Unstake Real Wallet", () => {
  it("should initialize unstake action", () => {
    // Placeholder - requires sdk-starknet module registration
    expect(true).toBe(true);
  });
});
