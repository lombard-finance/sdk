#!/usr/bin/env node
/**
 * Pre-publish Dependency Check Script
 *
 * Validates that all @lombard.finance internal dependencies are published
 * to npm before allowing a package to be published.
 *
 * This prevents the issue where SDK is published but depends on an
 * unpublished version of sdk-common.
 *
 * Usage: node scripts/check-publish-deps.js <package-name>
 * Example: node scripts/check-publish-deps.js sdk
 */

import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const LOMBARD_SCOPE = '@lombard.finance/';

/**
 * Allowed package names (whitelist for security)
 * These must match the options in publish.yml workflow
 */
const ALLOWED_PACKAGES = [
  'sdk',
  'sdk-common',
  'sdk-solana',
  'sdk-sui',
  'sdk-starknet',
  'sdk-devtools',
  'sdk-agent',
  'sdk-agentkit',
];

/**
 * Validate package name against whitelist to prevent command injection
 */
function validatePackageName(packageName) {
  if (!packageName || typeof packageName !== 'string') {
    return false;
  }
  return ALLOWED_PACKAGES.includes(packageName);
}

/**
 * Get published versions of a package from npm
 * Uses execFileSync with array arguments to prevent command injection
 */
function getPublishedVersions(packageName) {
  try {
    // Using execFileSync with arguments as array prevents shell injection
    const result = execFileSync(
      'npm',
      ['view', packageName, 'versions', '--json'],
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const versions = JSON.parse(result);
    return Array.isArray(versions) ? versions : [versions];
  } catch {
    return [];
  }
}

/**
 * Check if a version satisfies a semver range
 * Simple implementation for common cases
 */
function versionSatisfies(versions, range) {
  // Any published version satisfies this. Peer dependencies publish as `*`.
  if (range === '*') {
    return versions.length > 0;
  }

  // Ranges are resolved by `rangeAsPublished` before they get here, so a
  // `workspace:` prefix at this point means resolution was skipped. Fail closed
  // rather than guess at what would ship.
  if (range.startsWith('workspace:')) {
    return false;
  }

  // Remove ^ or ~ prefix
  const cleanRange = range.replace(/^[\^~]/, '');
  const [major, minor, patch] = cleanRange.split('.').map(Number);

  return versions.some((v) => {
    const [vMajor, vMinor, vPatch] = v.split('.').map(Number);

    if (range.startsWith('^')) {
      // ^x.y.z means >=x.y.z and <(x+1).0.0
      return (
        vMajor === major &&
        (vMinor > minor || (vMinor === minor && vPatch >= patch))
      );
    } else if (range.startsWith('~')) {
      // ~x.y.z means >=x.y.z and <x.(y+1).0
      return vMajor === major && vMinor === minor && vPatch >= patch;
    } else {
      // Exact match
      return v === cleanRange;
    }
  });
}

/**
 * Versions of every `@lombard.finance/*` package in this monorepo.
 *
 * The publish workflow reads exactly this to rewrite `workspace:` ranges, so
 * the check has to read it too or the two disagree about what is shipping.
 */
function readLocalPackageVersions(packagesDir) {
  const versions = {};
  for (const dir of readdirSync(packagesDir)) {
    const manifest = join(packagesDir, dir, 'package.json');
    if (!existsSync(manifest)) continue;
    try {
      const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
      if (pkg.name?.startsWith(LOMBARD_SCOPE)) versions[pkg.name] = pkg.version;
    } catch {
      // A manifest we cannot parse is not one we can publish against.
    }
  }
  return versions;
}

/**
 * The range that will actually be published for a dependency.
 *
 * `workspace:` is a Yarn protocol that npm does not understand, so the publish
 * workflow rewrites it before shipping. It does so without reading what follows
 * the colon: a regular dependency becomes the dependency's exact version from
 * this monorepo, and a peer dependency becomes `*` for the consumer to satisfy.
 * This has to resolve identically, or the check validates something other than
 * what ships.
 */
function rangeAsPublished(depName, range, depType, localVersions) {
  if (!range.startsWith('workspace:')) return range;
  if (depType === 'peerDependencies') return '*';
  return localVersions[depName] ?? '*';
}

/**
 * Main function
 */
async function main() {
  const packageName = process.argv[2];

  if (!packageName) {
    console.error(
      '❌ Usage: node scripts/check-publish-deps.js <package-name>',
    );
    console.error('   Example: node scripts/check-publish-deps.js sdk');
    process.exit(1);
  }

  // Validate package name against whitelist to prevent path traversal/injection
  if (!validatePackageName(packageName)) {
    console.error(`❌ Invalid package name: ${packageName}`);
    console.error(`   Allowed packages: ${ALLOWED_PACKAGES.join(', ')}`);
    process.exit(1);
  }

  // Construct and validate path using validated package name
  const packagesDir = resolve(process.cwd(), 'packages');
  const packagePath = resolve(packagesDir, packageName, 'package.json');

  // Defense-in-depth: verify resolved path stays within the packages directory
  if (!packagePath.startsWith(packagesDir + '/')) {
    console.error('❌ Invalid package path: path traversal detected');
    process.exit(1);
  }

  // Verify path exists before reading (path is validated against ALLOWED_PACKAGES whitelist above)
  // nosemgrep: javascript.lang.security.detect-non-literal-fs-filename.detect-non-literal-fs-filename
  if (!existsSync(packagePath)) {
    console.error(`❌ Could not find package.json at ${packagePath}`);
    process.exit(1);
  }

  let packageJson;
  try {
    // nosemgrep: javascript.lang.security.detect-non-literal-fs-filename.detect-non-literal-fs-filename
    const contents = readFileSync(packagePath, 'utf-8');
    packageJson = JSON.parse(contents);
  } catch {
    console.error(`❌ Could not parse package.json at ${packagePath}`);
    process.exit(1);
  }

  console.log(
    `\n📦 Checking publish dependencies for ${packageJson.name}@${packageJson.version}\n`,
  );

  // Kept per type rather than merged: the publish workflow resolves a
  // `workspace:` range differently for each, and merging also drops one entry
  // when a package appears in both.
  const lombardDeps = [];
  for (const depType of ['dependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(packageJson[depType] ?? {})) {
      if (name.startsWith(LOMBARD_SCOPE)) {
        lombardDeps.push({ name, range, depType });
      }
    }
  }

  if (lombardDeps.length === 0) {
    console.log('✅ No internal @lombard.finance dependencies found.\n');
    process.exit(0);
  }

  console.log(`Found ${lombardDeps.length} internal dependencies to check:\n`);

  let hasErrors = false;

  const localVersions = readLocalPackageVersions(packagesDir);

  for (const { name: depName, range: declaredRange, depType } of lombardDeps) {
    // What ships, not what the manifest says.
    const depRange = rangeAsPublished(
      depName,
      declaredRange,
      depType,
      localVersions,
    );
    const shown =
      depRange === declaredRange
        ? `${depName}@${depRange}`
        : `${depName}@${depRange} (from ${declaredRange}, ${depType})`;
    process.stdout.write(`  Checking ${shown}... `);

    const publishedVersions = getPublishedVersions(depName);

    if (publishedVersions.length === 0) {
      console.log('❌ NOT PUBLISHED');
      hasErrors = true;
      continue;
    }

    const latestVersion = publishedVersions[publishedVersions.length - 1];

    if (versionSatisfies(publishedVersions, depRange)) {
      console.log(`✅ OK (latest: ${latestVersion})`);
    } else {
      console.log(`❌ MISSING VERSION`);
      console.log(`     Required: ${depRange}`);
      if (depRange !== declaredRange) {
        console.log(
          `     Publish ${depName}@${depRange} first — the workflow resolves`,
        );
        console.log(`     ${declaredRange} to that exact version on publish.`);
      }
      console.log(`     Available: ${publishedVersions.join(', ')}`);
      hasErrors = true;
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('❌ Pre-publish check FAILED!');
    console.error('');
    console.error('   Some internal dependencies are not published to npm.');
    console.error('   Please publish them first using the publish workflow:');
    console.error(
      '   https://github.com/lombard-finance/sdk/actions/workflows/publish.yml',
    );
    console.error('');
    process.exit(1);
  }

  console.log('✅ All internal dependencies are published. Safe to proceed.\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});
