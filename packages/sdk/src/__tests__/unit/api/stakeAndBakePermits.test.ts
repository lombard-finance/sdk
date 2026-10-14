import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getStakeAndBakeApiChainName,
  getStakeAndBakePermits,
  saveStakeAndBakePermit,
  StakeAndBakePermitError,
} from '../../../api-functions/stakeAndBakePermits';
import { ChainId } from '../../../common/chains';
import { UnauthorizedWalletJwtError } from '../../../utils/err';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);
const get = vi.fn();
const post = vi.fn();

function axiosFailure(status: number, data: unknown) {
  return Object.assign(new Error(`Request failed with status ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });
}

const OWNER = '0xC1A0000000000000000000000000000000000000';
const typedData = JSON.stringify({
  domain: { name: 'Bitcoin', version: '1' },
  primaryType: 'Permit',
  message: { owner: OWNER, spender: '0xspender', value: '1000', nonce: '3' },
});

beforeEach(() => {
  vi.resetAllMocks();
  mockedAxios.get = get as unknown as typeof mockedAxios.get;
  mockedAxios.post = post as unknown as typeof mockedAxios.post;
  post.mockResolvedValue({ data: {} });
});

describe('getStakeAndBakeApiChainName', () => {
  it('names a chain by its lowercase short name', () => {
    expect(getStakeAndBakeApiChainName(ChainId.ethereum)).toBe('ethereum');
    expect(getStakeAndBakeApiChainName(ChainId.base)).toBe('base');
    expect(getStakeAndBakeApiChainName(ChainId.binanceSmartChain)).toBe('bsc');
  });

  it('names a testnet by its mainnet name', () => {
    expect(getStakeAndBakeApiChainName(ChainId.sepolia)).toBe('ethereum');
  });
});

describe('getStakeAndBakePermits', () => {
  const params = {
    address: OWNER,
    chainId: ChainId.ethereum,
    walletJwt: 'jwt',
    env: Env.prod,
  };

  it('sends the JWT and chain to the v2 host', async () => {
    get.mockResolvedValue({ data: { permits: [], max_permits_per_token: 3 } });

    await getStakeAndBakePermits(params);

    const [url, config] = get.mock.calls[0];
    expect(url).toBe(`v2/stake-and-bake/permits/unused/${OWNER}`);
    expect(config.baseURL).toBe('https://api.lombard.finance');
    expect(config.params).toEqual({ chain: 'ethereum' });
    expect(config.headers.Authorization).toBe('Bearer jwt');
    expect(config.timeout).toBeGreaterThan(0);
  });

  it('asks for sepolia permits by the ethereum name on stage', async () => {
    get.mockResolvedValue({ data: { permits: [], max_permits_per_token: 3 } });

    await getStakeAndBakePermits({
      ...params,
      chainId: ChainId.sepolia,
      env: Env.stage,
    });

    const [, config] = get.mock.calls[0];
    expect(config.baseURL).toBe('https://staging.prod.lombard.finance');
    expect(config.params).toEqual({ chain: 'ethereum' });
  });

  it('maps the response to camelCase with string amounts', async () => {
    get.mockResolvedValue({
      data: {
        permits: [
          {
            spender_address: '0xa',
            token_address: '0xb',
            nonce: 3,
            deposit_amount: 150000,
            expiration_date: 1700000000,
            expired: true,
            blocked: false,
          },
          {
            spender_address: '0xc',
            token_address: '0xb',
            nonce: '4',
            deposit_amount: '123456789012345678901',
            expiration_date: '1800000000',
            expired: false,
            blocked: true,
          },
        ],
        max_permits_per_token: 5,
      },
    });

    await expect(getStakeAndBakePermits(params)).resolves.toEqual({
      permits: [
        {
          spenderAddress: '0xa',
          tokenAddress: '0xb',
          nonce: '3',
          depositAmount: '150000',
          expiresAt: 1700000000,
          expired: true,
          blocked: false,
        },
        {
          spenderAddress: '0xc',
          tokenAddress: '0xb',
          nonce: '4',
          depositAmount: '123456789012345678901',
          expiresAt: 1800000000,
          expired: false,
          blocked: true,
        },
      ],
      maxPermitsPerToken: 5,
    });
  });

  it('treats a missing list as empty', async () => {
    get.mockResolvedValue({ data: { max_permits_per_token: 3 } });

    await expect(getStakeAndBakePermits(params)).resolves.toEqual({
      permits: [],
      maxPermitsPerToken: 3,
    });
  });

  it.each([401, 403])('reports a %s as a rejected JWT', async (status) => {
    get.mockRejectedValue(axiosFailure(status, { message: 'nope' }));

    await expect(getStakeAndBakePermits(params)).rejects.toBeInstanceOf(
      UnauthorizedWalletJwtError,
    );
  });

  it('reports other refusals as a permit error', async () => {
    get.mockRejectedValue(axiosFailure(400, { message: 'bad chain' }));

    const error = await getStakeAndBakePermits(params).catch((e) => e);
    expect(error).toBeInstanceOf(StakeAndBakePermitError);
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('bad chain');
    expect(error.status).toBe(400);
  });

  it('keeps a transport failure a plain error', async () => {
    get.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

    const error = await getStakeAndBakePermits(params).catch((e) => e);
    expect(error).not.toBeInstanceOf(StakeAndBakePermitError);
    expect(error.message).toBe('timeout of 30000ms exceeded');
  });
});

describe('saveStakeAndBakePermit', () => {
  const params = {
    address: OWNER,
    typedData,
    signature: '0xsig',
    walletJwt: 'jwt',
    env: Env.prod,
  };

  it('posts the typed data string and signature with the JWT', async () => {
    await expect(saveStakeAndBakePermit(params)).resolves.toBeUndefined();

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe(`v2/stake-and-bake/permits/${OWNER}`);
    expect(body).toEqual({ typed_data: typedData, signature: '0xsig' });
    expect(config.baseURL).toBe('https://api.lombard.finance');
    expect(config.headers.Authorization).toBe('Bearer jwt');
    expect(config.timeout).toBeGreaterThan(0);
  });

  it('serialises a typed data object with bigints as strings', async () => {
    await saveStakeAndBakePermit({
      ...params,
      typedData: { message: { owner: OWNER, value: 5n } },
    });

    const [, body] = post.mock.calls[0];
    expect(JSON.parse(body.typed_data)).toEqual({
      message: { owner: OWNER, value: '5' },
    });
  });

  it('refuses typed data owned by another address without a request', async () => {
    const error = await saveStakeAndBakePermit({
      ...params,
      address: '0x0000000000000000000000000000000000000001',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(StakeAndBakePermitError);
    expect(error.code).toBe('FORBIDDEN');
    expect(post).not.toHaveBeenCalled();
  });

  it('matches the owner case-insensitively', async () => {
    await saveStakeAndBakePermit({ ...params, address: OWNER.toLowerCase() });

    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('reports a %s as a rejected JWT', async (status) => {
    post.mockRejectedValue(axiosFailure(status, { message: 'nope' }));

    await expect(saveStakeAndBakePermit(params)).rejects.toBeInstanceOf(
      UnauthorizedWalletJwtError,
    );
  });

  it.each([
    [
      400,
      '3 of 3 pending permits for this token, complete or replace one first',
      'CAP_REACHED',
      undefined,
    ],
    [400, 'nonce out of sequence, expected 7', 'OUT_OF_SEQUENCE', '7'],
    [
      400,
      'permit token 0xb0f7 is not staked by 0xca12',
      'TOKEN_NOT_STAKED',
      undefined,
    ],
    [
      400,
      'unknown spender 0xdead, valid spenders: 0xca12, 0xc8bb',
      'UNKNOWN_SPENDER',
      undefined,
    ],
    [
      400,
      'allowance 1000 is below pending deposits 3500',
      'ALLOWANCE_TOO_LOW',
      undefined,
    ],
    [409, 'nonce 3 already consumed on-chain', 'NONCE_CONSUMED', undefined],
    [409, 'nonce 3 already used by a claim', 'NONCE_CONSUMED', undefined],
    [409, 'conflict', 'NONCE_CONSUMED', undefined],
    [412, 'permit is currently being claimed', 'BEING_CLAIMED', undefined],
    [412, 'precondition failed', 'BEING_CLAIMED', undefined],
    [429, 'nonce out of sequence, expected 2', 'OUT_OF_SEQUENCE', '2'],
    [429, 'too many requests', 'UNKNOWN', undefined],
    [400, 'something else', 'UNKNOWN', undefined],
    [500, 'internal error', 'UNKNOWN', undefined],
  ] as const)(
    'maps %s "%s" to %s',
    async (status, message, code, expectedNonce) => {
      post.mockRejectedValue(axiosFailure(status, { message }));

      const error = await saveStakeAndBakePermit(params).catch((e) => e);

      expect(error).toBeInstanceOf(StakeAndBakePermitError);
      expect(error.name).toBe('StakeAndBakePermitError');
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.expectedNonce).toBe(expectedNonce);
    },
  );

  it('maps a refusal without a message body by status', async () => {
    post.mockRejectedValue(axiosFailure(412, ''));

    const error = await saveStakeAndBakePermit(params).catch((e) => e);
    expect(error.code).toBe('BEING_CLAIMED');
  });
});
