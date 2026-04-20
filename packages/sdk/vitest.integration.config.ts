import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/integration/**/*.test.ts'],
    exclude: [
      'src/__tests__/integration/btc-stake.integration.test.ts',
      'src/__tests__/integration/automint-fee.integration.test.ts',
      'src/__tests__/integration/getLBTCMintingFee.integration.test.ts',
      'src/__tests__/integration/faq-patterns.integration.test.ts',
    ],
    testTimeout: 30000, // 30s for integration tests
  },
});
