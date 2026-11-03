/**
 * Storing a fee approval: `POST /v2/mint-with-fee/fee-approvals/{address}`
 * when a wallet token is available, the v1 claimer route when none is.
 *
 * The v2 route is user-scoped, so what goes out is asserted together with the
 * token it carries, and a refused token is asserted not to fall back to v1.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The api-functions reach the network through `utils/http`, which calls the
// axios *default export* as a function. Mocking the module keeps this test on
// the wire boundary — what goes out, and how a gateway error comes back.
const { axiosFn, isAxiosErrorFn } = vi.hoisted(() => ({
  axiosFn: vi.fn(),
  isAxiosErrorFn: vi.fn(),
}));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: isAxiosErrorFn }));

import {
  FeeSignatureAlreadyExistsError,
  storeNetworkFeeSignature,
} from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { AuthErrorCode } from '../../../shared/errors';

const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TOKEN = 'wallet-jwt';
const auth: LombardAuth = { getToken: async () => TOKEN };

/** A fee approval as `signNetworkFee` serialises it, signed on Sepolia. */
const typedData = JSON.stringify({
  domain: {
    name: 'Lombard Staked Bitcoin',
    version: '1',
    chainId: 11155111,
    verifyingContract: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  },
  primaryType: 'feeApproval',
  message: { chainId: 11155111, fee: '1000', expiry: 1760000000 },
});

const params = {
  signature: '0xsig',
  typedData,
  address: ACCOUNT,
  env: Env.stage,
  auth,
};

/** The axios config `utils/http` built for the last request. */
function lastRequest() {
  return axiosFn.mock.calls.at(-1)?.[0] as {
    url: string;
    method: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers: Record<string, string>;
  };
}

/** An axios rejection carrying the gateway's JSON body. */
function refusal(code: number, message: string) {
  return Object.assign(new Error('Request failed with status code 409'), {
    isAxiosError: true,
    response: { status: 409, data: { code, message, details: [] } },
  });
}

