import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const requireFromTest = createRequire(import.meta.url);
const lockfile = readFileSync(
  join(__dirname, '../../../../../../yarn.lock'),
  'utf8',
);

function lockedVersions(name: string): string[] {
  const versions: string[] = [];
  const header = new RegExp(`^"?${name}@`);
  const lines = lockfile.split('\n');
  lines.forEach((line, i) => {
    if (header.test(line)) {
      const match = /^ {2}version: (.+)$/.exec(lines[i + 1] ?? '');
      if (match) versions.push(match[1]);
    }
  });
  return versions;
}

function atLeast(version: string, minimum: string): boolean {
  const a = version.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

describe('patched transitive dependencies', () => {
  it('locks only patched versions of toml (>= 5.0.1)', () => {
    const versions = lockedVersions('toml');
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      expect(atLeast(version, '5.0.1'), `toml@${version}`).toBe(true);
    }
  });

  it('locks no decode-uri-component older than 0.5.1', () => {
    for (const version of lockedVersions('decode-uri-component')) {
      expect(atLeast(version, '0.5.1'), `decode-uri-component@${version}`).toBe(
        true,
      );
    }
  });

  it('parses TOML the way the Anchor workspace loader does', () => {
    const toml = requireFromTest('toml');
    const parsed = toml.parse(
      '[programs.localnet]\nlombard = "11111111111111111111111111111111"\n',
    );
    expect(parsed.programs.localnet.lombard).toBe(
      '11111111111111111111111111111111',
    );
  });

  it('does not let a TOML document write to Object.prototype', () => {
    const toml = requireFromTest('toml');
    try {
      toml.parse('[__proto__]\npolluted = true\n');
    } catch {
      // rejecting the document is also acceptable
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('loads the WalletConnect provider that wagmi connectors depend on', async () => {
    const provider = await import('@walletconnect/ethereum-provider');
    expect(typeof provider.EthereumProvider.init).toBe('function');
  });
});
