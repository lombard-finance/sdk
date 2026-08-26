/**
 * `signNetworkFee({ expiry })`
 *
 * `expiry` here is the same thing as `signStakeAndBake`'s: an absolute UNIX
 * timestamp in seconds, signed into a `uint256` EIP-712 field. It can go wrong
 * the same three ways, and the far-future one is again the case with no
 * downstream symptom — the fee approval signs, is returned, and stands rather
 * than lapsing.
 *
 * `signStakeAndBake` gained `assertValidExpiry`; this one did not. These pin
 * the shared guard to both call sites.
 */

import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { signNetworkFee } from '../../../contract-functions/signNetworkFee/signNetworkFee';

/**
 * The first call past `assertValidExpiry`. Stubbed so a valid expiry proves
 * validation let it through, rather than proving the network was unreachable.
 */
const { PAST_VALIDATION } = vi.hoisted(() => ({
  PAST_VALIDATION: new Error('reached the token contract lookup'),
}));

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn().mockRejectedValue(PAST_VALIDATION),
}));

const base = {
  fee: '1000',
  account: '0x0000000000000000000000000000000000000001',
  chainId: ChainId.ETHEREUM_MAINNET,
  provider: {} as never,
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('signNetworkFee expiry validation', () => {
  it('rejects a fractional expiry', async () => {
    await expect(
      signNetworkFee({ ...base, expiry: nowSeconds() + 3600.5 } as never),
    ).rejects.toThrow(/whole number of seconds/);
  });

  it.each([
    ['a relative duration rather than a timestamp', 7 * 24 * 60 * 60],
    [
      'a stale timestamp',
      Math.floor(Date.parse('2020-01-01T00:00:00Z') / 1000),
    ],
  ])('rejects %s', async (_label, expiry) => {
    await expect(signNetworkFee({ ...base, expiry } as never)).rejects.toThrow(
      /expiry must be in the future/,
    );
  });

  /**
   * The one bad expiry with no downstream symptom: `Date.now()` is a positive
   * safe integer in the future, so it clears the other checks and dates the
   * approval tens of thousands of years out.
   */
  it('rejects Date.now(), i.e. milliseconds where seconds were meant', async () => {
    await expect(
      signNetworkFee({ ...base, expiry: Date.now() } as never),
    ).rejects.toThrow(/expiry looks like milliseconds/);
  });

  it('names the fee approval, not a permit deadline', async () => {
    await expect(
      signNetworkFee({ ...base, expiry: Date.now() } as never),
    ).rejects.toThrow(/fee approval expiry/);
  });

  it('rejects a value beyond the horizon even when it is not milliseconds', async () => {
    const twoYears = nowSeconds() + 2 * 365 * 24 * 60 * 60;

    await expect(
      signNetworkFee({ ...base, expiry: twoYears } as never),
    ).rejects.toThrow(/at most 365 days ahead/);
  });

  it('lets a valid expiry through to the token lookup', async () => {
    await expect(
      signNetworkFee({ ...base, expiry: nowSeconds() + 3600 } as never),
    ).rejects.toThrow(PAST_VALIDATION);
  });

  it('lets the default expiry through to the token lookup', async () => {
    await expect(signNetworkFee({ ...base } as never)).rejects.toThrow(
      PAST_VALIDATION,
    );
  });
});
