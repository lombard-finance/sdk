import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    /**
     * Vitest's default is 5s, which this suite does not have the margin for.
     *
     * Nothing here waits: there is no sleep, no backoff and no unmocked
     * request. But the tests that construct a real action do real
     * cryptographic work — EIP-712 signing, secp256k1, bitcoinjs-lib
     * initialisation — and a dozen of them take 400ms to 2.3s warm, the
     * slowest being 2281ms. Against 5s that is a 2.2x margin, and 120 files
     * across parallel workers on a shared runner eats it.
     *
     * The symptom was a suite that failed roughly one run in three, on a
     * *different* test each time, always with `Test timed out in 5000ms` —
     * whichever slow test lost the CPU race. It also corrupts the run it
     * appears in: a timed-out test's late `toMatchSnapshot()` lands on the
     * next test's snapshot counter, so an unrelated golden reports a mismatch
     * against a key that does not exist on disk.
     *
     * 15s is ~6.5x the slowest measured test and half what
     * `vitest.integration.config.ts` already allows itself. Raising this
     * hides no hang: a test that genuinely stops still fails, just not on
     * whether the runner was busy.
     */
    testTimeout: 15_000,
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
      // denominator. Judge a change by the statement and function numbers;
      // treat a branch dip as a prompt to look at what newly-reached code is
      // untested.
      //
      // History, statements / branches / functions / lines:
      //   45.16 / 88.26 / 56.50 / 45.16  before the BTC resume-path suite
      //   52.96 / 84.37 / 59.36 / 52.96  at the ratchet's introduction
      //   65.10 / 83.36 / 67.80 / 65.10  after goldening all sixteen classes,
      //                                  which dipped branches below the floor
      //                                  because the goldens reach the non-BTC
      //                                  chains for the first time
      //   67.66 / 84.12 / 69.51 / 67.66  after covering the BTC route validator
      //                                  and the EVM fee-auth path, both of
      //                                  which went from under 20% to 100%
      //   68.04 / 84.50 / 69.75 / 68.04  after the stage B contract and the
      //                                  BTC.b vault availability fix
      // Branches sit a point below the measured 84.09-84.12 because that
      // figure moves slightly between runs, and a gate that fails on its own
      // jitter teaches people to ignore it. Statements and functions are
      // stable, so they carry the ratchet.
      thresholds: {
        statements: 68,
        branches: 83,
        functions: 69,
        lines: 68,
      },
    },
  },
});
