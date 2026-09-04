/**
 * A BTC-funded vault permit carries the LBTC amount, not the BTC amount
 *
 * BTC and LBTC are both 8-decimal, so the deposit amount and the permit value
 * look interchangeable and are not: one BTC does not buy one LBTC. A permit
 * signed for the raw deposit verifies, registers with the claimer, and then
 * never settles, because the amount it authorises is one the deposit will not
 * produce. That failure is silent from the client's side, which is why it needs
 * a test rather than a comment.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// A string, not a BigNumber: `vi.hoisted` runs before the imports it would
// need. The mock constructs it once the module graph is up.
const { ratio } = vi.hoisted(() => ({ ratio: { value: '1' } }));

vi.mock(
  '../../../api-functions/getLBTCExchangeRate/get-exchange-ratio',
  async () => {
    const { default: BN } = await import('bignumber.js');
    return {
      getExchangeRatio: vi.fn(async () => ({
        LBTC: { BTCTokenRatio: new BN(ratio.value) },
      })),
    };
  },
);

const { toStakeAndBakePermitValue, calculateStakeAndBakeLBTCAmount } =
  await import('../../../contract-functions/signStakeAndBake/utils');

describe('toStakeAndBakePermitValue', () => {
  beforeEach(() => {
    ratio.value = '1';
  });

  it('converts the deposit at the current ratio', async () => {
    // The exact numbers from the reported failure: a permit signed for 20000
    // satoshi where the deposit produces 19906 LBTC base units.
    ratio.value = '1.00472';

    await expect(toStakeAndBakePermitValue('20000')).resolves.toBe('19906');
  });

  it('does not return the deposit amount when a ratio applies', async () => {
    ratio.value = '1.00472';

    const value = await toStakeAndBakePermitValue('20000');

    // Stated separately from the equality above because this is the actual
    // defect: the two being equal is what shipped.
    expect(value).not.toBe('20000');
  });

  it('rounds down, matching the integer the permit carries on chain', async () => {
    // A ratio of 2 on an odd amount lands exactly on .5, which is where
    // round-down and round-half-up disagree. Anything that rounds up authorises
    // one base unit more than the deposit produces.
    ratio.value = '2';

    await expect(toStakeAndBakePermitValue('3')).resolves.toBe('1');
  });

  it('is a no-op at parity, so the conversion cannot be inferred from one case', async () => {
    await expect(toStakeAndBakePermitValue('20000')).resolves.toBe('20000');
  });

  it('returns an integer string, never exponential notation', async () => {
    ratio.value = '1.00000001';

    const value = await toStakeAndBakePermitValue('100000000000');

    // The value is compared as a BigInt and sent on the wire, so a BigNumber
    // that stringifies to exponential form would be silently corrupt.
    expect(value).toMatch(/^\d+$/);
    expect(() => BigInt(value)).not.toThrow();
  });

  it('leaves the ratio helper returning an unrounded BigNumber', async () => {
    ratio.value = '1.00472';

    const raw = await calculateStakeAndBakeLBTCAmount('20000');

    // The two are exported side by side; the rounding belongs to the permit
    // value, not to the conversion, so a caller doing its own arithmetic still
    // gets full precision.
    expect(raw.toFixed(2)).toBe('19906.04');
  });
});
