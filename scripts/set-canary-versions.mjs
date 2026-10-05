#!/usr/bin/env node

// Rewrite X.Y.Z to X.Y.Z-<suffix>.<build> in the CI checkout for a canary publish.
// Usage: set-canary-versions.mjs --suffix <tag> --build <n> -- <package-dir>...
import process from 'node:process';
import { parseArgs } from 'node:util';

import {
  fail,
  readManifest,
  runCli,
  writeManifest,
} from './publishable-packages.mjs';

const SUFFIX_RE = /^[a-z][a-z0-9-]*$/;
const BUILD_RE = /^[0-9]+$/;
const RELEASE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

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

  for (const name of positionals) {
    const pkg = readManifest(name);
    if (!RELEASE_RE.test(pkg.version)) {
      fail(
        `${pkg.name}: version '${pkg.version}' must be a plain X.Y.Z release version`,
      );
    }

    const next = `${pkg.version}-${suffix}.${build}`;
    process.stdout.write(`${pkg.name}: ${pkg.version} -> ${next}\n`);
    writeManifest(name, { ...pkg, version: next });
  }
}

runCli(main);
