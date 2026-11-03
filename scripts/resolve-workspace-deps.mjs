#!/usr/bin/env node

// npm cannot read Yarn `workspace:` ranges, so rewrite them to sibling versions
// before `npm publish`. Usage: resolve-workspace-deps.mjs -- <package-dir>...
import process from 'node:process';
import { parseArgs } from 'node:util';

import {
  fail,
  PUBLISH_ORDER,
  readManifest,
  runCli,
  writeManifest,
} from './publishable-packages.mjs';

const DEP_TYPES = new Set([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]);

function collectSiblingVersions() {
  return new Map(
    PUBLISH_ORDER.map((name) => {
      const pkg = readManifest(name);
      return [pkg.name, pkg.version];
    }),
  );
}

function resolveRange(depType, dep, range, versions) {
  const spec = range.slice('workspace:'.length);
  const version = versions.get(dep);
  if (!version) fail(`no workspace package provides '${dep}'`);

  if (spec === '*' || spec === '^' || spec === '~') {
    if (depType === 'peerDependencies') {
      return spec === '~' ? `~${version}` : `^${version}`;
    }
    return spec === '*' ? version : `${spec}${version}`;
  }
  if (spec === '') fail(`empty workspace range for '${dep}'`);
  return spec;
}

function resolveDeps(name, depType, deps, versions) {
  return Object.fromEntries(
    Object.entries(deps).map(([dep, range]) => {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) {
        return [dep, range];
      }
      const resolved = resolveRange(depType, dep, range, versions);
      process.stdout.write(
        `${name}: ${dep} (${depType}) ${range} -> ${resolved}\n`,
      );
      return [dep, resolved];
    }),
  );
}

function main() {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  if (positionals.length === 0) {
    fail('usage: resolve-workspace-deps.mjs -- <package-dir>...');
  }

  const versions = collectSiblingVersions();

  for (const name of positionals) {
    const pkg = readManifest(name);
    const next = Object.fromEntries(
      Object.entries(pkg).map(([key, value]) =>
        DEP_TYPES.has(key) && value && typeof value === 'object'
          ? [key, resolveDeps(name, key, value, versions)]
          : [key, value],
      ),
    );

    const serialized = JSON.stringify(next);
    if (serialized.includes('"workspace:')) {
      fail(`${name}: a workspace: range is still present after resolution`);
    }
    if (serialized !== JSON.stringify(pkg)) writeManifest(name, next);
  }
}

runCli(main);
