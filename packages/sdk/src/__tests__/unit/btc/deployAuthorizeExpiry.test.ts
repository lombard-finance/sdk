/**
 * `authorize({ expiry })` on the BTC deploy actions
 *
 * `signStakeAndBake()` has always accepted an `expiry` and defaulted to 24
 * hours, but no higher-level caller could reach it: the field was missing from
 * `SignStakeAndBakeParams`, so neither `EvmService` nor either config could
 * forward one, and the ceremony took no arguments at all. Every
 * consumer going through the deploy actions was pinned to 24 hours.
 *
 * These assert the whole path carries the override, and that omitting it still
 * leaves the default to the low-level function rather than inventing a second
 * one on the way down.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evmDepositAndDeployConfig } from '../../../chains/btc/actions/deploy-btcb/config/evm';
import { evmStakeAndDeployConfig } from '../../../chains/btc/actions/deploy-lbtc/config/evm';
import { ChainId } from '../../../common/chains';
import { signStakeAndBake } from '../../../contract-functions/signStakeAndBake/signStakeAndBake';
import { AssetId, Chain, type DeployProtocol } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

/**
 * The first call past `assertValidExpiry`. Stubbed so a valid expiry proves
 * validation let it through, rather than proving the network was unreachable.
 */
// `vi.hoisted` because `vi.mock` is lifted above ordinary declarations.
const { PAST_VALIDATION } = vi.hoisted(() => ({
  PAST_VALIDATION: new Error('reached the ratio lookup'),
}));
vi.mock('../../../contract-functions/signStakeAndBake/utils', () => ({
  calculateStakeAndBakeLBTCAmount: vi.fn().mockRejectedValue(PAST_VALIDATION),
  // The permit value is what signStakeAndBake reaches for now; the ratio helper
  // sits behind it. Both are stubbed so the sentinel fires whichever is called.
  toStakeAndBakePermitValue: vi.fn().mockRejectedValue(PAST_VALIDATION),
  getStakeAndBakeTokenContract: vi.fn().mockRejectedValue(PAST_VALIDATION),
  getPermitValue: vi.fn().mockRejectedValue(PAST_VALIDATION),
}));

vi.mock('../../../api-functions/getUserStakeAndBakeSignature', () => ({
  getUserStakeAndBakeSignature: vi
    .fn()
    .mockRejectedValue(new Error('no stored signature')),
}));

const RECIPIENT = '0x1111111111111111111111111111111111111111';
/** A fixed timestamp comfortably in the future, in seconds. */
const FUTURE_EXPIRY = Math.floor(Date.parse('2027-01-08T00:00:00Z') / 1000);

/**
 * A context whose EVM capability records what it was asked to sign.
 *
 * The configs reach the service through `ctx.capabilities.require('evm')`, so
 * that is the seam: a spy here sees exactly what the action forwarded.
 */
function contextWithSpy() {
  const signStakeAndBake = vi.fn().mockResolvedValue({
    signature: '0xsig',
    typedData: '{"typed":"data"}',
  });
  const storeStakeAndBakeSignature = vi.fn().mockResolvedValue(undefined);

  const ctx = {
    env: Env.prod,
    capabilities: {
      require: (id: string) => {
        if (id === 'evm') return { signStakeAndBake };
        throw new Error(`not stubbed: ${id}`);
      },
      has: () => true,
    },
    getProvider: vi.fn().mockResolvedValue({
      request: vi
        .fn()
        .mockImplementation(async ({ method }: { method: string }) =>
          // ensureCorrectChain reads the chain id before signing
          method === 'eth_chainId' ? '0x1' : ['0xaccount'],
        ),
    }),
    api: { storeStakeAndBakeSignature },
  } as unknown as BtcCoreContext;

  return { ctx, signStakeAndBake, storeStakeAndBakeSignature };
}

const CONFIGS = [
  ['stakeAndDeploy', evmStakeAndDeployConfig.authorizeStakeAndBake] as const,
  [
    'depositAndDeploy',
    evmDepositAndDeployConfig.authorizeDepositAndDeploy,
  ] as const,
];

describe.each(CONFIGS)('%s config', (_name, authorize) => {
  let subject: ReturnType<typeof contextWithSpy>;

  beforeEach(() => {
    subject = contextWithSpy();
  });

  const params = {
    chainId: ChainId.ethereum,
    recipient: RECIPIENT,
    amount: '1000000',
    vaultKey: 'bitcoinEarn',
    token: 'LBTC',
  };

  it('forwards an explicit expiry to the signer', async () => {
    await authorize(subject.ctx, { ...params, expiry: FUTURE_EXPIRY });

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: FUTURE_EXPIRY }),
    );
  });

  // Passing `undefined` rather than a computed value is deliberate: the default
  // lives in signStakeAndBake, and duplicating it here would give the SDK two
  // places to change it.
  it('passes undefined when no expiry is given, leaving the default downstream', async () => {
    await authorize(subject.ctx, params);

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: undefined }),
    );
  });

  it('does not alter the rest of the signing payload', async () => {
    await authorize(subject.ctx, { ...params, expiry: FUTURE_EXPIRY });

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '1000000',
        account: RECIPIENT,
        chainId: ChainId.ethereum,
        vaultKey: 'bitcoinEarn',
      }),
    );
  });

  it('stores the signature it received', async () => {
    await authorize(subject.ctx, { ...params, expiry: FUTURE_EXPIRY });

    expect(subject.storeStakeAndBakeSignature).toHaveBeenCalledWith({
      signature: '0xsig',
      typedData: '{"typed":"data"}',
    });
  });

  it('signs before it stores', async () => {
    const order: string[] = [];
    subject.signStakeAndBake.mockImplementation(async () => {
      order.push('sign');
      return { signature: '0xsig', typedData: '{}' };
    });
    subject.storeStakeAndBakeSignature.mockImplementation(async () => {
      order.push('store');
    });

    await authorize(subject.ctx, { ...params, expiry: FUTURE_EXPIRY });

    expect(order).toEqual(['sign', 'store']);
  });
});

