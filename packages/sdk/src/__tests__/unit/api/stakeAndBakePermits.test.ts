/**
 * Stake-and-bake permits. With a wallet token, the v2 routes:
 *
 * - `GET /v2/stake-and-bake/permits/unused/{address}?chain=…` lists every
 *   unused permit on a chain, lowest nonce first, expired ones included.
 * - `POST /v2/stake-and-bake/permits/{address}` stores one, replacing an
 *   unused permit with the same nonce.
 *
 * Without one, the v1 claimer routes, as before. Callers were written against
 * the v1 record, a single live permit, so the v2 read is pinned on which
 * permit it reports, and a token v2 refuses is pinned not to fall back.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn } = vi.hoisted(() => ({ axiosFn: vi.fn() }));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature/getUserStakeAndBakeSignature';
import { storeStakeAndBakeSignature } from '../../../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';
import { ChainId } from '../../../common/chains';
import { AuthErrorCode } from '../../../shared/errors';

const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TOKEN = 'wallet-jwt';
const auth: LombardAuth = { getToken: async () => TOKEN };

/** Requests that went to a v1 claimer route. */
function v1Calls() {
  return axiosFn.mock.calls.filter(([config]) =>
    (config as { url: string }).url.includes('/api/v1/'),
  );
}

function lastRequest() {
  return axiosFn.mock.calls.at(-1)?.[0] as {
    url: string;
    method: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers: Record<string, string>;
  };
}

/** A permit as the gateway writes it: 64-bit integers as strings. */
function permit(
  nonce: string,
  depositAmount: string,
  { expired = false, blocked = false } = {},
) {
  return {
    blocked,
    deposit_amount: depositAmount,
    expiration_date: String(1893456000 + Number(nonce)),
    expired,
    nonce,
    spender_address: '0x77ed6a84fef665156e81247ecbd43a847b8a6398',
    token_address: '0x731efa688f3679688cf60a3993b8658138953ed6',
  };
}

function respond(permits: unknown[]) {
  axiosFn.mockResolvedValue({
    data: { max_permits_per_token: '1', permits },
    status: 200,
    headers: {},
  });
}

afterEach(() => vi.resetAllMocks());

