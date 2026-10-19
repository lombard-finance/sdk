import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';

// Publishable packages in dependency order. Keep in sync with the `package`
// input in .github/workflows/publish.yml and scripts/check-publish-deps.js.
export const PUBLISH_ORDER = [
  'sdk-common',
  'sdk',
  'sdk-solana',
  'sdk-sui',
  'sdk-starknet',
  'sdk-devtools',
  'sdk-agent',
  'sdk-agentkit',
  'sdk-react',
];

export const PUBLISHABLE = new Set(PUBLISH_ORDER);

export const SCOPE = '@lombard.finance/';

export function fail(message) {
  throw new Error(message);
}

export function runCli(main) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exit(1);
  }
}

function manifestPath(name) {
  if (!PUBLISHABLE.has(name)) {
    fail(`'${name}' is not a publishable package`);
  }
  const packagesDir = resolve(process.cwd(), 'packages');
  const path = resolve(packagesDir, name, 'package.json');
  if (!path.startsWith(packagesDir + sep)) {
    fail(`path for '${name}' escapes the packages directory`);
  }
  return path;
}

export function readManifest(name) {
  const path = manifestPath(name);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- manifestPath() allows only PUBLISHABLE names under packages/
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  if (pkg.name !== `${SCOPE}${name}`) {
    fail(`packages/${name}/package.json is named '${pkg.name}'`);
  }
  return pkg;
}

export function writeManifest(name, pkg) {
  const path = manifestPath(name);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- manifestPath() allows only PUBLISHABLE names under packages/
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}
