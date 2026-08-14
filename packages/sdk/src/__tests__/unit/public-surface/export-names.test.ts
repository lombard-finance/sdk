/**
 * Public export-name snapshot.
 *
 * The package's public surface is exactly the 13 subpaths in package.json's
 * `exports` map — `.` plus `src/entries/*.ts`. Nothing else is reachable by an
 * `exports`-aware resolver, so this file is the whole contract.
 *
 * Why static parsing rather than importing the modules: roughly 40% of the
 * surface is type-only, and `Object.keys(await import(...))` cannot see a type.
 * Parsing the source sees both, needs no build step, and therefore runs in the
 * plain unit tier.
 *
 * When a snapshot fails, read the diff before updating it. An unintended
 * addition or removal here is a public API change.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');
const ENTRIES_DIR = join(SRC, 'entries');

/**
 * Collect exported names from a module's source.
 *
 * Handles the three forms this codebase uses:
 *   export { a, b as c } from '...'      // re-export lists, incl. multi-line
 *   export type { X } from '...'
 *   export const / function / class / interface / type / enum X
 *
 * `export *` is deliberately unsupported: it would make the surface
 * non-enumerable without resolving the target. Verified absent from every
 * entry point, and the assertion below keeps it that way.
 */
function collectExports(source: string): string[] {
  const names = new Set<string>();

  // Braced export lists, including `export type { ... }` and multi-line bodies.
  const braced = source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g);
  for (const match of braced) {
    for (const raw of match[1].split(',')) {
      const part = raw
        .replace(/\/\/.*$/gm, '')
        .replace(/\btype\b/g, '')
        .trim();
      if (!part) continue;
      // `X as Y` exports Y; a bare `X` exports X.
      const asMatch = part.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      const name = asMatch ? asMatch[1] : part;
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  // Direct declarations.
  const declared = source.matchAll(
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  );
  for (const match of declared) names.add(match[1]);

  return [...names].sort();
}

function readModule(path: string): string {
  return readFileSync(path, 'utf8');
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
