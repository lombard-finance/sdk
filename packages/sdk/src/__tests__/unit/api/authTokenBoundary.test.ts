/**
 * The boundary property for the wallet-JWT seam.
 *
 * Two things are asserted, and the second is the one that matters over time:
 *
 * 1. When `getAuthToken` yields a token, the four endpoints that break the day
 *    the BFF requires one send `Authorization: Bearer <token>`.
 * 2. **No api-function reaches the network except through `utils/http`.** That
 *    is what keeps the header logic in one place. Before this stage there were
 *    16 raw `axios.get`/`axios.post` calls across 15 files and the wrapper had
 *    zero callers, so a token had nowhere to be attached and the fix would have
 *    touched every one of them.
 *
 * The second is a source assertion rather than a runtime one, deliberately: a
 * new api-function that calls axios directly would pass any behavioural test
 * written today, and fail this.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn, isAxiosErrorFn } = vi.hoisted(() => ({
  axiosFn: vi.fn(),
  isAxiosErrorFn: vi.fn(() => false),
}));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: isAxiosErrorFn }));

import { getNetworkFeeSignature } from '../../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature/getUserStakeAndBakeSignature';
import { storeNetworkFeeSignature } from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { ChainId } from '../../../common/chains';

const TOKEN = 'jwt-for-the-boundary';

function authHeader(): string | undefined {
  const cfg = axiosFn.mock.calls.at(-1)?.[0] as
    | { headers?: Record<string, string> }
    | undefined;
  return cfg?.headers?.Authorization;
}

describe('every api-function attaches the token through one place', () => {
  beforeEach(() => {
    axiosFn.mockReset();
    axiosFn.mockResolvedValue({ data: {}, status: 200, headers: {} });
    isAxiosErrorFn.mockReturnValue(false);
  });

  const cases: ReadonlyArray<
    [string, (t?: () => string | undefined) => Promise<unknown>]
  > = [
    [
      'getNetworkFeeSignature',
      (getAuthToken) =>
        getNetworkFeeSignature({
          chainId: ChainId.ethereum,
          address: '0xabc',
          env: Env.prod,
          getAuthToken,
        }),
    ],
    [
      'storeNetworkFeeSignature',
      (getAuthToken) =>
        storeNetworkFeeSignature({
          signature: '0xsig',
          typedData: '{}',
          address: '0xabc',
          env: Env.prod,
          getAuthToken,
        }),
    ],
    [
      'getUserStakeAndBakeSignature',
      (getAuthToken) =>
        getUserStakeAndBakeSignature({
          userDestinationAddress: '0xabc',
          chainId: ChainId.ethereum,
          env: Env.prod,
          getAuthToken,
        }),
    ],
  ];

  it.each(cases)(
    '%s sends Bearer when a token is configured',
    async (_n, call) => {
      await call(() => TOKEN).catch(() => undefined);
      expect(authHeader()).toBe(`Bearer ${TOKEN}`);
    },
  );

  it.each(cases)(
    '%s sends no header when none is configured',
    async (_n, call) => {
      await call(undefined).catch(() => undefined);
      expect(authHeader()).toBeUndefined();
    },
  );
});

/**
 * The rule is about Lombard-bound traffic, not about axios.
 *
 * Scoping the earlier version to `api-functions/` was too narrow: it passed
 * while five files under `metrics/`, `vaults/` and `strategies/` called axios
 * directly against a Lombard host, which is exactly the traffic that needs a
 * token once the gateway enforces one. Scoping it to *all* axios would be too
 * wide — mempool.space, coins.llama.fi and api.veda.tech are third parties and
 * must not receive our token.
 *
 * So the rule is: a file that resolves a Lombard host through `getApiConfig`
 * goes through `utils/http`. That is self-maintaining — a new file inherits it
 * by using the config, and a third-party call is never caught by accident.
 */
describe('nothing Lombard-bound bypasses utils/http', () => {
  const SRC = join(__dirname, '..', '..', '..');
  const SKIP = new Set(['__tests__', 'node_modules', 'dist', 'stories']);

  /** Leaves only code, so a type import or a mention in prose is not a hit. */
  function stripImportsAndComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/^import [\s\S]*?from '[^']*';$/gm, '');
  }

  function tsFilesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      if (SKIP.has(entry)) return [];
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return tsFilesUnder(full);
      return full.endsWith('.ts') && !full.endsWith('.test.ts') ? [full] : [];
    });
  }

  const lombardBound = tsFilesUnder(SRC).filter((f) => {
    const src = readFileSync(f, 'utf8');
    return /getApiConfig\s*\(/.test(src) && !f.endsWith('api-config.ts');
  });

  it('finds the Lombard-bound files, so an empty sweep cannot pass', () => {
    // If this ever drops to zero the rule below is vacuous.
    expect(lombardBound.length).toBeGreaterThan(10);
  });

  it('none of them calls axios directly', () => {
    const offenders = lombardBound
      .filter((f) =>
        // Imports and comments are stripped first: `AxiosError` is a legitimate
        // type import, and prose mentioning axios is not a call.
        /\baxios[.(]/.test(stripImportsAndComments(readFileSync(f, 'utf8'))),
      )
      .map((f) => f.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });
});
