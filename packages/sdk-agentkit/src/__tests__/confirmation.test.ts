/**
 * A tool call is the transaction.
 *
 * Every write action signs and sends as soon as it is invoked, and the caller
 * is a model reading text — not all of which the operator wrote. These assert
 * the gate is actually in front of each write, that declining leaves nothing
 * signed, and that the default is to refuse rather than to proceed.
 */

import type { Network } from '@coinbase/agentkit';
import { describe, expect, it, vi } from 'vitest';

import type {
  LombardActionProviderOptions,
  WriteConfirmationRequest,
} from '../confirmation';
import { checkWriteAllowed } from '../confirmation';
import { LombardActionProvider } from '../lombardActionProvider';

function walletOn(networkId: string) {
  return {
    getAddress: () => '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    getNetwork: (): Network => ({ protocolFamily: 'evm', networkId }),
    getBalance: async () => 0n,
    getName: () => 'test',
    nativeTransfer: async () => '0x',
    signMessage: vi.fn().mockResolvedValue('0x'),
    signTypedData: vi.fn().mockResolvedValue('0x'),
    signTransaction: vi.fn().mockResolvedValue('0x'),
    sendTransaction: vi.fn().mockResolvedValue('0x'),
    waitForTransactionReceipt: async () => ({}),
    readContract: async () => 0n,
  };
}

type Wallet = ReturnType<typeof walletOn>;
type WalletArg = Parameters<LombardActionProvider['stakeBtcbToLbtc']>[0];

/** Every write action, with arguments that pass its schema. */
const WRITES = [
  [
    'stake_btcb_to_lbtc',
    (p: LombardActionProvider, w: WalletArg) =>
      p.stakeBtcbToLbtc(w, { amount: '0.1' }),
  ],
  [
    'unstake_lbtc_to_btc',
    (p: LombardActionProvider, w: WalletArg) =>
      p.unstakeLbtc(w, {
        amount: '0.1',
        recipient: 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz',
        outputAsset: 'BTC',
      }),
  ],
  [
    'redeem_lbtc_to_btcb',
    (p: LombardActionProvider, w: WalletArg) =>
      p.redeemLbtcToBtcb(w, { amount: '0.1' }),
  ],
  [
    'deploy_to_earn',
    (p: LombardActionProvider, w: WalletArg) =>
      p.deployToDefi(w, { amount: '0.1' }),
  ],
] as const;

const wallet = () => walletOn('ethereum-mainnet') as unknown as WalletArg;

/** Nothing was asked of the wallet: no signature, no transaction. */
function expectWalletUntouched(w: Wallet) {
  expect(w.signTypedData).not.toHaveBeenCalled();
  expect(w.signMessage).not.toHaveBeenCalled();
  expect(w.sendTransaction).not.toHaveBeenCalled();
}

describe.each(WRITES)('%s', (name, invoke) => {
  it('refuses when no confirmation is configured', async () => {
    const provider = new LombardActionProvider();
    const w = walletOn('ethereum-mainnet');

    const parsed = JSON.parse(
      await invoke(provider, w as unknown as WalletArg),
    );

    expect(parsed).toMatchObject({ success: false, action: name });
    expect(parsed.error).toContain('no confirmation is configured');
    expectWalletUntouched(w);
  });

  it('signs nothing when the confirmation declines', async () => {
    const confirmWrite = vi.fn().mockResolvedValue(false);
    const provider = new LombardActionProvider({ confirmWrite });
    const w = walletOn('ethereum-mainnet');

    const parsed = JSON.parse(
      await invoke(provider, w as unknown as WalletArg),
    );

    expect(confirmWrite).toHaveBeenCalledTimes(1);
    expect(parsed).toMatchObject({ success: false, action: name });
    expect(parsed.error).toContain('was not approved');
    expectWalletUntouched(w);
  });

  it('describes the write to the confirmation', async () => {
    const seen: WriteConfirmationRequest[] = [];
    const provider = new LombardActionProvider({
      confirmWrite: (request) => {
        seen.push(request);
        return false;
      },
    });

    await invoke(provider, wallet());

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      action: name,
      chainId: 1,
      account: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      amount: '0.1',
    });
  });
});

