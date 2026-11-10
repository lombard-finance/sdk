/**
 * The minting fee a route signs is bounded against the deposit it is for.
 *
 * Each action reads the fee from the chain in `prepare()` and signs it in its
 * fee ceremony. The read is the asset router's answer over an RPC the SDK
 * does not control, so the ceremony refuses a fee of zero, one above the
 * absolute cap, and one above half the deposit, before the wallet is asked.
 * `signNetworkFee` applies the first two again whatever the caller; these pin
 * the deposit-relative bound to every route that signs a fee.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The token lookup would otherwise read the asset router over a real RPC.
vi.mock('../../../tokens/tokens', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getTokenContractInfo: vi.fn(async () => ({
    address: '0x8236a87084f8b84306f72007f36f2618a5634494',
    abi: [],
    chainId: 1,
  })),
}));
vi.mock('../../../chains/evm/shared/feeAuth', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../chains/evm/shared/feeAuth')
  >()),
  checkFeeAuthorization: vi.fn(),
  authorizeFee: vi.fn(async () => ({ signature: '0xsig', typedData: '{}' })),
}));
vi.mock('../../../contract-functions/approveToken', () => ({
  approveToken: vi.fn(),
  getTokenAllowance: vi.fn(async () => {
    const { default: BN } = await import('bignumber.js');
    return new BN('1000000000000');
  }),
}));

import { BtcDepositBtcb } from '../../../chains/btc/actions/deposit-btcb/BtcDepositBtcb';
import { BtcDepositLbtc } from '../../../chains/btc/actions/deposit-lbtc/BtcDepositLbtc';
import { EvmDepositBtcb } from '../../../chains/evm/actions/deposit-btcb/EvmDepositBtcb';
import { EvmWithdrawLbtc } from '../../../chains/evm/actions/withdraw-lbtc/EvmWithdrawLbtc';
import {
  authorizeFee,
  checkFeeAuthorization,
} from '../../../chains/evm/shared/feeAuth';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import {
  BtcActionStatus,
  EvmOperationStatus,
} from '../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../shared/context/types';
import { createBtcActionHarness } from '../../harness/createBtcActionHarness';

const RECIPIENT = '0x1111111111111111111111111111111111111111';

describe.each([
  [
    'BtcDepositLbtc',
    (h: ReturnType<typeof createBtcActionHarness>) =>
      new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
      }),
  ],
  [
    'BtcDepositBtcb',
    (h: ReturnType<typeof createBtcActionHarness>) =>
      new BtcDepositBtcb(h.ctx, {
        assetOut: AssetId.BTCb,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
      }),
  ],
])('%s fee authorisation', (_name, build) => {
  /** Prepare 0.001 BTC (100000 satoshis) with the chain answering `feeBtc`. */
  async function prepared(feeBtc: string) {
    const h = createBtcActionHarness({
      env: Env.prod,
      api: { getFeeSignature: async () => ({ hasSignature: false }) },
      evm: { getMintingFee: async () => feeBtc },
    });
    const action = build(h);
    await action.prepare({ amount: '0.001', recipient: RECIPIENT });
    expect(action.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    return { h, action };
  }

  it.each([
    ['zero', '0'],
    ['one BTC', '1'],
    ['more than half the deposit', '0.00050001'],
  ])('refuses a fee of %s without asking the wallet', async (_label, fee) => {
    const { h, action } = await prepared(fee);

    await expect(action.authorize()).rejects.toThrow(/minting fee/i);
    expect(h.calls.of('evm', 'signNetworkFee')).toHaveLength(0);
  });

  it('signs the mainnet fee in satoshis', async () => {
    const { h, action } = await prepared('0.00000473');

    await action.authorize();

    const [params] = h.calls.of('evm', 'signNetworkFee')[0] as [
      { fee: string },
    ];
    expect(params.fee).toBe('473');
  });
});

describe('EVM fee authorisation', () => {
  const provider = {
    request: vi.fn(async ({ method }: { method: string }) =>
      method === 'eth_accounts' ? [RECIPIENT] : [],
    ),
  };
  const ctx: EvmCoreContext = {
    env: Env.prod,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => provider,
    evm: {} as EvmCoreContext['evm'],
  };

  function feeOnChain(feeInSatoshis: bigint) {
    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: true,
      hasValidSignature: false,
      feeInSatoshis,
      feeFormatted: null,
      expirationDate: null,
    });
  }

  const routes = [
    [
      'EvmDepositBtcb',
      async () => {
        const action = new EvmDepositBtcb(ctx, {
          assetIn: AssetId.BTCb,
          assetOut: AssetId.LBTC,
          sourceChain: Chain.ETHEREUM,
          destChain: Chain.ETHEREUM,
        });
        await action.prepare({ amount: '0.001' });
        return action;
      },
    ],
    [
      'EvmWithdrawLbtc',
      async () => {
        const action = new EvmWithdrawLbtc(ctx, {
          assetIn: AssetId.LBTC,
          assetOut: AssetId.BTCb,
          sourceChain: Chain.ETHEREUM,
          destChain: Chain.ETHEREUM,
        });
        await action.prepare({ amount: '0.001', recipient: RECIPIENT });
        return action;
      },
    ],
  ] as const;

  beforeEach(() => vi.mocked(authorizeFee).mockClear());

  describe.each(routes)('%s', (_name, prepare) => {
    it.each([
      ['above the absolute cap', 100_001n],
      ['more than half the 100000 satoshi amount', 50_001n],
    ])('refuses a fee %s without signing', async (_label, fee) => {
      feeOnChain(fee);
      const action = await prepare();
      expect(action.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);

      await expect(action.authorizeFee()).rejects.toThrow(/minting fee/i);
      expect(authorizeFee).not.toHaveBeenCalled();
    });

    it('signs the mainnet fee', async () => {
      feeOnChain(473n);
      const action = await prepare();

      await action.authorizeFee();

      expect(authorizeFee).toHaveBeenCalledWith(
        expect.objectContaining({ feeInSatoshis: 473n }),
      );
    });
  });
});
