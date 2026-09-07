/**
 * Shared EVM fee authorization
 *
 * `feeAuth.ts` was at 18.3% statement coverage while carrying the money path
 * for three actions: it decides whether a fee must be authorized, converts the
 * fee to the satoshi amount the user signs, and stores the signature.
 *
 * The conversion is the part worth pinning hardest. The design flags authorizing
 * the wrong denomination as a fund-relevant hazard, and nothing tested it.
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';

const TOKEN_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const ACCOUNT = '0xabcdef0123456789abcdef0123456789abcdef01' as const;

const getNetworkFeeSignature = vi.hoisted(() => vi.fn());
const storeNetworkFeeSignature = vi.hoisted(() => vi.fn());
const getMintingFee = vi.hoisted(() => vi.fn());
const signNetworkFee = vi.hoisted(() => vi.fn());
const getTokenContractInfo = vi.hoisted(() => vi.fn());

vi.mock('../../../api-functions', () => ({ getNetworkFeeSignature }));
vi.mock(
  '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature',
  () => ({ storeNetworkFeeSignature }),
);
vi.mock('../../../contract-functions', () => ({ getMintingFee }));
vi.mock('../../../contract-functions/signNetworkFee/signNetworkFee', () => ({
  signNetworkFee,
}));
vi.mock('../../../tokens/tokens', () => ({ getTokenContractInfo }));

const { authorizeFee, checkFeeAuthorization, createInitialFeeAuthState } =
  await import('../../../chains/evm/shared/feeAuth');

/** Seconds since the epoch, offset by the given number of hours. */
function expiry(hoursFromNow: number): string {
  return String(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}

beforeEach(() => {
  vi.clearAllMocks();
  getTokenContractInfo.mockResolvedValue({ address: TOKEN_ADDRESS, abi: [] });
  getNetworkFeeSignature.mockResolvedValue({
    hasSignature: false,
    expirationDate: null,
  });
  getMintingFee.mockResolvedValue(new BigNumber('0.0001'));
  signNetworkFee.mockResolvedValue({
    signature: '0xsig',
    typedData: '{"typed":"data"}',
  });
  storeNetworkFeeSignature.mockResolvedValue(undefined);
});

describe('checkFeeAuthorization on a subsidized chain', () => {
  it('reports no authorization required', async () => {
    const result = await checkFeeAuthorization(
      ChainId.base,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result).toEqual({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    });
  });

  // The early return is the point: a subsidized chain must not pay for a
  // signature lookup, a token lookup or a fee read.
  it('makes no network calls at all', async () => {
    await checkFeeAuthorization(ChainId.base, ACCOUNT, Env.prod, Token.LBTC);

    expect(getTokenContractInfo).not.toHaveBeenCalled();
    expect(getNetworkFeeSignature).not.toHaveBeenCalled();
    expect(getMintingFee).not.toHaveBeenCalled();
  });
});

describe('checkFeeAuthorization on an unsubsidized chain', () => {
  it('requires authorization and fetches the fee when no signature exists', async () => {
    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.requiresAuth).toBe(true);
    expect(result.hasValidSignature).toBe(false);
    expect(getMintingFee).toHaveBeenCalledWith({
      token: Token.LBTC,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });
  });

  it('looks the signature up by token address, not by account alone', async () => {
    await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(getNetworkFeeSignature).toHaveBeenCalledWith({
      address: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
      tokenAddress: TOKEN_ADDRESS,
    });
  });

  it('skips the fee read when a valid signature already exists', async () => {
    getNetworkFeeSignature.mockResolvedValue({
      hasSignature: true,
      expirationDate: expiry(24),
    });

    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.hasValidSignature).toBe(true);
    expect(result.feeInSatoshis).toBeNull();
    expect(getMintingFee).not.toHaveBeenCalled();
  });

  it('treats an expired signature as invalid and re-reads the fee', async () => {
    getNetworkFeeSignature.mockResolvedValue({
      hasSignature: true,
      expirationDate: expiry(-1),
    });

    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.hasValidSignature).toBe(false);
    expect(getMintingFee).toHaveBeenCalled();
    // The expiry is still reported, so a UI can say when it lapsed.
    expect(result.expirationDate).not.toBeNull();
  });

  it('treats a signature with no expiry as unexpired', async () => {
    getNetworkFeeSignature.mockResolvedValue({
      hasSignature: true,
      expirationDate: null,
    });

    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.hasValidSignature).toBe(true);
    expect(result.expirationDate).toBeNull();
  });

  it('does not treat a missing signature as valid just because it cannot expire', async () => {
    getNetworkFeeSignature.mockResolvedValue({
      hasSignature: false,
      expirationDate: null,
    });

    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.hasValidSignature).toBe(false);
  });
});

