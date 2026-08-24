/**
 * `authorize({ expiry })` on the BTC deploy actions
 *
 * `signStakeAndBake()` has always accepted an `expiry` and defaulted to 24
 * hours, but no higher-level caller could reach it: the field was missing from
 * `SignStakeAndBakeParams`, so neither `EvmService` nor either config could
 * forward one, and `authorizeDeposit()` took no arguments at all. Every
 * consumer going through the deploy actions was pinned to 24 hours.
 *
 * These assert the whole path carries the override, and that omitting it still
 * leaves the default to the low-level function rather than inventing a second
 * one on the way down.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evmDepositAndDeployConfig } from '../../../chains/btc/actions/depositAndDeploy/config/evm';
import { evmStakeAndDeployConfig } from '../../../chains/btc/actions/stakeAndDeploy/config/evm';
import { ChainId } from '../../../common/chains';
import { signStakeAndBake } from '../../../contract-functions/signStakeAndBake/signStakeAndBake';
import { AssetId, Chain, type DeployProtocol } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

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
    vaultKey: 'veda',
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
        vaultKey: 'veda',
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
});

/**
 * The hop consumers actually use.
 *
 * The config-level tests above call `authorizeStakeAndBake` directly, which
 * skips the action class — the one place a consumer touches. These drive the
 * real `BtcStakeAndDeploy` through `prepare()` and `authorizeDeposit()`, so the
 * option has to survive the whole path to be seen by the signer.
 */
describe('BtcStakeAndDeploy.authorizeDeposit', () => {
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

    const { BtcStakeAndDeploy } =
      await import('../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy');

    const action = new BtcStakeAndDeploy(subject.ctx, {
      assetOut: AssetId.LBTC,
      sourceChain: Chain.BITCOIN_MAINNET,
      destChain: Chain.ETHEREUM,
      protocol: 'veda' as DeployProtocol,
    });

    await action.prepare({ amount: '0.01', recipient: RECIPIENT });

    return { action, subject };
  }

  it('carries an explicit expiry from the action down to the signer', async () => {
    const { action, subject } = await readyAction();

    await action.authorizeDeposit({ expiry: FUTURE_EXPIRY });

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: FUTURE_EXPIRY }),
    );
  });

  it('passes undefined when called with no options, leaving the default downstream', async () => {
    const { action, subject } = await readyAction();

    await action.authorizeDeposit();

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: undefined }),
    );
  });
});
