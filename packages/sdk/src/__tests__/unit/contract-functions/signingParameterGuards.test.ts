/**
 * The parameters that decide what a signature authorises, on every route that
 * takes one.
 *
 * `signStakeAndBake` grew these checks one at a time as each mistake turned up;
 * its siblings took the same parameters and had none of them. An amount and an
 * expiry are wrong in the same ways wherever they are passed, so the guard is
 * shared and these assert it is actually wired to each entry point.
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';

/**
 * The first call past the guards on the stake-and-bake path. Stubbed so a
 * value that passes proves validation let it through, rather than proving the
 * network was unreachable.
 */
const { PAST_VALIDATION } = vi.hoisted(() => ({
  PAST_VALIDATION: new Error('reached the token lookup'),
}));

vi.mock('../../../contract-functions/signStakeAndBake/utils', async () => {
  const { default: BigNumberCtor } = await import('bignumber.js');
  return {
    // The ratio conversion itself is not under test; return the input so the
    // rounding check sees exactly what the caller passed.
    calculateStakeAndBakeLBTCAmount: vi
      .fn()
      .mockImplementation(async (value: BigNumber.Value) => {
        const asNumber = new BigNumberCtor(value);
        // One satoshi over a ratio above 1 is what rounds to nothing.
        return asNumber.isEqualTo(1)
          ? new BigNumberCtor('0.997')
          : asNumber;
      }),
    getStakeAndBakeTokenContract: vi.fn().mockRejectedValue(PAST_VALIDATION),
    getPermitValue: vi.fn().mockRejectedValue(PAST_VALIDATION),
  };
});

const account = '0x1111111111111111111111111111111111111111' as const;
const provider = {} as never;
const inThirtyDays = () => Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

describe('signStakeAndBake value', () => {
  const base = {
    account,
    chainId: ChainId.ethereum,
    provider,
    expiry: inThirtyDays(),
    env: Env.prod,
  };

  async function sign(value: BigNumber.Value) {
    const { signStakeAndBake } = await import(
      '../../../contract-functions/signStakeAndBake/signStakeAndBake'
    );
    return signStakeAndBake({ ...base, value } as never);
  }

  /**
   * The parameter is base units — satoshis on this route — while every other
   * public write helper takes the human-readable amount, so `'0.001'` is the
   * mistake the shape of the SDK invites. It divides by the ratio, rounds down
   * to zero and signs: a permit authorising nothing, reported as success.
   */
  it.each([
    ['a human-readable BTC amount', '0.001'],
    ['a fractional satoshi', '1000.5'],
  ])('rejects %s', async (_label, value) => {
    await expect(sign(value)).rejects.toThrow(
      /value must be a whole number of base units/,
    );
  });

  it('names the unit and the conversion, so the caller can see what to change', async () => {
    await expect(sign('0.001')).rejects.toThrow(
      /0\.001 BTC is 100000, not 0\.001/,
    );
  });

  it.each([
    ['zero', '0'],
    ['a negative amount', '-1000'],
    ['NaN', Number.NaN],
  ])('rejects %s', async (_label, value) => {
    await expect(sign(value)).rejects.toThrow(
      /value must be greater than zero/,
    );
  });

  // An integer amount can still convert to nothing: the ratio divides.
  it('rejects an amount that the ratio rounds down to zero', async () => {
    await expect(sign('1')).rejects.toThrow(/rounds down to zero base units/);
  });

  it('accepts a whole number of satoshis', async () => {
    // Reaching the stub is the assertion: validation passed it through.
    await expect(sign('100000')).rejects.toThrow(PAST_VALIDATION);
  });
});

describe('signNetworkFee expiry', () => {
  const base = {
    account,
    chainId: ChainId.ethereum,
    provider,
    fee: '1992',
    env: Env.prod,
  };

  async function sign(expiry: number) {
    const { signNetworkFee } = await import(
      '../../../contract-functions/signNetworkFee/signNetworkFee'
    );
    return signNetworkFee({ ...base, expiry } as never);
  }

  /**
   * A fee authorisation that never lapses is the case with no symptom:
   * `checkFeeAuthorization` reads the stored expiry and reports it valid
   * forever, so the user is never asked to renew it.
   */
  it('rejects milliseconds where seconds were meant', async () => {
    await expect(sign(Date.now())).rejects.toThrow(
      /expiry looks like milliseconds/,
    );
  });

  it.each([
    ['a relative duration', 7 * 24 * 60 * 60],
    ['a stale timestamp', Math.floor(Date.parse('2020-01-01') / 1000)],
  ])('rejects %s', async (_label, expiry) => {
    await expect(sign(expiry)).rejects.toThrow(/expiry must be in the future/);
  });

  it('rejects a fractional value', async () => {
    await expect(sign(inThirtyDays() + 0.5)).rejects.toThrow(
      /expiry must be a positive whole number of seconds/,
    );
  });

  it('rejects an expiry beyond the horizon', async () => {
    const twoYears = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60;

    await expect(sign(twoYears)).rejects.toThrow(/at most 365 days ahead/);
  });
});

describe('signPermitChallenge deadline', () => {
  const base = {
    account,
    chainId: ChainId.ethereum,
    provider,
    value: '99512',
    env: Env.prod,
  };

  async function sign(deadline: number) {
    const { signPermitChallenge } = await import(
      '../../../contract-functions/signPermitChallenge'
    );
    return signPermitChallenge({ ...base, deadline } as never);
  }

  // The server settles the deadline it will honour, but it is asked for this
  // one, and nothing on the client notices a millisecond timestamp.
  it('rejects milliseconds where seconds were meant', async () => {
    await expect(sign(Date.now())).rejects.toThrow(
      /deadline looks like milliseconds/,
    );
  });

  it('names the parameter the caller passed, not the one downstream', async () => {
    await expect(sign(7 * 24 * 60 * 60)).rejects.toThrow(
      /deadline must be in the future/,
    );
  });

  it('rejects a deadline beyond the horizon', async () => {
    const twoYears = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60;

    await expect(sign(twoYears)).rejects.toThrow(/at most 365 days ahead/);
  });
});
