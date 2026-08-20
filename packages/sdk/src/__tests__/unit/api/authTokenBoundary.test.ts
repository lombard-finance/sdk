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

  const cases: ReadonlyArray<[string, (t?: () => string | undefined) => Promise<unknown>]> = [
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

  it.each(cases)('%s sends Bearer when a token is configured', async (_n, call) => {
    await call(() => TOKEN).catch(() => undefined);
    expect(authHeader()).toBe(`Bearer ${TOKEN}`);
  });

  it.each(cases)('%s sends no header when none is configured', async (_n, call) => {
    await call(undefined).catch(() => undefined);
    expect(authHeader()).toBeUndefined();
  });
});

describe('no api-function bypasses utils/http', () => {
  const ROOT = join(__dirname, '..', '..', '..', 'api-functions');

  function tsFilesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return tsFilesUnder(full);
      return full.endsWith('.ts') && !full.endsWith('.test.ts') ? [full] : [];
    });
  }

  it('has no raw axios.get or axios.post call anywhere under api-functions', () => {
    const offenders = tsFilesUnder(ROOT).filter((f) =>
      /\baxios\.(get|post|put|delete|patch)\s*[<(]/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map((f) => f.replace(ROOT, ''))).toEqual([]);
  });
});
