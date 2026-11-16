/**
 * The Earn reads whose routes no longer exist are gone from every public
 * entry, rather than left in place to fail at runtime.
 *
 * - `getEarnPoints` read a points route that now answers 401 to everyone.
 * - `getEarnDeposits` and `getEarnDepositsAllChains` read a deposit-history
 *   route with no replacement.
 *
 * A name that reappears here is a public read that can only fail.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as root from '../../..';
import * as vaults from '../../../entries/vaults';
import { collectExports } from '../../helpers/collectExports';

const SRC = join(__dirname, '../../..');
const ENTRIES_DIR = join(SRC, 'entries');

const RETIRED = [
  'getEarnPoints',
  'GetEarnPointsParameters',
  'getEarnDeposits',
  'getEarnDepositsAllChains',
  'GetEarnDepositsParameters',
  'GetEarnDepositsAllChainsParameters',
  'EarnDeposit',
];

const entries = [
  'index.ts',
  ...readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `entries/${f}`),
];

describe('retired Earn reads', () => {
  it.each(entries)('are not exported from %s', (rel) => {
    const names = collectExports(readFileSync(join(SRC, rel), 'utf8'));
    expect(names.filter((n) => RETIRED.includes(n))).toEqual([]);
  });

  it('are absent at runtime from the root and vaults entries', () => {
    for (const name of RETIRED) {
      expect(root).not.toHaveProperty(name);
      expect(vaults).not.toHaveProperty(name);
    }
  });

  it('leave the withdrawal history reads in place', () => {
    expect(typeof root.getEarnWithdrawals).toBe('function');
    expect(typeof vaults.getEarnWithdrawalsAllChains).toBe('function');
  });
});
