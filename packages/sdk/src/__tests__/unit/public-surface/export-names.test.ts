/**
 * Public export-name snapshot.
 *
 * The package's public surface is exactly the 13 subpaths in package.json's
 * `exports` map — `.` plus `src/entries/*.ts`. Nothing else is reachable by an
 * `exports`-aware resolver, so this file is the whole contract.
 *
 * Name collection lives in `helpers/collectExports` — shared with the
 * contract-reachability check, because a parsing bug in a private copy is a
 * silent hole in a snapshot: a name the parser drops is indistinguishable from
 * a name that was never exported.
 *
 * When a snapshot fails, read the diff before updating it. An unintended
 * addition or removal here is a public API change.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectExports } from '../../helpers/collectExports';

const SRC = join(__dirname, '../../..');
const ENTRIES_DIR = join(SRC, 'entries');

// These tests assert on the package's own source: they walk `src` and read
// what they find, so the path is discovered rather than written down. That is
// the property being checked — a literal path could only ever cover the files
// someone remembered to list, which is the gap these suites exist to close.
// No input reaches them from outside the repository.
function readModule(path: string): string {
  return readFileSync(path, 'utf8'); // nosemgrep
}

const entryFiles = readdirSync(ENTRIES_DIR)
  .filter((f) => f.endsWith('.ts'))
  .sort();

describe('public export surface', () => {
  it('has no `export *` in any public entry point', () => {
    // A star export makes the surface un-enumerable, which would silently
    // defeat every snapshot below.
    const offenders = ['index.ts', ...entryFiles.map((f) => `entries/${f}`)]
      .filter((rel) => /^export\s+\*/m.test(readModule(join(SRC, rel))))
      .sort();

    expect(offenders).toEqual([]);
  });

  it('root entry (.) exports a stable set of names', () => {
    expect(collectExports(readModule(join(SRC, 'index.ts')))).toMatchSnapshot();
  });

  for (const file of entryFiles) {
    it(`entry ./${file.replace(/\.ts$/, '')} exports a stable set of names`, () => {
      expect(
        collectExports(readModule(join(ENTRIES_DIR, file))),
      ).toMatchSnapshot();
    });
  }

  it('every exports-map subpath has a matching entry file', () => {
    const pkg = JSON.parse(readModule(join(SRC, '..', 'package.json'))) as {
      exports: Record<string, unknown>;
    };

    const subpaths = Object.keys(pkg.exports)
      .filter((k) => k !== '.' && k !== './package.json')
      .map((k) => k.replace(/^\.\//, ''))
      .sort();

    const entryNames = entryFiles.map((f) => f.replace(/\.ts$/, '')).sort();

    expect(subpaths).toEqual(entryNames);
  });
});
