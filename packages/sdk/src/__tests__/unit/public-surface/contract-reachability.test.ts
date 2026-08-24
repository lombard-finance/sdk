/**
 * The public contract has to be reachable from a public entry point
 *
 * A module can be written, typed, tested and built, and still be invisible to
 * every consumer: nothing outside `src/index.ts` and `src/entries/*.ts` is
 * resolvable through the `exports` map. The whole v6 action contract shipped in
 * exactly that state — complete, green, and unreachable — and it was found by
 * linking the package into an app, not by any test here.
 *
 * The export-name snapshot next door cannot catch it. A snapshot records the
 * names that *are* exported, so a name that was never exported is simply absent
 * from both the old and the new snapshot and the diff is empty. Detecting the
 * omission needs the other direction: start from the modules that are meant to
 * be public and check each one's names arrive somewhere a consumer can import
 * from.
 *
 * Adding a module here is the declaration that it is public API.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectExports } from '../../helpers/collectExports';

const SRC = join(__dirname, '../../..');
const ENTRIES_DIR = join(SRC, 'entries');

/**
 * Source modules whose exported names must be reachable from a public entry.
 *
 * These are the v6 contract and the auth seam — the parts a consumer is
 * expected to name in their own types. Internal helpers stay off this list on
 * purpose; the point is not that everything is exported, but that everything
 * *declared public* is.
 */
const PUBLIC_CONTRACT_MODULES = [
  'core/actions/steps.ts',
  'core/actions/status.ts',
  'core/actions/params.ts',
  'core/actions/route.ts',
  'core/actions/interfaces.ts',
  'common/wallet-auth-chain.ts',
] as const;

/**
 * No exemption list, and two reasons it is not needed.
 *
 * The standing type assertion in `steps.ts` is a bare `const`, never exported,
 * so it is not a name this check can ask about. And `EvmDeployStatus` — the one
 * contract member deliberately withheld from the entry points, because v5
 * already exports that name as an alias of a wider type — is reachable anyway
 * *as a name*, since the v5 alias occupies it.
 *
 * That second case is the limit of a name-based check: it can prove a name is
 * importable, not that it resolves to the declaration in this module. Here the
 * collision is the intent, so the limit costs nothing; a future rename that
 * shadows a contract member with an unrelated export of the same name would
 * pass. The v5-conformance suite is what pins meaning.
 */

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

/** Every name reachable through any public entry point. */
function reachableNames(): Set<string> {
  const entries = [
    'index.ts',
    ...readdirSync(ENTRIES_DIR)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => `entries/${f}`),
  ];

  const names = new Set<string>();
  for (const entry of entries) {
    for (const name of collectExports(read(entry))) names.add(name);
  }
  return names;
}

describe('public contract reachability', () => {
  const reachable = reachableNames();

  for (const module of PUBLIC_CONTRACT_MODULES) {
    it(`${module} is fully reachable from a public entry`, () => {
      const unreachable = collectExports(read(module)).filter(
        (name) => !reachable.has(name),
      );

      expect(
        unreachable,
        `declared public but importable from nowhere: ${unreachable.join(', ')}`,
      ).toEqual([]);
    });
  }

  // Guards the guard. If the parse silently stopped matching, every module
  // above would pass with an empty name list and prove nothing.
  it('actually parsed some names out of each module', () => {
    const counts = PUBLIC_CONTRACT_MODULES.map((m) => [
      m,
      collectExports(read(m)).length,
    ] as const);

    for (const [module, count] of counts) {
      expect(count, `${module} parsed as exporting nothing`).toBeGreaterThan(0);
    }
  });

});
