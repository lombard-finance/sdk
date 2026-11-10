import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canResolveDepositBtcAddressWithJwt,
  getDepositAssetTypeById,
  resolveDepositBtcAddress,
} from '../../../api-functions/resolveDepositBtcAddress/resolveDepositBtcAddress';
import { ChainId, SUI_MAINNET_CHAIN } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';
import { UnauthorizedWalletJwtError } from '../../../utils/err';

// The function reaches the network through `utils/http`, so that is the seam to
// spy on. Mocking axios instead would pass while the call bypassed the wrapper,
// which is exactly the drift the boundary assertion exists to catch.
const post = vi.hoisted(() => vi.fn());
vi.mock('../../../utils/http', () => ({ httpRequest: post }));

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
    data: { deposit_address: { address: 'bc1qexample' } },
  });
});

describe('resolveDepositBtcAddress', () => {
  it('carries the JWT and no signature', async () => {
    const address = await resolveDepositBtcAddress(params);

    expect(address).toBe('bc1qexample');

    const [{ url, body, headers, baseURL }] = post.mock.calls[0];
    expect(url).toBe('v2/addresses/deposit');
    expect(baseURL).toBe('https://staging.prod.lombard.finance');
    expect(headers.Authorization).toBe('Bearer token');
    expect(body).toEqual({
      chain: 'BLOCKCHAIN_ETHEREUM',
      destination_user_address: params.address,
      destination_asset_type: 'ASSET_TYPE_LBTC',
      nonce: 0,
    });
  });

  it('resolves the v2 host per environment', async () => {
    await resolveDepositBtcAddress({ ...params, env: Env.prod });

    const [{ baseURL }] = post.mock.calls[0];
    expect(baseURL).toBe('https://api.lombard.finance');
  });

  it('passes the partner, referral and explicit asset address through', async () => {
    await resolveDepositBtcAddress({
      ...params,
      partnerId: 'partner',
      referrerCode: 'ref',
      destinationAssetAddress: '0xa55e7',
    });

    const [{ body }] = post.mock.calls[0];
    expect(body.partner_id).toBe('partner');
    expect(body.referral_code).toBe('ref');
    expect(body.destination_asset_address).toBe('0xa55e7');
    // The asset type and the asset address are one field on the wire, so
    // carrying both is refused by the route.
    expect(body).not.toHaveProperty('destination_asset_type');
  });

  it('names the asset by type when no explicit address is given', async () => {
    await resolveDepositBtcAddress(params);

    const [{ body }] = post.mock.calls[0];
    expect(body.destination_asset_type).toBe('ASSET_TYPE_LBTC');
    expect(body).not.toHaveProperty('destination_asset_address');
  });

  it('reaches a token with no asset identifier through an explicit address', async () => {
    await resolveDepositBtcAddress({
      ...params,
      token: Token.wBTC,
      destinationAssetAddress: '0xa55e7',
    });

    const [{ body }] = post.mock.calls[0];
    expect(body.destination_asset_address).toBe('0xa55e7');
    expect(body).not.toHaveProperty('destination_asset_type');
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

  // A JWT that does not authorise the requested address is refused with 403,
  // and is the same re-login case for the caller as a refused token.
  it('reports a JWT that does not authorise the address the same way', async () => {
    post.mockRejectedValue(axiosFailure(403, 'permission denied'));

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

  // The sanctions refusal is answered with an address whatever status carries
  // it, so it is read before the statuses that mean a refused JWT.
  it('answers a sanctioned destination refused with a 403', async () => {
    post.mockRejectedValue(
      axiosFailure(403, 'destination address is under sanctions'),
    );

    await expect(resolveDepositBtcAddress(params)).resolves.toBe(
      'sanctioned_address',
    );
  });

  // A testnet deployment answers to its mainnet name on this route, which is
  // the mapping most likely to be got wrong by hand.
  it('sends the mainnet identifier for a testnet chain', async () => {
    await resolveDepositBtcAddress({ ...params, chainId: ChainId.holesky });

    const [{ body }] = post.mock.calls[0];
    expect(body.chain).toBe('BLOCKCHAIN_ETHEREUM');
  });

  it('names the non-EVM chains too', async () => {
    await resolveDepositBtcAddress({ ...params, chainId: SUI_MAINNET_CHAIN });

    const [{ body }] = post.mock.calls[0];
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
    expect(
      canResolveDepositBtcAddressWithJwt(ChainId.ethereum, Token.wBTC),
    ).toBe(false);
  });

  it('defaults the token to LBTC', () => {
    expect(canResolveDepositBtcAddressWithJwt(ChainId.base)).toBe(true);
  });
});

/**
 * The gateway accepts the asset identifier for the pairs it has provisioned and
 * answers `invalid token address` for the rest — Sepolia LBTC among them. The
 * caller has no way to tell which is which, and no reason to care, so the SDK
 * asks again with the token's contract address before giving up.
 */
describe('the asset-address retry', () => {
  const invalidToken = () => axiosFailure(400, 'invalid token address');

  /**
   * Sepolia, not the shared `params`. Those point at Ethereum mainnet, which
   * `stage` has no LBTC deployment for — so there is no address to retry with
   * and the retry correctly declines. Using them here tested the wrong thing.
   */
  const onSepolia = { ...params, chainId: ChainId.sepolia };

  it('retries with the contract address and returns the result', async () => {
    post
      .mockRejectedValueOnce(invalidToken())
      .mockResolvedValueOnce({ data: { address: 'bc1qretried' } });

    await expect(resolveDepositBtcAddress(onSepolia)).resolves.toBe(
      'bc1qretried',
    );
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('sends the address instead of the type, never both', async () => {
    post
      .mockRejectedValueOnce(invalidToken())
      .mockResolvedValueOnce({ data: { address: 'bc1qretried' } });

    await resolveDepositBtcAddress(onSepolia);

    const retry = post.mock.calls[1][0] as { body: Record<string, unknown> };

    expect(retry.body.destination_asset_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // The route rejects a request carrying both fields.
    expect(retry.body).not.toHaveProperty('destination_asset_type');
  });

  it('keeps the partner and referral fields on the retry', async () => {
    post
      .mockRejectedValueOnce(invalidToken())
      .mockResolvedValueOnce({ data: { address: 'bc1qretried' } });

    await resolveDepositBtcAddress({
      ...onSepolia,
      partnerId: 'a-partner',
      referrerCode: 'a-code',
    });

    const retry = post.mock.calls[1][0] as { body: Record<string, unknown> };

    expect(retry.body.partner_id).toBe('a-partner');
    expect(retry.body.referral_code).toBe('a-code');
  });

  it('does not retry when the caller already gave an address', async () => {
    post.mockRejectedValueOnce(invalidToken());

    await expect(
      resolveDepositBtcAddress({
        ...onSepolia,
        destinationAssetAddress: '0x731eFa688F3679688cf60A3993b8658138953ED6',
      }),
    ).rejects.toThrow(/invalid token address/);
    expect(post).toHaveBeenCalledTimes(1);
  });

  /** Any other failure is the caller's to see, unchanged. */
  it('does not retry a different error', async () => {
    post.mockRejectedValueOnce(axiosFailure(500, 'internal error'));

    await expect(resolveDepositBtcAddress(onSepolia)).rejects.toThrow(
      /internal error/,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('still refuses a JWT the gateway rejects', async () => {
    post.mockRejectedValueOnce(axiosFailure(401, 'invalid token address'));

    await expect(resolveDepositBtcAddress(onSepolia)).rejects.toThrow(
      UnauthorizedWalletJwtError,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });

  /**
   * A pair with no deployment has nothing to retry with, so the original error
   * stands. Worth pinning: it is the case that made the first version of these
   * tests pass for the wrong reason.
   */
  it('does not retry when the catalog has no address for the pair', async () => {
    post.mockRejectedValueOnce(invalidToken());

    await expect(resolveDepositBtcAddress(params)).rejects.toThrow(
      /invalid token address/,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });
});