/**
 * The user signs `feeInSatoshis`. Getting this conversion wrong authorizes the
 * wrong amount, so it is asserted on exact values rather than shapes.
 */
describe('the BTC to satoshi conversion', () => {
  async function satoshisFor(btc: string): Promise<bigint | null> {
    getMintingFee.mockResolvedValue(new BigNumber(btc));
    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );
    return result.feeInSatoshis;
  }

  it.each([
    ['0.0001', 10_000n],
    ['0.00000001', 1n],
    ['1', 100_000_000n],
    ['0', 0n],
    ['0.12345678', 12_345_678n],
    ['21000000', 2_100_000_000_000_000n],
  ])('converts %s BTC to %s satoshis', async (btc, expected) => {
    expect(await satoshisFor(btc)).toBe(expected);
  });

  // toFixed(0) rounds rather than truncating, so a sub-satoshi fee does not
  // silently become zero.
  it('rounds a sub-satoshi fee to the nearest satoshi', async () => {
    expect(await satoshisFor('0.000000006')).toBe(1n);
    expect(await satoshisFor('0.000000004')).toBe(0n);
  });

  it('formats the display value to eight decimals', async () => {
    getMintingFee.mockResolvedValue(new BigNumber('0.5'));
    const result = await checkFeeAuthorization(
      ChainId.ethereum,
      ACCOUNT,
      Env.prod,
      Token.LBTC,
    );

    expect(result.feeFormatted).toBe('0.50000000');
  });
});

describe('authorizeFee', () => {
  const params = {
    chainId: ChainId.ethereum,
    account: ACCOUNT,
    feeInSatoshis: 10_000n,
    provider: {} as never,
    env: Env.prod,
    token: Token.LBTC,
  };

  it('signs the exact fee it was given', async () => {
    await authorizeFee(params);

    expect(signNetworkFee).toHaveBeenCalledWith({
      fee: 10_000n,
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      provider: params.provider,
      env: Env.prod,
      token: Token.LBTC,
    });
  });

  it('stores the signature against the token address', async () => {
    await authorizeFee(params);

    expect(storeNetworkFeeSignature).toHaveBeenCalledWith({
      signature: '0xsig',
      typedData: '{"typed":"data"}',
      address: ACCOUNT,
      env: Env.prod,
      tokenAddress: TOKEN_ADDRESS,
    });
  });

  it('returns the signature to the caller', async () => {
    await expect(authorizeFee(params)).resolves.toEqual({
      signature: '0xsig',
      typedData: '{"typed":"data"}',
    });
  });

  // Storing before signing would persist a signature the wallet never produced.
  it('signs before it stores', async () => {
    const order: string[] = [];
    signNetworkFee.mockImplementation(async () => {
      order.push('sign');
      return { signature: '0xsig', typedData: '{}' };
    });
    storeNetworkFeeSignature.mockImplementation(async () => {
      order.push('store');
    });

    await authorizeFee(params);

    expect(order).toEqual(['sign', 'store']);
  });

  it('does not store anything when signing is rejected', async () => {
    signNetworkFee.mockRejectedValue(new Error('user rejected'));

    await expect(authorizeFee(params)).rejects.toThrow('user rejected');
    expect(storeNetworkFeeSignature).not.toHaveBeenCalled();
  });

  it('propagates a store failure rather than reporting success', async () => {
    storeNetworkFeeSignature.mockRejectedValue(new Error('server down'));

    await expect(authorizeFee(params)).rejects.toThrow('server down');
  });
});

describe('createInitialFeeAuthState', () => {
  it('starts unauthorized with nothing known', () => {
    expect(createInitialFeeAuthState()).toEqual({
      requiresAuth: false,
      isAuthorized: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    });
  });

  it('returns a fresh object each call, so actions cannot share state', () => {
    const a = createInitialFeeAuthState();
    const b = createInitialFeeAuthState();

    expect(a).not.toBe(b);
  });
});
