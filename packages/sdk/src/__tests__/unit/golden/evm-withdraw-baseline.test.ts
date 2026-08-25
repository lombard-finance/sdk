/**
 * Golden behavioural baseline for the EVM 2→1 merge pair, captured on 5.x.
 *
 * ## Why this file exists
 *
 * 6.0.0 merges `EvmWithdrawLbtc` and `EvmWithdrawBtcb` into one `EvmWithdrawVault`, reached
 * through `evm.withdraw()`, keeping both old names as delegating aliases. The
 * design's argument for the merge is that both call `redeemToken`, both use
 * `steps {burning, releasing}`, both use `EvmOperationStatus`, and the only
 * difference is the `(tokenIn, tokenOut)` pair.
 *
 * That is an argument, not a proof, and the reference behaviour disappears once
 * the merge lands. What is captured here is the part the argument does not
 * cover: `EvmWithdrawLbtc` dispatches on `assetOut`, and its terminal `releasing`
 * step differs between the two branches —
 *
 *     releasing: isBtcbOutput ? COMPLETE : PENDING
 *
 * so the same class reports two different terminal shapes. Both are recorded,
 * because the merged class has to keep whichever the design settles on and the
 * diff has to be visible when it does not.
 *
 * The module seam is `redeemToken`: these actions reach the contract layer
 * through a module-level import rather than `ctx`, so a context-only harness
 * cannot observe the call. Mocking the module is the only way to record it.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../contract-functions', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  redeemToken: vi.fn(),
}));
vi.mock('../../../chains/evm/shared/feeAuth', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  checkFeeAuthorization: vi.fn(),
}));

// Imports below intentionally sit after the vi.mock calls above; the sorter
// already accepts this order, so no disable directive is needed.
import { EvmWithdrawBtcb } from '../../../chains/evm/actions/withdraw-btcb/EvmWithdrawBtcb';
import { EvmWithdrawLbtc } from '../../../chains/evm/actions/withdraw-lbtc/EvmWithdrawLbtc';
import { checkFeeAuthorization } from '../../../chains/evm/shared/feeAuth';
import { redeemToken } from '../../../contract-functions';
import { AssetId, Chain } from '../../../core';
import {
  createChainActionHarness,
  MOCK_TX_HASH,
} from '../../harness/createChainActionHarness';

const AMOUNT = '0.001';
const BTC_RECIPIENT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const EVM_RECIPIENT = '0x2222222222222222222222222222222222222222';

function progressShape(payloads: unknown[]): string[] {
  return payloads.map((p) => {
    const o = p as { status?: string; steps?: Record<string, string> };
    const steps = o.steps
      ? Object.entries(o.steps)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
      : '—';
    return `${o.status ?? '?'} [${steps}]`;
  });
}

const mockRedeem = vi.mocked(redeemToken);
const mockFeeAuth = vi.mocked(checkFeeAuthorization);

describe('golden baseline — the EVM withdraw merge pair on 5.x', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedeem.mockResolvedValue(MOCK_TX_HASH as never);
    // No fee authorization required: the subsidized path, which is the one
    // both classes share and therefore the one the merge must preserve.
    mockFeeAuth.mockResolvedValue({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: undefined,
      feeFormatted: undefined,
      expirationDate: undefined,
    } as never);
  });

  it('EvmWithdrawLbtc (LBTC → BTC): terminal releasing is PENDING', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawLbtc(h.ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: BTC_RECIPIENT });
    const result = await action.execute();

    expect({
      statuses: h.statuses,
      progress: progressShape(h.progress),
      redeemTokenCalls: mockRedeem.mock.calls.length,
      resultKeys: Object.keys(result).sort(),
    }).toMatchSnapshot();
  });

  it('EvmWithdrawLbtc (LBTC → BTC.b): terminal releasing is COMPLETE — the other branch', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawLbtc(h.ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.ETHEREUM,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: EVM_RECIPIENT });
    const result = await action.execute();

    expect({
      statuses: h.statuses,
      progress: progressShape(h.progress),
      redeemTokenCalls: mockRedeem.mock.calls.length,
      resultKeys: Object.keys(result).sort(),
    }).toMatchSnapshot();
  });

  it('EvmWithdrawBtcb (BTC.b → BTC) records prepare → execute', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawBtcb(h.ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.AVALANCHE,
      destChain: Chain.BITCOIN_MAINNET,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: BTC_RECIPIENT });
    const result = await action.execute();

    expect({
      statuses: h.statuses,
      progress: progressShape(h.progress),
      redeemTokenCalls: mockRedeem.mock.calls.length,
      resultKeys: Object.keys(result).sort(),
    }).toMatchSnapshot();
  });
});
