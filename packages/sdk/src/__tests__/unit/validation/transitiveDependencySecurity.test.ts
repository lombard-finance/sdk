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
  const lines = lockfile.split('\n');
  lines.forEach((line, i) => {
    if (line.startsWith(`${name}@`) || line.startsWith(`"${name}@`)) {
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

// Lowest patched release per major line. A locked version on a major that has
// no rule is out of the advisory's range and is accepted.
const PATCHED_FLOORS: Record<string, Record<number, string>> = {
  '@babel/core': { 7: '7.29.1' },
  '@humanfs/node': { 0: '0.16.8' },
  '@vitest/mocker': { 4: '4.1.12' },
  ajv: { 6: '6.14.0', 8: '8.18.0' },
  'bn.js': { 4: '4.12.3', 5: '5.2.3' },
  fflate: { 0: '0.8.3' },
  'fast-uri': { 3: '3.1.9' },
  glob: { 9: '14.0.2', 10: '14.0.2', 11: '14.0.2', 13: '14.0.2', 14: '14.0.2' },
  hono: { 4: '4.13.16' },
  'ip-address': { 10: '10.7.4' },
  pbkdf2: { 3: '3.1.7' },
  qs: { 6: '6.16.1' },
  'react-router': { 7: '7.18.0' },
  'react-router-dom': { 7: '7.18.0' },
  turbo: { 2: '2.9.14' },
  uuid: { 8: '11.1.1', 9: '11.1.1', 10: '11.1.1', 11: '11.1.1' },
  yaml: { 2: '2.8.3' },
};

describe('patched dependency advisories (medium and low severity)', () => {
  for (const [name, floors] of Object.entries(PATCHED_FLOORS)) {
    it(`locks no vulnerable release of ${name}`, () => {
      const versions = lockedVersions(name);
      // An empty list would mean the lookup matched nothing, not that the
      // package is safe.
      expect(versions.length).toBeGreaterThan(0);
      for (const version of versions) {
        const floor = floors[Number(version.split('.')[0])];
        if (floor === undefined) continue;
        expect(atLeast(version, floor), `${name}@${version}`).toBe(true);
      }
    });
  }

  it('locks esbuild outside the affected 0.27.3 - 0.28.0 range', () => {
    const versions = lockedVersions('esbuild');
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      const vulnerable =
        atLeast(version, '0.27.3') && !atLeast(version, '0.28.1');
      expect(vulnerable, `esbuild@${version}`).toBe(false);
    }
  });

  it('keeps the Solana RPC client able to generate request ids with uuid', () => {
    // jayson (pulled in by @solana/web3.js) calls require('uuid').v4().
    const jayson = createRequire(requireFromTest.resolve('jayson'));
    expect(jayson('uuid').v4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('leaves typedoc a minimatch that still exposes matchOne', () => {
    // typedoc 0.26 calls Minimatch#matchOne, which minimatch 11 removed, so
    // the documentation build breaks if its minimatch is forced to 11.
    const fromTypedoc = createRequire(requireFromTest.resolve('typedoc'));
    const { Minimatch } = fromTypedoc('minimatch');
    expect(typeof new Minimatch('src/**').matchOne).toBe('function');
  });

  it('locks minimatch 9 and 10 only as the copy pinned for typedoc', () => {
    // Every other consumer is resolved to minimatch 11. The one exception is
    // the 9.0.9 that typedoc needs, covered by the test above.
    const old = lockedVersions('minimatch').filter((version) =>
      ['9', '10'].includes(version.split('.')[0]),
    );
    expect(old).toEqual(['9.0.9']);
  });

  it('locks no react-router 6 or its @remix-run/router core', () => {
    // The fix for the 6.x advisories is the 7.x line, so 6.x must not return.
    expect(lockedVersions('@remix-run/router')).toEqual([]);
    for (const name of ['react-router', 'react-router-dom']) {
      for (const version of lockedVersions(name)) {
        expect(Number(version.split('.')[0]), `${name}@${version}`).toBe(7);
      }
    }
  });

  it('loads yaml documents', () => {
    const { parse } = requireFromTest('yaml');
    expect(parse('a:\n  - 1\n  - two\n')).toEqual({ a: [1, 'two'] });
  });
});