beforeEach(() => {
  axiosFn.mockResolvedValue({
    data: { fee_approval: { chain: 'ethereum_sepolia', address: ACCOUNT } },
    status: 200,
    headers: {},
  });
  isAxiosErrorFn.mockImplementation(
    (error: unknown) =>
      Boolean(error) && typeof error === 'object' && 'isAxiosError' in error!,
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('storeNetworkFeeSignature request', () => {
  it('posts the approval to the address on the v2 gateway', async () => {
    await expect(storeNetworkFeeSignature(params)).resolves.toBe('success');

    const req = lastRequest();
    expect(req.method).toBe('POST');
    expect(req.url).toBe(
      `https://staging.prod.lombard.finance/v2/mint-with-fee/fee-approvals/${ACCOUNT}`,
    );
    expect(req.params).toBeUndefined();
  });

  // `data` is the typed data byte for byte: the server verifies the signature
  // over exactly this string.
  it('sends the typed data as signed, the signature and the chain it names', async () => {
    await storeNetworkFeeSignature(params);

    expect(lastRequest().data).toEqual({
      chain: 'ethereum',
      data: typedData,
      signature: '0xsig',
    });
  });

  // The route refuses a chain other than `message.chainId`, and testnet's
  // Ethereum is listed under the family name, not `ethereum_sepolia`.
  it.each([
    [1, 'ethereum'],
    [11155111, 'ethereum'],
    [8453, 'base'],
  ])('names chain id %s as %s', async (chainId, chain) => {
    await storeNetworkFeeSignature({
      ...params,
      typedData: JSON.stringify({ message: { chainId } }),
    });

    expect((lastRequest().data as { chain: string }).chain).toBe(chain);
  });

  it('does not send the token address, which the route reads from the typed data', async () => {
    await storeNetworkFeeSignature({ ...params, tokenAddress: '0xdead' });

    expect(JSON.stringify(lastRequest().data)).not.toContain('0xdead');
  });

  it('sends the wallet token', async () => {
    await storeNetworkFeeSignature(params);

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('takes the deprecated synchronous token too', async () => {
    await storeNetworkFeeSignature({
      ...params,
      auth: undefined,
      getAuthToken: () => 'sync-token',
    });

    expect(lastRequest().headers.Authorization).toBe('Bearer sync-token');
  });
});

/** The v1 route, for a caller with no wallet token. */
describe('storeNetworkFeeSignature without a wallet token', () => {
  const v1Params = {
    ...params,
    auth: undefined,
    tokenAddress: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  };

  beforeEach(() => {
    axiosFn.mockResolvedValue({
      data: { status: 'success' },
      status: 200,
      headers: {},
    });
  });

  it('posts to the v1 claimer route as query parameters, sending no Authorization', async () => {
    await expect(storeNetworkFeeSignature(v1Params)).resolves.toBe('success');

    const req = lastRequest();
    expect(req.method).toBe('POST');
    expect(req.url).toBe(
      'https://staging.prod.lombard.finance/api/v1/claimer/save-user-signature',
    );
    expect(req.params).toEqual({
      typed_data: typedData,
      signature: '0xsig',
      user_destination_address: ACCOUNT,
      token_address: v1Params.tokenAddress,
    });
    expect(req.data).toBeNull();
    expect(req.headers.Authorization).toBeUndefined();
  });

  it('posts to v1 when the host has no token to give', async () => {
    await storeNetworkFeeSignature({
      ...params,
      auth: { getToken: async () => undefined },
    });

    expect(lastRequest().url).toContain('/api/v1/claimer/save-user-signature');
  });

  // The chain is only read for the v2 route; v1 takes the typed data as is.
  it('does not require a chain id in the typed data', async () => {
    await expect(
      storeNetworkFeeSignature({ ...v1Params, typedData: '{}' }),
    ).resolves.toBe('success');
  });

  it('reports the "already in force" refusal as its own type', async () => {
    axiosFn.mockRejectedValue(
      refusal(6, 'Active signature already exists for this user'),
    );

    await expect(storeNetworkFeeSignature(v1Params)).rejects.toBeInstanceOf(
      FeeSignatureAlreadyExistsError,
    );
  });
});

describe('storeNetworkFeeSignature with unusable typed data', () => {
  it.each([
    ['not JSON', 'not json'],
    ['without a chain id', JSON.stringify({ message: { fee: '1' } })],
  ])(
    'refuses typed data %s before sending, since the chain is unknown',
    async (_label, bad) => {
      await expect(
        storeNetworkFeeSignature({ ...params, typedData: bad }),
      ).rejects.toThrow('message.chainId');
      expect(axiosFn).not.toHaveBeenCalled();
    },
  );
});

describe('storeNetworkFeeSignature errors', () => {
  it('throws FeeSignatureAlreadyExistsError when the gateway answers code 6', async () => {
    axiosFn.mockRejectedValue(
      refusal(6, 'Active signature already exists for this user'),
    );

    await expect(storeNetworkFeeSignature(params)).rejects.toBeInstanceOf(
      FeeSignatureAlreadyExistsError,
    );
  });

  it('preserves the gateway message on FeeSignatureAlreadyExistsError', async () => {
    axiosFn.mockRejectedValue(refusal(6, 'approval in force until 2030'));

    const caught = await storeNetworkFeeSignature(params).catch(
      (error: unknown) => error,
    );

    expect(caught).toBeInstanceOf(FeeSignatureAlreadyExistsError);
    expect((caught as Error).message).toBe('approval in force until 2030');
    expect((caught as FeeSignatureAlreadyExistsError).code).toBe(6);
  });

  it('throws a generic Error for any other gateway refusal', async () => {
    axiosFn.mockRejectedValue(refusal(3, 'data is signed for chain id 1'));

    const caught = await storeNetworkFeeSignature(params).catch(
      (error: unknown) => error,
    );

    expect(caught).not.toBeInstanceOf(FeeSignatureAlreadyExistsError);
    expect(String(caught)).toContain('data is signed for chain id 1');
  });

  // A token refused twice is a session that is gone; the caller needs the
  // code to send the user back through sign-in, not a flattened message, and
  // storing through v1 instead would hide that.
  it('passes an auth failure through with its code, without falling back to v1', async () => {
    const onUnauthorized = vi.fn();
    axiosFn.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      storeNetworkFeeSignature({
        ...params,
        auth: { getToken: async () => TOKEN, onUnauthorized },
      }),
    ).rejects.toMatchObject({
      name: 'LombardError',
      code: AuthErrorCode.UNAUTHORIZED,
    });
    expect(onUnauthorized).toHaveBeenCalled();
    for (const [config] of axiosFn.mock.calls) {
      expect((config as { url: string }).url).not.toContain('/api/v1/');
    }
  });
});
