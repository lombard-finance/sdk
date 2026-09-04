/**
 * Strings that leave the process, pinned
 *
 * Some strings in this package are not names — they are protocol. An ABI method
 * name selects a function on a deployed contract; a route label is a key in an
 * analytics series that already has history behind it. Renaming one is not a
 * refactor, it is a behaviour change with no compiler and no test to stop it.
 *
 * That matters most during a rename release. v6 renames facade verbs —
 * `withdraw` becomes `withdraw`, `stakeAndDeploy` becomes `deploy`, `deposit`
 * becomes `claim` on EVM — and every one of those words also appears as an ABI
 * method name. A repo-wide replace of `deposit` would rewrite
 * `functionName: 'deposit'` into a selector no contract implements, and the
 * transaction would revert at the node rather than fail here. Nothing in the
 * existing suite covers that: the contract calls are mocked by name, so a mock
 * renamed alongside the source agrees with itself.
 *
 * So these are pinned by exact value. A change here is either a genuine protocol
 * change — in which case update the pin deliberately, with the on-chain reason —
 * or an accident, which is what this exists to catch.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');

/**
 * ABI method names whose spelling collides with a facade verb this release
 * renames. These are the ones a careless replace would hit.
 *
 * The value is the on-chain method. The comment is why it cannot move.
 */
const COLLIDING_ABI_METHODS = [
  // LBTC vaults and the BTC.b wrapper both expose ERC-4626-style `deposit`.
  'deposit',
  // ERC-4626 `withdraw`, and the Earn vault's own withdraw.
  'withdraw',
  // The LBTC burn path. `redeem` is also the legacy spelling kept for older
  // deployments, so both call sites matter.
  'redeem',
] as const;

/** Analytics keys. Renaming one silently splits a series that has history. */
const ROUTE_LABELS = [
  'btc-to-lbtc',
  'btc-to-btcb',
  'btc-to-vault',
  'btcb-to-lbtc',
  'btcb-to-btc',
  'lbtc-to-btc',
  'lbtc-to-btcb',
  'lbtc-to-vault',
  'btcb-to-vault',
  'vault-to-lbtc',
  'vault-to-btcb',
] as const;

/**
 * Blanks comments before matching.
 *
 * Without this the check would fire on prose — a comment mentioning
 * `functionName: 'deposit'` would count as a call site, and the counts below
 * would drift every time someone explained one.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// These tests assert on the package's own source: they walk `src` and read
// what they find, so the path is discovered rather than written down. That is
// the property being checked — a literal path could only ever cover the files
// someone remembered to list, which is the gap these suites exist to close.
// No input reaches them from outside the repository.
function sourceFiles(dir: string, found: string[] = []): string[] {
  // nosemgrep
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // nosemgrep
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      sourceFiles(full, found);
    } else if (extname(entry) === '.ts' && !entry.endsWith('.test.ts')) {
      found.push(full);
    }
  }
  return found;
}

/** Every `functionName: '…'` literal in the package, comments excluded. */
function abiMethodNames(): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const file of sourceFiles(SRC)) {
    const text = stripComments(readFileSync(file, 'utf8')); // nosemgrep
    for (const match of text.matchAll(/functionName:\s*'([^']+)'/g)) {
      const rel = file.slice(SRC.length + 1);
      found.set(match[1], [...(found.get(match[1]) ?? []), rel]);
    }
  }

  return found;
}

describe('ABI method names', () => {
  const methods = abiMethodNames();

  it('finds call sites at all, so nothing below passes vacuously', () => {
    expect(methods.size).toBeGreaterThan(20);
  });

  for (const method of COLLIDING_ABI_METHODS) {
    it(`still calls '${method}' on chain`, () => {
      // If this fails after a rename, the rename reached a contract call. The
      // fix is to restore the ABI name, not to update this expectation.
      expect(
        methods.has(method),
        `no contract call named '${method}' remains — a verb rename probably reached one`,
      ).toBe(true);
    });
  }

  /**
   * The full inventory, as a snapshot — with a count per method, not just the
   * set of names.
   *
   * The count is what makes it a real guard. A name list alone misses a rename
   * from one existing method to another existing one: change a single
   * `'deposit'` call site to `'withdraw'` and both names are still present, so
   * the set is unchanged and nothing fails. The counts move, so it fails.
   *
   * The pins above cover the names a v6 rename could plausibly hit; this covers
   * every other contract interaction, so a change shows up in a diff rather than
   * only in a reverted transaction. Update it when an interaction genuinely
   * changes.
   */
  it('calls a stable set of contract methods, the same number of times', () => {
    const inventory = [...methods.entries()]
      .map(([method, files]) => `${method}: ${String(files.length)}`)
      .sort();

    expect(inventory).toMatchSnapshot();
  });
});

describe('route labels', () => {
  const source = readFileSync(join(SRC, 'core/actions/route.ts'), 'utf8');

  for (const label of ROUTE_LABELS) {
    it(`still emits '${label}'`, () => {
      expect(source).toContain(`'${label}'`);
    });
  }

  /**
   * Two of these are assembled rather than written out — `${slug}-to-vault` and
   * `vault-to-${slug}` — so the literal check above cannot see them. This pins
   * the shape those are built from instead.
   */
  it('builds the vault labels from the same slug vocabulary', () => {
    expect(source).toContain('-to-vault');
    expect(source).toContain('vault-to-');
  });
});