/**
 * `BigInt()` rejects anything that is not an integer, so an unvalidated expiry
 * surfaced as a RangeError from inside the permit build, naming neither the
 * parameter nor its unit. The parameter is in seconds, so the likely mistake is
 * passing milliseconds or `Date.now() / 1000` without a floor.
 */
describe('expiry validation', () => {
  const base = {
    account: RECIPIENT as `0x${string}`,
    value: '1000',
    chainId: ChainId.ethereum,
    provider: {} as never,
  };

  it.each([
    ['a fractional value, i.e. Date.now() / 1000 unfloored', 1893456000.5],
    ['a negative timestamp', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
  ])('rejects %s', async (_label, expiry) => {
    await expect(
      signStakeAndBake({ ...base, expiry } as never),
    ).rejects.toThrow(/expiry must be a positive whole number of seconds/);
  });

  it('names the unit, so the caller can see what to change', async () => {
    await expect(
      signStakeAndBake({ ...base, expiry: 1893456000.5 } as never),
    ).rejects.toThrow(/Math\.floor/);
  });

  // A past value signs and stores, then fails on chain. These are the two
  // shapes that produce one: a duration, and a timestamp left lying around.
  it.each([
    ['a relative duration rather than a timestamp', 7 * 24 * 60 * 60],
    [
      'a stale timestamp',
      Math.floor(Date.parse('2020-01-01T00:00:00Z') / 1000),
    ],
  ])('rejects %s', async (_label, expiry) => {
    await expect(
      signStakeAndBake({ ...base, expiry } as never),
    ).rejects.toThrow(/expiry must be in the future/);
  });

  /**
   * `Date.now()` is a positive safe integer in the future, so it clears every
   * other check and sets the deadline ~56,000 years out. Nothing fails: the
   * permit signs and is stored, and the spender holds an allowance that never
   * lapses. This is the one bad expiry with no downstream symptom, so the
   * upper bound is the only thing standing between a missing `/ 1000` and a
   * permanent authorisation.
   */
  it('rejects Date.now(), i.e. milliseconds where seconds were meant', async () => {
    await expect(
      signStakeAndBake({ ...base, expiry: Date.now() } as never),
    ).rejects.toThrow(/expiry looks like milliseconds/);
  });

  it('says which year the milliseconds value would have set', async () => {
    await expect(
      signStakeAndBake({ ...base, expiry: Date.now() } as never),
    ).rejects.toThrow(/the year 5\d{4}/);
  });

  it('rejects a deadline beyond the horizon even when it is not milliseconds', async () => {
    const twoYears = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60;

    await expect(
      signStakeAndBake({ ...base, expiry: twoYears } as never),
    ).rejects.toThrow(/at most 365 days ahead/);
  });

  it('accepts the seven days the migration guidance asks for', async () => {
    const sevenDays = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    // Reaching the stub is the assertion: validation passed it through.
    await expect(
      signStakeAndBake({ ...base, expiry: sevenDays } as never),
    ).rejects.toThrow(PAST_VALIDATION);
  });

  it('accepts a deadline just inside the horizon', async () => {
    const almostAYear = Math.floor(Date.now() / 1000) + 364 * 24 * 60 * 60;

    await expect(
      signStakeAndBake({ ...base, expiry: almostAYear } as never),
    ).rejects.toThrow(PAST_VALIDATION);
  });
});

/**
 * The hop consumers actually use.
 *
 * The config-level tests above call `authorizeStakeAndBake` directly, which
 * skips the action class — the one place a consumer touches. These drive the
 * real `BtcDeployLbtc` through `prepare()` and `authorize()`, so the
 * option has to survive the whole path to be seen by the signer.
 */
describe('BtcDeployLbtc.authorizeDeposit', () => {
  async function readyAction() {
    const subject = contextWithSpy();

    // All reached through ctx by prepare(); none is part of what is under test.
    const mutable = subject.ctx as unknown as Record<string, unknown>;
    mutable.api = {
      ...(mutable.api as Record<string, unknown>),
      getDepositAddress: vi.fn().mockResolvedValue(undefined),
    };
    mutable.partner = { getPartnerId: () => undefined };
    mutable.capabilities = {
      require: (id: string) => {
        if (id === 'evm') {
          return {
            signStakeAndBake: subject.signStakeAndBake,
            getStakeAndBakeFee: vi.fn().mockResolvedValue('0'),
          };
        }
        throw new Error(`not stubbed: ${id}`);
      },
      has: () => true,
    };

    const { BtcDeployLbtc } =
      await import('../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc');

    const action = new BtcDeployLbtc(subject.ctx, {
      assetOut: AssetId.LBTC,
      sourceChain: Chain.BITCOIN_MAINNET,
      destChain: Chain.ETHEREUM,
      protocol: 'bitcoinEarn' as DeployProtocol,
    });

    await action.prepare({ amount: '0.01', recipient: RECIPIENT });

    return { action, subject };
  }

  it('carries an explicit expiry from the action down to the signer', async () => {
    const { action, subject } = await readyAction();

    await action.authorize({ expiry: FUTURE_EXPIRY });

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: FUTURE_EXPIRY }),
    );
  });

  it('passes undefined when called with no options, leaving the default downstream', async () => {
    const { action, subject } = await readyAction();

    await action.authorize();

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: undefined }),
    );
  });
});