describe('getUserStakeAndBakeSignature', () => {
  const params = {
    userDestinationAddress: ACCOUNT,
    chainId: ChainId.sepolia,
    env: Env.stage,
    auth,
  };

  beforeEach(() => respond([]));

  it('reads the unused permits for the address, naming the chain family', async () => {
    await getUserStakeAndBakeSignature(params);

    const req = lastRequest();
    expect(req.method).toBe('GET');
    expect(req.url).toBe(
      `https://staging.prod.lombard.finance/v2/stake-and-bake/permits/unused/${ACCOUNT}`,
    );
    // The permit route refuses `ethereum_sepolia` outright.
    expect(req.params).toEqual({ chain: 'ethereum' });
  });

  it.each([
    [ChainId.base, 'base'],
    [ChainId.binanceSmartChain, 'bsc'],
    [ChainId.avalanche, 'avalanche'],
  ])('names chain %s as %s', async (chainId, chain) => {
    await getUserStakeAndBakeSignature({
      ...params,
      chainId,
      env: Env.prod,
    });

    expect(lastRequest().params).toEqual({ chain });
  });

  it('sends the wallet token', async () => {
    await getUserStakeAndBakeSignature(params);

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('does not fall back to v1 when the v2 route refuses the token', async () => {
    const onUnauthorized = vi.fn();
    axiosFn.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      getUserStakeAndBakeSignature({
        ...params,
        auth: { getToken: async () => TOKEN, onUnauthorized },
      }),
    ).rejects.toMatchObject({ code: AuthErrorCode.UNAUTHORIZED });
    expect(onUnauthorized).toHaveBeenCalled();
    expect(v1Calls()).toHaveLength(0);
  });

  it('reports a live permit in the v1 record shape', async () => {
    respond([permit('0', '100000')]);

    await expect(getUserStakeAndBakeSignature(params)).resolves.toEqual({
      userDestinationAddress: ACCOUNT,
      signature: '',
      expirationDate: '1893456000',
      depositAmount: '100000',
      chainId: String(ChainId.sepolia),
      nonce: '0',
    });
  });

  // An expired permit cannot be claimed, and one blocked behind an expired
  // lower nonce cannot be either until that nonce is re-signed.
  it('skips permits that cannot be claimed and reports the first that can', async () => {
    respond([
      permit('3', '100', { expired: true }),
      permit('4', '200', { blocked: true }),
      permit('5', '300'),
      permit('6', '400'),
    ]);

    await expect(getUserStakeAndBakeSignature(params)).resolves.toMatchObject({
      nonce: '5',
      depositAmount: '300',
      expirationDate: '1893456005',
    });
  });

  it('reports an empty record when nothing on file can be claimed', async () => {
    respond([permit('0', '100000', { expired: true })]);

    await expect(getUserStakeAndBakeSignature(params)).resolves.toEqual({
      userDestinationAddress: ACCOUNT,
      signature: '',
      expirationDate: '',
      depositAmount: '',
      chainId: String(ChainId.sepolia),
      nonce: undefined,
    });
  });

  it('prefixes a gateway failure with what was being read', async () => {
    axiosFn.mockRejectedValue(new Error('Unsupported chain'));

    await expect(getUserStakeAndBakeSignature(params)).rejects.toThrow(
      'Failed to get user stake and bake signature',
    );
  });
});

/** The v1 read, for a caller with no wallet token. */
describe('getUserStakeAndBakeSignature without a wallet token', () => {
  const params = {
    userDestinationAddress: ACCOUNT,
    chainId: ChainId.sepolia,
    env: Env.stage,
  };

  beforeEach(() => {
    axiosFn.mockResolvedValue({
      data: {
        user_destination_address: ACCOUNT.toLowerCase(),
        expiration_date: '1893456000',
        deposit_amount: '100000',
        chain_id: '11155111',
      },
      status: 200,
      headers: {},
    });
  });

  it('reads the v1 claimer route, sending no Authorization', async () => {
    await getUserStakeAndBakeSignature(params);

    const req = lastRequest();
    expect(req.method).toBe('GET');
    expect(req.url).toBe(
      'https://staging.prod.lombard.finance/api/v1/claimer/get-user-stake-and-bake-signature',
    );
    expect(req.params).toEqual({
      userDestinationAddress: ACCOUNT,
      chainId: '11155111',
    });
    expect(req.headers.Authorization).toBeUndefined();
  });

  it('reads v1 when the host has no token to give', async () => {
    await getUserStakeAndBakeSignature({
      ...params,
      auth: { getToken: async () => undefined },
    });

    expect(v1Calls()).toHaveLength(1);
  });

  it('maps the v1 record as before', async () => {
    await expect(getUserStakeAndBakeSignature(params)).resolves.toEqual({
      userDestinationAddress: ACCOUNT.toLowerCase(),
      signature: undefined,
      expirationDate: '1893456000',
      depositAmount: '100000',
      chainId: '11155111',
      nonce: undefined,
    });
  });
});

describe('storeStakeAndBakeSignature', () => {
  const typedData = JSON.stringify({
    primaryType: 'Permit',
    message: {
      owner: ACCOUNT,
      spender: '0x77ed6a84fef665156e81247ecbd43a847b8a6398',
      value: '100000',
      nonce: '0',
      deadline: '1893456000',
    },
  });
  const params = {
    signature: '0xsig',
    typedData,
    env: Env.stage,
    auth,
  };

  beforeEach(() => {
    axiosFn.mockResolvedValue({ data: {}, status: 200, headers: {} });
  });

  it("posts to the permit owner's address, read from the typed data", async () => {
    await expect(storeStakeAndBakeSignature(params)).resolves.toBe('success');

    const req = lastRequest();
    expect(req.method).toBe('POST');
    expect(req.url).toBe(
      `https://staging.prod.lombard.finance/v2/stake-and-bake/permits/${ACCOUNT}`,
    );
    expect(req.params).toBeUndefined();
  });

  it('sends the typed data as signed and the signature', async () => {
    await storeStakeAndBakeSignature(params);

    expect(lastRequest().data).toEqual({
      typed_data: typedData,
      signature: '0xsig',
    });
  });

  it('posts to the address given, when one is', async () => {
    const other = '0x00000000000000000000000000000000000000aa';
    await storeStakeAndBakeSignature({ ...params, address: other });

    expect(lastRequest().url).toBe(
      `https://staging.prod.lombard.finance/v2/stake-and-bake/permits/${other}`,
    );
  });

  // The approve flow sets the allowance on chain and has no signature, and
  // the route refuses an empty one.
  it('sends a placeholder signature for an on-chain approval', async () => {
    await storeStakeAndBakeSignature({ ...params, signature: '' });

    expect(lastRequest().data).toMatchObject({ signature: '0x00' });
  });

  it('sends the wallet token', async () => {
    await storeStakeAndBakeSignature(params);

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('does not fall back to v1 when the v2 route refuses the token', async () => {
    const onUnauthorized = vi.fn();
    axiosFn.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      storeStakeAndBakeSignature({
        ...params,
        auth: { getToken: async () => TOKEN, onUnauthorized },
      }),
    ).rejects.toMatchObject({ code: AuthErrorCode.UNAUTHORIZED });
    expect(onUnauthorized).toHaveBeenCalled();
    expect(v1Calls()).toHaveLength(0);
  });

  it.each([
    ['not JSON', 'not json'],
    ['without an owner', JSON.stringify({ message: { value: '1' } })],
  ])(
    'refuses typed data %s before sending, since the address is unknown',
    async (_label, bad) => {
      await expect(
        storeStakeAndBakeSignature({ ...params, typedData: bad }),
      ).rejects.toThrow('message.owner');
      expect(axiosFn).not.toHaveBeenCalled();
    },
  );

  /** The v1 store, for a caller with no wallet token. */
  describe('without a wallet token', () => {
    const v1Params = { ...params, auth: undefined };

    beforeEach(() => {
      axiosFn.mockResolvedValue({
        data: { status: 'success' },
        status: 200,
        headers: {},
      });
    });

    it('posts to the v1 claimer route as query parameters, sending no Authorization', async () => {
      await expect(storeStakeAndBakeSignature(v1Params)).resolves.toBe(
        'success',
      );

      const req = lastRequest();
      expect(req.method).toBe('POST');
      expect(req.url).toBe(
        'https://staging.prod.lombard.finance/api/v1/claimer/save-stake-and-bake-signature',
      );
      expect(req.params).toEqual({ typed_data: typedData, signature: '0xsig' });
      expect(req.data).toBeNull();
      expect(req.headers.Authorization).toBeUndefined();
    });

    it('sends the placeholder signature for an on-chain approval', async () => {
      await storeStakeAndBakeSignature({ ...v1Params, signature: '' });

      expect(lastRequest().params).toMatchObject({ signature: '0x00' });
    });

    // v1 takes the typed data as is; the owner is only needed for the v2 path.
    it('does not require an owner in the typed data', async () => {
      await expect(
        storeStakeAndBakeSignature({ ...v1Params, typedData: '{}' }),
      ).resolves.toBe('success');
    });
  });
});
