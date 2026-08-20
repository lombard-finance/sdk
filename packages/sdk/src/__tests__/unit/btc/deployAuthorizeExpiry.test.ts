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
import type { BtcCoreContext } from '../../../shared/context';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const SEVEN_DAYS = Math.floor(Date.parse('2027-01-08T00:00:00Z') / 1000);

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
    await authorize(subject.ctx, { ...params, expiry: SEVEN_DAYS });

    expect(subject.signStakeAndBake).toHaveBeenCalledWith(
      expect.objectContaining({ expiry: SEVEN_DAYS }),
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
    await authorize(subject.ctx, { ...params, expiry: SEVEN_DAYS });

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
    await authorize(subject.ctx, { ...params, expiry: SEVEN_DAYS });

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

    await authorize(subject.ctx, { ...params, expiry: SEVEN_DAYS });

    expect(order).toEqual(['sign', 'store']);
  });
});

describe('the expiry unit convention', () => {
  it('is an absolute UNIX timestamp in seconds', () => {
    // Matching the low-level parameter it forwards to, so no second convention
    // enters the SDK. A milliseconds value would be ~1000x too far out.
    expect(SEVEN_DAYS).toBeLessThan(2_000_000_000);
    expect(SEVEN_DAYS).toBeGreaterThan(1_000_000_000);
  });
});
