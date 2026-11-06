/**
 * Which route the fee-approval and permit functions take, for all four.
 *
 * The v2 routes are scoped to the address in their path and answer 403 to a
 * token for any other wallet, so v2 is taken only with a token for that
 * address; with none, or with a token for another wallet, the v1 claimer
 * routes are. That is decided before sending. Once a v2 request is out, its
 * failures are the caller's: none of them is answered from v1 instead.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn } = vi.hoisted(() => ({ axiosFn: vi.fn() }));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { getNetworkFeeSignature } from '../../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature/getUserStakeAndBakeSignature';
import { storeNetworkFeeSignature } from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { storeStakeAndBakeSignature } from '../../../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';
import { ChainId } from '../../../common/chains';
import { AuthErrorCode, isLombardError } from '../../../shared/errors';

const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

/** A wallet-auth JWT for `sub`. The signature is never checked client side. */
function walletJwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'ES256', typ: 'JWT' })}.${part(payload)}.c2ln`;
}

const OWN_TOKEN = walletJwt({ sub: ACCOUNT.toLowerCase(), exp: 1893456000 });
const OTHER_TOKEN = walletJwt({ sub: OTHER.toLowerCase(), exp: 1893456000 });

type Call = (auth: LombardAuth) => Promise<unknown>;

const feeApproval = JSON.stringify({
  domain: {
    chainId: 11155111,
    verifyingContract: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  },
  primaryType: 'feeApproval',
  message: { chainId: 11155111, fee: '1000', expiry: 1760000000 },
});

const permit = JSON.stringify({
  primaryType: 'Permit',
  message: {
    owner: ACCOUNT,
    spender: '0x77ed6a84fef665156e81247ecbd43a847b8a6398',
    value: '100000',
    nonce: '0',
    deadline: '1893456000',
  },
});

const functions: [name: string, call: Call, v2Path: string, v1Path: string][] =
  [
    [
      'getNetworkFeeSignature',
      (auth) =>
        getNetworkFeeSignature({
          address: ACCOUNT,
          chainId: ChainId.sepolia,
          env: Env.stage,
          auth,
        }),
      `/v2/mint-with-fee/fee-approvals/${ACCOUNT}`,
      '/api/v1/claimer/get-user-signature',
    ],
    [
      'storeNetworkFeeSignature',
      (auth) =>
        storeNetworkFeeSignature({
          signature: '0xsig',
          typedData: feeApproval,
          address: ACCOUNT,
          env: Env.stage,
          auth,
        }),
      `/v2/mint-with-fee/fee-approvals/${ACCOUNT}`,
      '/api/v1/claimer/save-user-signature',
    ],
    [
      'getUserStakeAndBakeSignature',
      (auth) =>
        getUserStakeAndBakeSignature({
          userDestinationAddress: ACCOUNT,
          chainId: ChainId.sepolia,
          env: Env.stage,
          auth,
        }),
      `/v2/stake-and-bake/permits/unused/${ACCOUNT}`,
      '/api/v1/claimer/get-user-stake-and-bake-signature',
    ],
    [
      'storeStakeAndBakeSignature',
      (auth) =>
        storeStakeAndBakeSignature({
          signature: '0xsig',
          typedData: permit,
          env: Env.stage,
          auth,
        }),
      `/v2/stake-and-bake/permits/${ACCOUNT}`,
      '/api/v1/claimer/save-stake-and-bake-signature',
    ],
  ];

function requestedUrls(): string[] {
  return axiosFn.mock.calls.map(([config]) => (config as { url: string }).url);
}

function requestAt(index: number) {
  return axiosFn.mock.calls[index]?.[0] as {
    url: string;
    headers: Record<string, string>;
  };
}

/** No request went to a v1 claimer route. */
function expectNoV1(): void {
  for (const url of requestedUrls()) {
    expect(url).not.toContain('/api/v1/');
    expect(url).not.toContain('claimer');
  }
}

/** An axios rejection carrying a gateway status and body. */
function gatewayError(status: number, code: number, message: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { code, message, details: [] } },
  });
}

beforeEach(() => {
  axiosFn.mockResolvedValue({
    data: { status: 'success' },
    status: 200,
    headers: {},
  });
});
afterEach(() => vi.resetAllMocks());

describe.each(functions)('%s', (_name, call, v2Path, v1Path) => {
  describe('route selection', () => {
    it('takes v2 with a token for the address', async () => {
      await call({ getToken: async () => OWN_TOKEN });

      expect(requestedUrls()).toHaveLength(1);
      expect(requestAt(0).url).toContain(v2Path);
      expect(requestAt(0).headers.Authorization).toBe(`Bearer ${OWN_TOKEN}`);
    });

    // The path carries the checksummed spelling; the token, lower case.
    it('takes v2 with a token for the address spelled in another case', async () => {
      const upper = walletJwt({ sub: `0x${ACCOUNT.slice(2).toUpperCase()}` });

      await call({ getToken: async () => upper });

      expect(requestAt(0).url).toContain(v2Path);
    });

    // A host signed in as one wallet acting for a recipient that is not it,
    // or holding a token from before a wallet switch. v2 would answer 403.
    it('takes v1 with a token for another wallet, sending it nowhere', async () => {
      await call({ getToken: async () => OTHER_TOKEN });

      expect(requestedUrls()).toHaveLength(1);
      expect(requestAt(0).url).toContain(v1Path);
      expect(requestAt(0).headers.Authorization).toBeUndefined();
    });

    it('takes v1 with no token', async () => {
      await call({ getToken: async () => undefined });

      expect(requestAt(0).url).toContain(v1Path);
    });

    // Whose token it is cannot be read, so the route decides.
    it.each([
      ['an opaque token', 'wallet-jwt'],
      ['a JWT with no sub', walletJwt({ exp: 1893456000 })],
      [
        'a JWT whose payload is not JSON',
        'eyJhbGciOiJFUzI1NiJ9.bm90IGpzb24.c2ln',
      ],
    ])('takes v2 with %s', async (_label, token) => {
      await call({ getToken: async () => token });

      expect(requestAt(0).url).toContain(v2Path);
    });
  });

  describe('asking the host for the token', () => {
    it('asks once for a call that succeeds', async () => {
      const getToken = vi.fn(async () => OWN_TOKEN);

      await call({ getToken });

      expect(getToken).toHaveBeenCalledTimes(1);
    });

    // The retry after a 401 is the one place a second token is wanted: the
    // host may have a fresher one than the one it handed over first.
    it('asks the host again for the retry after a 401', async () => {
      const fresh = walletJwt({ sub: ACCOUNT, exp: 1893457000 });
      const getToken = vi
        .fn<() => Promise<string | undefined>>()
        .mockResolvedValueOnce(OWN_TOKEN)
        .mockResolvedValueOnce(fresh);
      axiosFn
        .mockRejectedValueOnce(gatewayError(401, 16, 'token expired'))
        .mockResolvedValueOnce({
          data: { status: 'success' },
          status: 200,
          headers: {},
        });

      await call({ getToken });

      expect(getToken).toHaveBeenCalledTimes(2);
      expect(requestAt(1).url).toContain(v2Path);
      expect(requestAt(1).headers.Authorization).toBe(`Bearer ${fresh}`);
    });

    it('still reports a session that is gone to the host', async () => {
      const onUnauthorized = vi.fn();
      axiosFn.mockRejectedValue(gatewayError(401, 16, 'token revoked'));

      await expect(
        call({ getToken: async () => OWN_TOKEN, onUnauthorized }),
      ).rejects.toMatchObject({ code: AuthErrorCode.UNAUTHORIZED });

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expectNoV1();
    });
  });

  // Each of these is the v2 route's answer, not a reason to ask v1 instead:
  // a 403 is a token the route will not take, a 404 a route this gateway does
  // not serve, a 500 a failure v1 would only paper over.
  describe('v2 failures do not fall back', () => {
    it.each([
      [403, 7, 'unauthorized to access the requested address'],
      [404, 5, 'Not Found'],
      [500, 13, 'internal error'],
    ])('on %i', async (status, code, message) => {
      axiosFn.mockRejectedValue(gatewayError(status, code, message));

      await expect(call({ getToken: async () => OWN_TOKEN })).rejects.toThrow();

      expect(requestedUrls()).toHaveLength(1);
      expect(requestAt(0).url).toContain(v2Path);
      expectNoV1();
    });
  });
});

// The deprecated reader has no retry and no `onUnauthorized`, so a refused
// token reaches the caller as the transport's failure rather than as
// `AuthErrorCode.UNAUTHORIZED`. It still does not fall back.
describe('with the deprecated getAuthToken, a refused token', () => {
  it('is a plain error, and v1 is not asked', async () => {
    axiosFn.mockRejectedValue(gatewayError(401, 16, 'token expired'));

    const error = await getNetworkFeeSignature({
      address: ACCOUNT,
      chainId: ChainId.sepolia,
      env: Env.stage,
      getAuthToken: () => OWN_TOKEN,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(isLombardError(error)).toBe(false);
    expectNoV1();
  });
});

describe('storeStakeAndBakeSignature without a known owner', () => {
  // The v2 route is addressed by the owner. Without one there is no address
  // to ask the host for a token for, and v1 reads the owner from the typed
  // data itself.
  it.each([
    ['not JSON', 'not json'],
    ['without an owner', JSON.stringify({ message: { value: '1' } })],
  ])(
    'takes v1 for typed data %s, without asking for a token',
    async (_label, typedData) => {
      const getToken = vi.fn(async () => OWN_TOKEN);

      await storeStakeAndBakeSignature({
        signature: '0xsig',
        typedData,
        env: Env.stage,
        auth: { getToken },
      });

      expect(getToken).not.toHaveBeenCalled();
      expect(requestedUrls()).toEqual([
        'https://staging.prod.lombard.finance/api/v1/claimer/save-stake-and-bake-signature',
      ]);
    },
  );

  it('chooses by the address given over the typed data', async () => {
    await storeStakeAndBakeSignature({
      signature: '0xsig',
      typedData: permit,
      address: OTHER,
      env: Env.stage,
      auth: { getToken: async () => OWN_TOKEN },
    });

    expect(requestAt(0).url).toContain(
      '/api/v1/claimer/save-stake-and-bake-signature',
    );
  });
});