describe('unstake_lbtc_to_btc confirmation', () => {
  // The destination on this route comes straight from a tool argument, so it
  // is the field the operator has to be shown.
  it('names the Bitcoin address the funds would go to', async () => {
    const recipient = 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz';
    const seen: WriteConfirmationRequest[] = [];
    const provider = new LombardActionProvider({
      confirmWrite: (request) => {
        seen.push(request);
        return false;
      },
    });

    await provider.unstakeLbtc(wallet(), {
      amount: '0.25',
      recipient,
      outputAsset: 'BTC',
    });

    expect(seen[0]).toMatchObject({
      recipient,
      assetIn: 'LBTC',
      assetOut: 'BTC',
      amount: '0.25',
    });
  });

  /**
   * The BTC.b route pays the signing account: `redeemToken` is not given a
   * recipient at all, and the action's own success payload says the argument
   * was ignored. Naming it in the prompt would have the operator approve a
   * destination the transaction does not use.
   */
  it('names no recipient on the BTC.b route, which pays the signer', async () => {
    const seen: WriteConfirmationRequest[] = [];
    const provider = new LombardActionProvider({
      confirmWrite: (request) => {
        seen.push(request);
        return false;
      },
    });

    await provider.unstakeLbtc(wallet(), {
      amount: '0.25',
      recipient: '0x00000000000000000000000000000000000000ff',
      outputAsset: 'BTCb',
    });

    expect(seen[0]).toMatchObject({ assetOut: 'BTC.b', amount: '0.25' });
    expect(seen[0].recipient).toBeUndefined();
    expect('recipient' in seen[0]).toBe(false);
  });
});

/**
 * The two options contradict each other, and the way to arrive there is adding
 * `confirmWrite` to a config that already carried `autoApproveWrites: true`.
 * Guessing which one was meant is what would hand back silent auto-approval to
 * someone who thinks they just built a gate.
 */
describe('a contradictory write policy', () => {
  it('is refused at construction rather than at the first transaction', () => {
    expect(
      () =>
        new LombardActionProvider({
          autoApproveWrites: true,
          confirmWrite: () => true,
        }),
    ).toThrow(/mutually exclusive/);
  });

  it('names both options and what to drop', () => {
    let message = '';
    try {
      new LombardActionProvider({
        autoApproveWrites: true,
        confirmWrite: () => true,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('confirmWrite');
    expect(message).toContain('autoApproveWrites');
    expect(message).toContain('Drop autoApproveWrites');
  });

  const coherent: Array<[string, LombardActionProviderOptions]> = [
    ['a confirmation alone', { confirmWrite: (): boolean => true }],
    ['auto-approval alone', { autoApproveWrites: true }],
    ['neither', {}],
    [
      'auto-approval explicitly off, with a confirmation',
      { autoApproveWrites: false, confirmWrite: (): boolean => true },
    ],
  ];

  it.each(coherent)('accepts %s', (_label, options) => {
    expect(() => new LombardActionProvider(options)).not.toThrow();
  });
});

/**
 * The policy on its own. Driven here rather than through an action because an
 * approved write goes on to reach the network, and the unit tier does not.
 */
describe('checkWriteAllowed', () => {
  const request: WriteConfirmationRequest = {
    action: 'deploy_to_earn',
    chainId: 1,
    account: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    amount: '0.1',
  };

  it('allows the write when it is approved', async () => {
    await expect(
      checkWriteAllowed({ confirmWrite: () => true }, request),
    ).resolves.toBeNull();
  });

  it('allows the write under autoApproveWrites without asking', async () => {
    await expect(
      checkWriteAllowed({ autoApproveWrites: true }, request),
    ).resolves.toBeNull();
  });

  /**
   * The constructor refuses this combination, so it should not reach here.
   * The ordering is the second layer, for a policy object assembled without
   * going through it: between asking a confirmation nobody wanted and skipping
   * one somebody wired, the wasted prompt is the cheaper mistake.
   */
  it('prefers the confirmation when both options are set', async () => {
    const confirmWrite = vi.fn().mockResolvedValue(false);

    await expect(
      checkWriteAllowed({ autoApproveWrites: true, confirmWrite }, request),
    ).resolves.toMatchObject({ kind: 'declined' });
    expect(confirmWrite).toHaveBeenCalledTimes(1);
  });

  it('refuses with nothing configured', async () => {
    await expect(checkWriteAllowed({}, request)).resolves.toMatchObject({
      kind: 'unconfigured',
    });
  });

  it('refuses when the confirmation returns false', async () => {
    await expect(
      checkWriteAllowed({ confirmWrite: () => false }, request),
    ).resolves.toMatchObject({ kind: 'declined' });
  });

  // Throwing is a refusal too: an approval flow that fails must not fall
  // through into signing.
  it('propagates a confirmation that throws', async () => {
    await expect(
      checkWriteAllowed(
        {
          confirmWrite: () => {
            throw new Error('approval service unreachable');
          },
        },
        request,
      ),
    ).rejects.toThrow('approval service unreachable');
  });

  it('waits for an asynchronous confirmation', async () => {
    const confirmWrite = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 5),
          ),
      );

    await expect(
      checkWriteAllowed({ confirmWrite }, request),
    ).resolves.toMatchObject({ kind: 'declined' });
  });
});
