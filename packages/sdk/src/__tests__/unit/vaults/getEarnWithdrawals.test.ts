/**
 * `getEarnWithdrawals` reads the BoringQueue history and maps it onto
 * `EarnWithdrawal`.
 *
 * The fixtures keep the route's shape as it answers in production: open and
 * expired items carry the request at the top level, fulfilled and cancelled
 * items nest it under `Request` beside a `Fulfillment` or `Cancellation`,
 * hashes come without `0x`, and the on-chain request struct is `metadata`.
 * Only axios is mocked, so the URL asserted is the one that would be sent.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn, getAssetInfo } = vi.hoisted(() => ({
  axiosFn: vi.fn(),
  getAssetInfo: vi.fn(),
}));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));
vi.mock('../../../tokens/tokens', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getAssetInfo,
}));

import { ChainId } from '../../../common/chains';
import { getEarnWithdrawals } from '../../../vaults/lib/ops/get-vault-withdrawals';

const ACCOUNT = '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1';
const VAULT = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
const LBTC = '0x8236a87084f8B84306f72007F36F2618A5634494';

const metadata = (
  nonce: number,
  shares: number,
  assets: number,
  t: number,
) => ({
  amountOfAssets: assets,
  amountOfShares: shares,
  assetOut: LBTC,
  creationTime: t,
  nonce,
  secondsToDeadline: 1728000,
  secondsToMaturity: 3600,
  user: ACCOUNT,
});

const request = (
  nonce: number,
  shares: number,
  assets: number,
  t: number,
  hash: string,
) => ({
  amount: shares,
  blockNumber: 26370000 + nonce,
  metadata: metadata(nonce, shares, assets, t),
  offerToken: VAULT.toLowerCase(),
  timestamp: t,
  transaction_hash: hash,
  user: ACCOUNT,
  wantToken: LBTC,
  wantTokenDecimals: 8,
  wantTokenSymbol: 'LBTC',
});

const OPEN_HASH = '56d1'.padEnd(64, 'a');
const EXPIRED_HASH = '77e1'.padEnd(64, 'b');
const FULFILLED_HASH = '2578'.padEnd(64, 'c');
const PAYOUT_HASH = '5bdf'.padEnd(64, 'd');
const CANCELLED_HASH = '165f'.padEnd(64, 'e');
const CANCEL_TX_HASH = '0704'.padEnd(64, 'f');

const PAYLOAD = {
  open_requests: [
    {
      ...request(402, 117839, 120345, 1794141491, OPEN_HASH),
      // Sent on open items only; not read.
      wantTokenAmount: '0.0012097923611123311',
    },
  ],
  expired_requests: [request(300, 50000, 51000, 1790000000, EXPIRED_HASH)],
  fulfilled_requests: [
    {
      Request: request(327, 30658, 31299, 1793046275, FULFILLED_HASH),
      Fulfillment: {
        block_number: 26352636,
        timestamp: 1793929907,
        transaction_hash: PAYOUT_HASH,
      },
    },
  ],
  cancelled_requests: [
    {
      Request: request(407, 10001, 10212, 1794223475, CANCELLED_HASH),
      Cancellation: {
        block_number: 26377292,
        timestamp: 1794226775,
        transaction_hash: CANCEL_TX_HASH,
      },
    },
  ],
};

function answer(data: unknown) {
  axiosFn.mockResolvedValue({ status: 200, headers: {}, data });
}

beforeEach(() => {
  axiosFn.mockReset();
  getAssetInfo.mockReset();
  getAssetInfo.mockRejectedValue(new Error('the chain should not be asked'));
});

describe('getEarnWithdrawals', () => {
  it('reads the boring-queue route, not the AtomicQueue one', async () => {
    answer(PAYLOAD);

    await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(axiosFn).toHaveBeenCalledTimes(1);
    const { url } = axiosFn.mock.calls[0][0] as { url: string };
    expect(url).toBe(
      `https://bff.prod.lombard-fi.com/sevenseas-api/boring-queue/ethereum/${VAULT}/${ACCOUNT}`,
    );
    expect(url).not.toContain('withdraw-requests');
  });

  it.each([
    ['base', ChainId.base],
    ['bnb', ChainId.binanceSmartChain],
  ])('names the %s network in the path', async (network, chainId) => {
    answer(PAYLOAD);

    await getEarnWithdrawals({ account: ACCOUNT, chainId, env: Env.prod });

    const { url } = axiosFn.mock.calls[0][0] as { url: string };
    expect(url).toContain(`/boring-queue/${network}/`);
  });

  it('maps a flat open request, with the struct a cancel needs', async () => {
    answer(PAYLOAD);

    const { open } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(open).toHaveLength(1);
    const [w] = open;
    expect(w.txHash).toBe(`0x${OPEN_HASH}`);
    expect(w.shareAmount.toFixed()).toBe('0.00117839');
    // Nothing is paid until the request is fulfilled.
    expect(w.amount).toBeUndefined();
    // Locked assets over shares: 120345 / 117839.
    expect(w.minPrice?.toFixed(8)).toBe('1.02126630');
    // creationTime + secondsToMaturity + secondsToDeadline.
    expect(w.deadline).toBe(1794141491 + 3600 + 1728000);
    expect(w.timestamp).toBe(1794141491);
    expect(w.blockNumber).toBe(26370402);
    expect(w.chainId).toBe(ChainId.ethereum);
    expect(w.toAddress).toBe(ACCOUNT);
    expect(w.token).toEqual({ address: LBTC, decimals: 8, symbol: 'LBTC' });
    expect(w.request).toEqual(metadata(402, 117839, 120345, 1794141491));
  });

  it('maps a nested fulfilled request with its payout', async () => {
    answer(PAYLOAD);

    const { fulfilled } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(fulfilled).toHaveLength(1);
    const [w] = fulfilled;
    expect(w.txHash).toBe(`0x${FULFILLED_HASH}`);
    expect(w.shareAmount.toFixed()).toBe('0.00030658');
    expect(w.amount?.toFixed()).toBe('0.00031299');
    expect(w.fulfilledTxHash).toBe(`0x${PAYOUT_HASH}`);
    expect(w.fulfilledTimestamp).toBe(1793929907);
    expect(w.fulfilledBlockNumber).toBe(26352636);
    expect(w.cancelledTxHash).toBeUndefined();
  });

  it('maps a nested cancelled request with its cancellation', async () => {
    answer(PAYLOAD);

    const { cancelled } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(cancelled).toHaveLength(1);
    const [w] = cancelled;
    expect(w.txHash).toBe(`0x${CANCELLED_HASH}`);
    expect(w.shareAmount.toFixed()).toBe('0.00010001');
    expect(w.amount).toBeUndefined();
    expect(w.cancelledTxHash).toBe(`0x${CANCEL_TX_HASH}`);
    expect(w.cancelledTimestamp).toBe(1794226775);
    expect(w.cancelledBlockNumber).toBe(26377292);
    expect(w.fulfilledTxHash).toBeUndefined();
  });

  it('keeps the struct on an expired request, whose shares wait for a cancel', async () => {
    answer(PAYLOAD);

    const { expired } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(expired).toHaveLength(1);
    expect(expired[0].request?.nonce).toBe(300);
    expect(expired[0].deadline).toBe(1790000000 + 3600 + 1728000);
  });

  it('accepts the answer wrapped in Response, and missing lists as empty', async () => {
    answer({ Response: { open_requests: PAYLOAD.open_requests } });

    const result = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(result.open).toHaveLength(1);
    expect(result.fulfilled).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(result.expired).toEqual([]);
    expect(result.failures).toEqual([]);
  });

  it('asks the chain about an asset only when the route does not describe it', async () => {
    const {
      wantTokenDecimals: _d,
      wantTokenSymbol: _s,
      ...bare
    } = PAYLOAD.open_requests[0];
    answer({ open_requests: [bare] });
    getAssetInfo.mockReset();
    getAssetInfo.mockResolvedValue({
      address: LBTC,
      decimals: 8,
      symbol: 'LBTC',
      abi: [],
    });

    const { open } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(getAssetInfo).toHaveBeenCalledTimes(1);
    expect(open[0].token).toEqual({
      address: LBTC,
      decimals: 8,
      symbol: 'LBTC',
    });
    expect(open[0].minPrice?.toFixed(8)).toBe('1.02126630');
  });

  it('orders newest first', async () => {
    answer({
      open_requests: [
        request(1, 100, 100, 1000, '01'.padEnd(64, '0')),
        request(2, 100, 100, 3000, '02'.padEnd(64, '0')),
        request(3, 100, 100, 2000, '03'.padEnd(64, '0')),
      ],
    });

    const { open } = await getEarnWithdrawals({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(open.map((w) => w.timestamp)).toEqual([3000, 2000, 1000]);
  });
});
