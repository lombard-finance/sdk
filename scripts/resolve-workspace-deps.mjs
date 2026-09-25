#!/usr/bin/env node

// npm cannot read Yarn `workspace:` ranges, so rewrite them to sibling versions
// before `npm publish`. Usage: resolve-workspace-deps.mjs -- <package-dir>...
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { PUBLISHABLE, SCOPE } from './publishable-packages.mjs';

const DEP_TYPES = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function manifestPath(packagesDir, name) {
  if (!PUBLISHABLE.has(name)) {
    fail(`'${name}' is not a publishable package`);
  }
  const path = resolve(packagesDir, name, 'package.json');
  if (!path.startsWith(packagesDir + sep)) {
    fail(`path for '${name}' escapes the packages directory`);
  }
  if (!existsSync(path)) {
    fail(`missing ${path}`);
  }
  return path;
}

function collectSiblingVersions(packagesDir) {
  const versions = new Map();
  for (const dir of readdirSync(packagesDir)) {
    const path = join(packagesDir, dir, 'package.json');
    if (!existsSync(path)) continue;
    const pkg = readJson(path);
    if (typeof pkg.name === 'string' && pkg.name.startsWith(SCOPE)) {
      versions.set(pkg.name, pkg.version);
    }
  }
  return versions;
}

function resolveRange(depType, name, range, versions) {
  const spec = range.slice('workspace:'.length);
  if (depType === 'peerDependencies') return '*';

  const version = versions.get(name);
  if (spec === '*' || spec === '^' || spec === '~') {
    if (!version) fail(`no workspace package provides '${name}'`);
    return spec === '*' ? version : `${spec}${version}`;
  }
  if (spec === '') fail(`empty workspace range for '${name}'`);
  return spec;
}

function main() {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  if (positionals.length === 0) {
    fail('usage: resolve-workspace-deps.mjs -- <package-dir>...');
  }

  const packagesDir = resolve(process.cwd(), 'packages');
  const versions = collectSiblingVersions(packagesDir);

  for (const name of positionals) {
    const path = manifestPath(packagesDir, name);
    const pkg = readJson(path);
    let modified = false;

    for (const depType of DEP_TYPES) {
      const deps = pkg[depType];
      if (!deps) continue;
      for (const [dep, range] of Object.entries(deps)) {
        if (typeof range !== 'string' || !range.startsWith('workspace:')) {
          continue;
        }
        const resolved = resolveRange(depType, dep, range, versions);
        deps[dep] = resolved;
        modified = true;
        process.stdout.write(
          `${name}: ${dep} (${depType}) ${range} -> ${resolved}\n`,
        );
      }
    }

    const serialized = JSON.stringify(pkg, null, 2) + '\n';
    if (serialized.includes('"workspace:')) {
      fail(`${name}: a workspace: range is still present after resolution`);
    }
    if (modified) writeFileSync(path, serialized);
  }
}

main();
