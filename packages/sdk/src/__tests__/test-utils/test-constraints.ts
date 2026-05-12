/**
 * Test Constraints Utilities
 *
 * Provides deterministic, rotating inputs to avoid backend state collisions
 * (e.g., deposit address reuse for the same partner + recipient + chain).
 *
 * @module __tests__/test-utils/test-constraints
 */

import { createHash } from 'node:crypto';

const TEST_PARTNER_IDS = [
  'test1',
  'test2',
  'test3',
  'test4',
  'test5',
  'test6',
  'test7',
  'test8',
  'test9',
  'test10',
];

const BTC_TESTNET_RECIPIENTS = [
  'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
  'tb1qhs9gw5i9r83mmd4sx4d4m6zryudq4c0mns2z2v',
  'tb1qz2x8f6g5puhm2l6hpr90ks9wq9m5vps0f7x6c6',
  'tb1q6e5l7h3f4ux8d0wqz7q2j2l7f5tq9sgatxv4z2',
  'tb1q4u3xv2s7d8e9k0l2m3n4p5r6t7y8u9i0o1p2a3',
  'tb1qv0k3z5n7c9x2l4j6h8g0f2d4s6a8q9w0e1r2t3',
  'tb1q3y5u7i9o0p2a4s6d8f0g2h4j6k8l9z0x1c2v3',
  'tb1qx9c7v5b3n1m0a8s6d4f2g0h9j8k7l6p5o4i3u',
  'tb1q5t7r9e1w3q5a7s9d1f3g5h7j9k1l3z5x7c9v1',
  'tb1q2w4e6r8t0y2u4i6o8p0a2s4d6f8g0h2j4k6l8',
];

const EVM_TEST_RECIPIENTS = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0x00000000219ab540356cBB839Cbe05303d7705Fa',
  '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  '0x0bBb9dDD6E2c3b84fFBEbA07bF737a14aA0f1A1A',
];

function toNumber(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Determine a stable run identifier for rotating test inputs.
 */
export function getTestRunId(): number {
  const fromEnv =
    toNumber(process.env.CI_RUN_ID) ??
    toNumber(process.env.GITHUB_RUN_ID) ??
    toNumber(process.env.GITLAB_RUN_ID) ??
    toNumber(process.env.BUILD_NUMBER);

  if (fromEnv !== null) {
    return fromEnv;
  }

  return Number.parseInt(String(Date.now() / 1000), 10);
}

/**
 * Compute a deterministic index for a list based on run ID and label.
 */
export function getRotatingIndex(
  length: number,
  label: string,
  runId = getTestRunId(),
): number {
  if (length <= 0) {
    return 0;
  }
  const hash = createHash('sha256').update(`${label}:${runId}`).digest('hex');
  const slice = hash.slice(0, 8);
  const value = Number.parseInt(slice, 16);
  return value % length;
}

/**
 * Get a deterministic partner ID for the current test run.
 */
export function getTestPartnerId(runId = getTestRunId()): string {
  const override = process.env.TEST_PARTNER_ID;
  if (override) {
    return override;
  }
  const index = getRotatingIndex(TEST_PARTNER_IDS.length, 'partner', runId);
  return TEST_PARTNER_IDS[index];
}

/**
 * Get a deterministic BTC testnet recipient address.
 */
export function getTestBtcRecipient(runId = getTestRunId()): string {
  const index = getRotatingIndex(BTC_TESTNET_RECIPIENTS.length, 'btc', runId);
  return BTC_TESTNET_RECIPIENTS[index];
}

/**
 * Get a deterministic EVM recipient address.
 */
export function getTestEvmRecipient(runId = getTestRunId()): string {
  const index = getRotatingIndex(EVM_TEST_RECIPIENTS.length, 'evm', runId);
  return EVM_TEST_RECIPIENTS[index];
}
