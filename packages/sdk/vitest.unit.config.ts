import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Everything under src/ except the tiers that own their own config.
    //
    // This used to name three directories explicitly, which silently stranded
    // every co-located __tests__ directory (~198 test blocks across 18 files,
    // including BaseAction, BtcStake, the event maps, and the stake-and-bake
    // contract functions). Those files ran only under `test:watch`/`test:ui`,
    // neither of which runs in CI. Prefer a broad include with explicit
    // exclusions so a new co-located test is covered by default.
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Owned by vitest.integration.config.ts (mocked) and
      // vitest.integration.online.config.ts (live network).
      'src/__tests__/integration/**',
      // Real-wallet tests spend testnet funds. They self-skip unless
      // TEST_*_PRIVATE_KEY is set, but .env.example documents those vars, so a
      // developer with one exported would otherwise broadcast real
      // transactions from `yarn test:unit`. Keep them opt-in and explicit.
      '**/*.real.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      // Action classes and their configs are what the SDK's behaviour lives in.
      // Global percentages are dominated by import-time constant tables (ABIs,
      // asset catalog, registries) that count as covered merely by being
      // imported, which makes a repo-wide threshold satisfiable with zero
      // behavioural assertions. Scope the ratchet to the code that acts.
      include: ['src/chains/**', 'src/shared/actions/**'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/scripts/**',
        '**/abi/**',
        '**/__tests__/**',
      ],
      // A ratchet, not a target: set at the floor measured on the commit that
      // introduced it. Raise these as the behavioural suite lands. Never lower
      // them to make a change pass — that is the whole point of the mechanism.
      //
      // Note on branches: adding tests can *reduce* the branch percentage,
      // because reaching new files pulls their unexercised branches into the
      // denominator. Measured here at 52.96 / 84.37 / 59.36 / 52.96 — up from
      // 45.16 / 88.26 / 56.50 / 45.16 before the BTC resume-path suite, with
      // branches moving down for exactly that reason. Judge a change by the
      // statement and function numbers; treat a branch dip as a prompt to look
      // at what newly-reached code is untested.
      thresholds: {
        statements: 52,
        branches: 84,
        functions: 59,
        lines: 52,
      },
    },
  },
});
