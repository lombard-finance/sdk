/**
 * Two figures the user signs come from the network: the BTC:LBTC ratio that
 * turns a deposit into a stake-and-bake permit value, and the minting fee a
 * fee approval carries. Neither can be checked against anything the SDK
 * holds, so each is bounded where it is turned into a signature: a figure no
 * real ratio or fee reaches is refused before the wallet is asked.
 */

import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { axiosFn, PAST_VALIDATION } = vi.hoisted(() => ({
  axiosFn: vi.fn(),
  PAST_VALIDATION: new Error('reached the token lookup'),
}));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

// The first call past the guards in signNetworkFee. A fee that reaches it
// passed validation; one that does not was refused before any lookup.
vi.mock('../../../tokens/tokens', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getTokenContractInfo: vi.fn().mockRejectedValue(PAST_VALIDATION),
}));

import { ChainId } from '../../../common/chains';
import { signNetworkFee } from '../../../contract-functions/signNetworkFee/signNetworkFee';
import {
  calculateStakeAndBakeLBTCAmount,
  toStakeAndBakePermitValue,
} from '../../../contract-functions/signStakeAndBake/utils';
import { ValidationErrorCode } from '../../../shared/errors';
import {
  assertMintingFeeWithinBounds,
  MAX_MINTING_FEE_SATOSHIS,
} from '../../../shared/validation/signing';

afterEach(() => vi.clearAllMocks());

/** The ratio route answering with `rows` as its `token_ratio`. */
function ratioRouteAnswers(rows: unknown[]) {
  axiosFn.mockResolvedValue({
    data: { token_ratio: rows },
    status: 200,
    headers: {},
  });
}

function lbtcRow(price: string) {
  return { name: 'TOKEN_SYMBOL_STLBTC', ratio: '0.99736', price };
}

describe('the stake-and-bake permit value', () => {
  it('converts the deposit at a real ratio', async () => {
    ratioRouteAnswers([lbtcRow('1.00265')]);

    await expect(toStakeAndBakePermitValue('100000', Env.prod)).resolves.toBe(
      '99735',
    );
    expect((axiosFn.mock.calls[0][0] as { url: string }).url).toContain(
      '/api/v1/ratio',
    );
  });

  // The conversion used to substitute 1, which signs the raw satoshis: a
  // permit for an amount the claimer never mints.
  it.each([
    ['no LBTC row', []],
    ['a row under another name', [{ ...lbtcRow('1.00265'), name: 'OTHER' }]],
  ])('is refused when the route lists %s', async (_label, rows) => {
    ratioRouteAnswers(rows);

    await expect(
      toStakeAndBakePermitValue('100000', Env.prod),
    ).rejects.toMatchObject({ code: ValidationErrorCode.INVALID_AMOUNT });
  });

  it.each([
    ['zero, which made the value Infinity', '0'],
    ['not a number', 'abc'],
    ['far below par, a permit 1000 times the deposit', '0.001'],
    ['just below the band', '0.8999'],
    ['just above the band', '1.1001'],
    ['far above par', '2'],
  ])('is refused when the price is %s', async (_label, price) => {
    ratioRouteAnswers([lbtcRow(price)]);

    await expect(
      calculateStakeAndBakeLBTCAmount('100000', Env.prod),
    ).rejects.toThrow(/outside 0\.9 to 1\.1/);
  });

  it.each(['0.9', '1.1'])('accepts a price of %s, the band edge', async (p) => {
    ratioRouteAnswers([lbtcRow(p)]);

    await expect(
      calculateStakeAndBakeLBTCAmount('100000', Env.prod),
    ).resolves.toBeDefined();
  });

  it('still reports a failed read as a failed read', async () => {
    axiosFn.mockRejectedValue(new Error('gateway unreachable'));

    await expect(
      calculateStakeAndBakeLBTCAmount('100000', Env.prod),
    ).rejects.toThrow('Failed to get exchange ratio for stake and bake');
  });
});

describe('assertMintingFeeWithinBounds', () => {
  it.each([
    ['zero', '0'],
    ['a negative fee', '-1'],
    ['a fractional satoshi', '472.5'],
    ['NaN', 'NaN'],
  ])('refuses %s', (_label, fee) => {
    expect(() => assertMintingFeeWithinBounds(fee)).toThrow(
      expect.objectContaining({ code: ValidationErrorCode.INVALID_AMOUNT }),
    );
  });

  it('accepts the mainnet fee, as a string or a bigint', () => {
    expect(() => assertMintingFeeWithinBounds('473')).not.toThrow();
    expect(() => assertMintingFeeWithinBounds(473n)).not.toThrow();
  });

  it('accepts the cap itself and refuses one satoshi over it', () => {
    expect(() =>
      assertMintingFeeWithinBounds(MAX_MINTING_FEE_SATOSHIS),
    ).not.toThrow();
    expect(() =>
      assertMintingFeeWithinBounds(MAX_MINTING_FEE_SATOSHIS + 1n),
    ).toThrow(
      expect.objectContaining({ code: ValidationErrorCode.AMOUNT_TOO_LARGE }),
    );
  });

  it('refuses a fee of more than half the deposit when the deposit is known', () => {
    expect(() => assertMintingFeeWithinBounds('5000', '10000')).not.toThrow();
    expect(() => assertMintingFeeWithinBounds('5001', '10000')).toThrow(
      /more than half of the 10000 satoshi deposit/,
    );
  });

  it('applies the absolute cap whatever the deposit', () => {
    expect(() =>
      assertMintingFeeWithinBounds('100000000', '1000000000'),
    ).toThrow(/above the 100000 satoshis/);
  });
});

describe('signNetworkFee', () => {
  const base = {
    account: '0x1111111111111111111111111111111111111111' as const,
    chainId: ChainId.ethereum,
    provider: {} as never,
    env: Env.prod,
  };

  it.each([
    ['zero', '0'],
    ['a fee of one BTC', '100000000'],
  ])('refuses %s before any lookup or prompt', async (_label, fee) => {
    await expect(signNetworkFee({ ...base, fee })).rejects.toThrow(
      /minting fee/,
    );
  });

  it('passes a real fee through to the token lookup', async () => {
    await expect(signNetworkFee({ ...base, fee: '473' })).rejects.toThrow(
      PAST_VALIDATION,
    );
  });
});
