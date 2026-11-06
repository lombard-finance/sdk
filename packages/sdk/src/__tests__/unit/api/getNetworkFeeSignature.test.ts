/**
 * Reading fee approvals: `GET /v2/mint-with-fee/fee-approvals/{address}` when
 * a wallet token is available, the v1 claimer route when none is.
 *
 * The v2 route lists one approval per token the chain mints, with the expiry
 * as an RFC 3339 timestamp; callers were written against the v1 record, one
 * approval with the expiry in Unix seconds. These pin the translation, using
 * the wire shape the gateway answers with, and which route a call takes.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn } = vi.hoisted(() => ({ axiosFn: vi.fn() }));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { getNetworkFeeSignature } from '../../../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
import { ChainId } from '../../../common/chains';
import { AuthErrorCode } from '../../../shared/errors';

const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TOKEN = 'wallet-jwt';
const auth: LombardAuth = { getToken: async () => TOKEN };

/** Stage LBTC and BTC.b on Sepolia, lower-cased as the gateway writes them. */
const LBTC = '0x731efa688f3679688cf60a3993b8658138953ed6';
const BTCB = '0x0000000000000000000000000000000000000b7c';

function approval(
  assetType: string,
  address: string,
  expiresAt: string,
  delayed = false,
) {
  return {
    address: ACCOUNT,
    asset: {
      address,
      asset_type: assetType,
      chain: 'ethereum_sepolia',
      decimals: 8,
      display_name: assetType,
    },
    chain: 'ethereum_sepolia',
    delayed,
    expires_at: expiresAt,
  };
}

