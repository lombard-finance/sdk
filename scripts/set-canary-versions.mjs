#!/usr/bin/env node

// Rewrite X.Y.Z to X.Y.Z-<suffix>.<build> in the CI checkout for a canary publish.
// Usage: set-canary-versions.mjs --suffix <tag> --build <n> -- <package-dir>...
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { PUBLISHABLE } from './publishable-packages.mjs';

const SUFFIX_RE = /^[a-z][a-z0-9-]*$/;
const BUILD_RE = /^[0-9]+$/;
const RELEASE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      suffix: { type: 'string' },
      build: { type: 'string' },
    },
  });

  const { suffix, build } = values;
  if (!suffix || !SUFFIX_RE.test(suffix) || suffix === 'latest') {
    fail(`--suffix must match ${SUFFIX_RE} and must not be 'latest'`);
  }
  if (!build || !BUILD_RE.test(build)) {
    fail(`--build must match ${BUILD_RE}`);
  }
  if (positionals.length === 0) {
    fail('at least one package directory is required');
  }

  const packagesDir = resolve(process.cwd(), 'packages');

  for (const name of positionals) {
    if (!PUBLISHABLE.has(name)) {
      fail(`'${name}' is not a publishable package`);
    }
    const path = resolve(packagesDir, name, 'package.json');
    if (!path.startsWith(packagesDir + sep) || !existsSync(path)) {
      fail(`invalid package path for '${name}'`);
    }

    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    if (!RELEASE_RE.test(pkg.version)) {
      fail(
        `${pkg.name}: version '${pkg.version}' must be a plain X.Y.Z release version`,
      );
    }

    const next = `${pkg.version}-${suffix}.${build}`;
    process.stdout.write(`${pkg.name}: ${pkg.version} -> ${next}\n`);
    pkg.version = next;
    writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  }
}

main();
