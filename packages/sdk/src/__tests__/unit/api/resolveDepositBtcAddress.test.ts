import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canResolveDepositBtcAddressWithJwt,
  getDepositAssetTypeById,
  resolveDepositBtcAddress,
} from '../../../api-functions/resolveDepositBtcAddress/resolveDepositBtcAddress';
import { ChainId, SUI_MAINNET_CHAIN } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { UnauthorizedWalletJwtError } from '../../../utils/err';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);
const post = vi.fn();

/** An axios rejection as the real client raises it: an Error with a response. */
function axiosFailure(status: number, message: string) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { message } },
  });
}

const params = {
  address: '0xC1A0000000000000000000000000000000000000',
  chainId: ChainId.ethereum,
  walletJwt: 'token',
  env: Env.stage,
};

beforeEach(() => {
  vi.resetAllMocks();
  post.mockResolvedValue({
    data: { deposit_address: { btc_address: 'bc1qexample' } },
  });
  mockedAxios.post = post as unknown as typeof axios.post;
});

describe('resolveDepositBtcAddress', () => {
  it('carries the JWT and no signature', async () => {
    const address = await resolveDepositBtcAddress(params);

    expect(address).toBe('bc1qexample');

    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('v2/addresses/deposit');
    expect(config.baseURL).toBe('https://staging.prod.lombard.finance');
    expect(config.headers.Authorization).toBe('Bearer token');
    expect(body).toEqual({
      chain: 'BLOCKCHAIN_ETHEREUM',
      destination_user_address: params.address,
      destination_asset_type: 'ASSET_TYPE_LBTC',
      nonce: 0,
    });
  });

  it('resolves the v2 host per environment', async () => {
    await resolveDepositBtcAddress({ ...params, env: Env.prod });

    const [, , config] = post.mock.calls[0];
    expect(config.baseURL).toBe('https://api.lombard.finance');
  });

  it('passes the partner, referral and explicit asset address through', async () => {
    await resolveDepositBtcAddress({
      ...params,
      partnerId: 'partner',
      referrerCode: 'ref',
      destinationAssetAddress: '0xa55e7',
    });

    const [, body] = post.mock.calls[0];
    expect(body.partner_id).toBe('partner');
    expect(body.referral_code).toBe('ref');
    expect(body.destination_asset_address).toBe('0xa55e7');
  });

  it('refuses an answer without an address', async () => {
    post.mockResolvedValue({ data: { deposit_address: {} } });

    await expect(resolveDepositBtcAddress(params)).rejects.toThrow(
      'returned no address',
    );
  });

  it('reports a rejected JWT as UnauthorizedWalletJwtError', async () => {
    post.mockRejectedValue(axiosFailure(401, 'unauthorized'));

    await expect(resolveDepositBtcAddress(params)).rejects.toBeInstanceOf(
      UnauthorizedWalletJwtError,
    );
  });

  it('answers a sanctioned destination the same way the v1 route does', async () => {
    post.mockRejectedValue(
      axiosFailure(400, 'destination address is under sanctions'),
    );

    await expect(resolveDepositBtcAddress(params)).resolves.toBe(
      'sanctioned_address',
    );
  });

  // A testnet deployment answers to its mainnet name on this route, which is
  // the mapping most likely to be got wrong by hand.
  it('sends the mainnet identifier for a testnet chain', async () => {
    await resolveDepositBtcAddress({ ...params, chainId: ChainId.holesky });

    const [, body] = post.mock.calls[0];
    expect(body.chain).toBe('BLOCKCHAIN_ETHEREUM');
  });

  it('names the non-EVM chains too', async () => {
    await resolveDepositBtcAddress({ ...params, chainId: SUI_MAINNET_CHAIN });

    const [, body] = post.mock.calls[0];
    expect(body.chain).toBe('BLOCKCHAIN_SUI');
  });

  it('refuses a token it has no identifier for', () => {
    expect(() => getDepositAssetTypeById(Token.wBTC)).toThrow();
  });
});

describe('canResolveDepositBtcAddressWithJwt', () => {
  it('accepts only pairs the route can name', () => {
    expect(
      canResolveDepositBtcAddressWithJwt(ChainId.ethereum, Token.LBTC),
    ).toBe(true);
    expect(
      canResolveDepositBtcAddressWithJwt(ChainId.holesky, Token.BTCb),
    ).toBe(true);
    // No identifier for the token means the caller keeps to the
    // signature-carrying route.
    expect(canResolveDepositBtcAddressWithJwt(ChainId.ethereum, Token.wBTC)).toBe(
      false,
    );
  });

  it('defaults the token to LBTC', () => {
    expect(canResolveDepositBtcAddressWithJwt(ChainId.base)).toBe(true);
  });
});