function respond(feeApprovals: unknown[]) {
  axiosFn.mockResolvedValue({
    data: { fee_approvals: feeApprovals },
    status: 200,
    headers: {},
  });
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

const params = {
  address: ACCOUNT,
  chainId: ChainId.sepolia,
  env: Env.stage,
  auth,
};

beforeEach(() => respond([]));
afterEach(() => vi.resetAllMocks());

describe('getNetworkFeeSignature request', () => {
  it('reads the address on the v2 gateway, naming the chain family', async () => {
    await getNetworkFeeSignature(params);

    const req = lastRequest();
    expect(req.method).toBe('GET');
    expect(req.url).toBe(
      `https://staging.prod.lombard.finance/v2/mint-with-fee/fee-approvals/${ACCOUNT}`,
    );
    // Sepolia is `ethereum` on the testnet hosts; `ethereum_sepolia` is
    // refused by mainnet and by the permit route.
    expect(req.params).toEqual({ chain: 'ethereum' });
    expect(req.data).toBeUndefined();
  });

  it('reads mainnet from the production gateway', async () => {
    await getNetworkFeeSignature({
      ...params,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(lastRequest().url).toBe(
      `https://api.lombard.finance/v2/mint-with-fee/fee-approvals/${ACCOUNT}`,
    );
    expect(lastRequest().params).toEqual({ chain: 'ethereum' });
  });

  it('sends the wallet token', async () => {
    await getNetworkFeeSignature(params);

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('takes the deprecated synchronous token too', async () => {
    await getNetworkFeeSignature({
      ...params,
      auth: undefined,
      getAuthToken: () => 'sync-token',
    });

    expect(lastRequest().url).toContain('/v2/mint-with-fee/fee-approvals/');
    expect(lastRequest().headers.Authorization).toBe('Bearer sync-token');
  });

  // A refused token is a session that is gone. Answering from v1 instead
  // would hide that from the host until something else needed the token.
  it('does not fall back to v1 when the v2 route refuses the token', async () => {
    const onUnauthorized = vi.fn();
    axiosFn.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await expect(
      getNetworkFeeSignature({
        ...params,
        auth: { getToken: async () => TOKEN, onUnauthorized },
      }),
    ).rejects.toMatchObject({ code: AuthErrorCode.UNAUTHORIZED });

    expect(onUnauthorized).toHaveBeenCalled();
    for (const [config] of axiosFn.mock.calls) {
      expect((config as { url: string }).url).not.toContain('/api/v1/');
    }
  });
});

/** The v1 route, for a caller with no wallet token. */
describe('getNetworkFeeSignature without a wallet token', () => {
  const v1Params = { ...params, auth: undefined };

  beforeEach(() => {
    axiosFn.mockResolvedValue({
      data: { has_signature: true, expiration_date: '1893456000' },
      status: 200,
      headers: {},
    });
  });

  it('reads the v1 claimer route, sending no Authorization', async () => {
    await getNetworkFeeSignature({ ...v1Params, tokenAddress: LBTC });

    const req = lastRequest();
    expect(req.method).toBe('GET');
    expect(req.url).toBe(
      'https://staging.prod.lombard.finance/api/v1/claimer/get-user-signature',
    );
    expect(req.params).toEqual({
      user_destination_address: ACCOUNT,
      chain_id: ChainId.sepolia,
      token_address: LBTC,
    });
    expect(req.headers.Authorization).toBeUndefined();
  });

  it('reads v1 when the host has no token to give', async () => {
    await getNetworkFeeSignature({
      ...params,
      auth: { getToken: async () => undefined },
    });

    expect(lastRequest().url).toContain('/api/v1/claimer/get-user-signature');
  });

  it('maps the v1 record as before', async () => {
    await expect(getNetworkFeeSignature(v1Params)).resolves.toEqual({
      expirationDate: '1893456000',
      hasSignature: true,
      isDelayed: undefined,
      signature: undefined,
      typedData: undefined,
    });
  });

  // v1 answers `{}` when nothing is on file, and callers were written against
  // the fields being absent then.
  it('leaves the fields out when v1 has nothing on file', async () => {
    axiosFn.mockResolvedValue({ data: {}, status: 200, headers: {} });

    const result = await getNetworkFeeSignature(v1Params);

    expect(result.hasSignature).toBeUndefined();
    expect(result.expirationDate).toBeUndefined();
  });
});

describe('getNetworkFeeSignature response', () => {
  it('reports the approval for the token asked about', async () => {
    respond([
      approval('lbtc', LBTC, '2030-01-01T00:00:00Z'),
      approval('btcb', BTCB, '2031-01-01T00:00:00Z', true),
    ]);

    await expect(
      getNetworkFeeSignature({ ...params, tokenAddress: BTCB }),
    ).resolves.toEqual({
      hasSignature: true,
      expirationDate: '1924992000',
      isDelayed: true,
    });
  });

  it('matches the token address regardless of case', async () => {
    respond([approval('lbtc', LBTC, '2030-01-01T00:00:00Z')]);

    const result = await getNetworkFeeSignature({
      ...params,
      tokenAddress: '0x731eFa688F3679688cf60A3993b8658138953ED6',
    });

    expect(result.hasSignature).toBe(true);
  });

  // The v1 route answered for LBTC when given no token, and callers that pass
  // none were written against that.
  it('reports the LBTC approval when no token is named', async () => {
    respond([
      approval('btcb', BTCB, '2031-01-01T00:00:00Z'),
      approval('ASSET_TYPE_LBTC', LBTC, '2030-01-01T00:00:00Z'),
    ]);

    await expect(getNetworkFeeSignature(params)).resolves.toMatchObject({
      hasSignature: true,
      expirationDate: '1893456000',
    });
  });

  it('reports no approval when only another token has one', async () => {
    respond([approval('btcb', BTCB, '2031-01-01T00:00:00Z')]);

    await expect(
      getNetworkFeeSignature({ ...params, tokenAddress: LBTC }),
    ).resolves.toEqual({
      hasSignature: false,
      expirationDate: '',
      isDelayed: false,
    });
  });

  it('reports no approval for an empty list', async () => {
    await expect(getNetworkFeeSignature(params)).resolves.toEqual({
      hasSignature: false,
      expirationDate: '',
      isDelayed: false,
    });
  });

  // Callers compare `Number(expirationDate) * 1000` against the clock.
  it('gives the expiry in Unix seconds, the unit callers compare against', async () => {
    respond([approval('lbtc', LBTC, '2030-01-01T00:00:00.750Z')]);

    const { expirationDate } = await getNetworkFeeSignature(params);

    expect(expirationDate).toBe('1893456000');
    expect(new Date(Number(expirationDate) * 1000).toISOString()).toBe(
      '2030-01-01T00:00:00.000Z',
    );
  });

  it('never claims to return the signature, which the route does not send', async () => {
    respond([approval('lbtc', LBTC, '2030-01-01T00:00:00Z')]);

    const result = await getNetworkFeeSignature(params);

    expect(result.signature).toBeUndefined();
    expect(result.typedData).toBeUndefined();
  });

  it('wraps a gateway failure in an Error carrying its message', async () => {
    axiosFn.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed',
      response: {
        status: 400,
        data: { code: 3, message: 'unsupported chain' },
      },
    });

    await expect(getNetworkFeeSignature(params)).rejects.toThrow(Error);
  });
});
