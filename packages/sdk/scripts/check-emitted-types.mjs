#!/usr/bin/env node
/**
 * The emitted declarations must resolve on their own.
 *
 * A consumer type-checks against `dist`, not `src`, and the two can disagree.
 * They did: the Vite build writes one bundle per export subpath as
 * `dist/<name>.js`, while `tsc` wrote the declaration tree into the same
 * directory — so `dist/core.js` sat next to `dist/core/index.d.ts`, and every
 * internal `from '../../core'` in a `.d.ts` resolved to the JavaScript file
 * instead of the declaration directory. TypeScript found no types for it and
 * fell back to `any`.
 *
 * Nothing caught that, because the failure is silent by construction. Every
 * consumer sets `skipLibCheck: true` — it is the default in the Vite, Next and
 * CRA templates — which suppresses exactly these errors and leaves the affected
 * types as `any`. So `tsc` passed in the SDK, passed in the app, and the app
 * silently lost the types for a large part of the surface. What surfaced
 * instead was overload resolution quietly picking the wrong signature.
 *
 * This checks the one thing a consumer cannot: that the shipped declarations
 * resolve with `skipLibCheck` off. It reports the count and a sample rather than
 * the whole list, which for a broken tree runs to hundreds of near-identical
 * lines.
 *
 * Usage: node scripts/check-emitted-types.mjs [entry]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PKG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

/** How many failing lines to print before summarising. */
const SAMPLE_SIZE = 10;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/**
 * Every declaration entry named by the `exports` map.
 *
 * Checking only the root entry would miss a subpath whose own declaration tree
 * is broken, and the subpaths are the part consumers reach for when they want
 * to avoid pulling the whole SDK.
 */
function declarationEntries() {
  const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
  const entries = new Set();

  for (const entry of Object.values(pkg.exports ?? {})) {
    if (entry && typeof entry === 'object' && typeof entry.types === 'string') {
      entries.add(entry.types.replace(/^\.\//, ''));
    }
  }

  return [...entries].sort();
}

const requested = process.argv[2];
const entries = requested ? [requested] : declarationEntries();

if (entries.length === 0) {
  fail('No declaration entries found in the exports map. Nothing was checked.');
}

const missing = entries.filter((entry) => !existsSync(join(PKG_ROOT, entry)));

if (missing.length > 0) {
  fail(
    `Declaration entries named by the exports map do not exist. Run the build first.\n  ${missing.join('\n  ')}`,
  );
}

let output = '';

try {
  execFileSync(
    'npx',
    [
      'tsc',
      '--noEmit',
      // The whole point: a consumer's skipLibCheck hides these, so it is off.
      '--skipLibCheck',
      'false',
      '--strict',
      // Matches how a modern bundler-based consumer resolves the package.
      '--moduleResolution',
      'bundler',
      '--module',
      'esnext',
      '--target',
      'es2022',
      ...entries,
    ],
    { cwd: PKG_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}

const errors = output
  .split('\n')
  .filter((line) => / error TS\d+:/.test(line));

if (errors.length === 0) {
  console.log(
    `✓ ${String(entries.length)} declaration entries resolve with skipLibCheck off`,
  );
  process.exit(0);
}

console.error(
  `✗ ${String(errors.length)} unresolved reference(s) in the emitted declarations.\n`,
);
console.error(errors.slice(0, SAMPLE_SIZE).join('\n'));

if (errors.length > SAMPLE_SIZE) {
  console.error(`\n… and ${String(errors.length - SAMPLE_SIZE)} more.`);
}

console.error(
  [
    '',
    'A consumer sees these as `any`, not as errors: skipLibCheck is on by',
    'default in every common template, so it suppresses them and degrades the',
    'affected types silently.',
    '',
    'The usual cause is a build artifact shadowing a declaration directory —',
    'a bundle written to dist/<name>.js beside a declaration tree at',
    'dist/<name>/. Declarations are emitted to dist/types for that reason;',
    'check that tsconfig.build.json still points there and that the exports',
    'map agrees.',
  ].join('\n'),
);

process.exit(1);
