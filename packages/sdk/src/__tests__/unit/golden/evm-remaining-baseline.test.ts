/**
 * Golden behavioural baseline for the remaining EVM actions, captured on 5.x.
 *
 * ## Why this file exists
 *
 * These four complete the sixteen-class capture. Between them they carry the
 * three riskiest renames in the release:
 *
 * - `EvmDepositBtcb` → `EvmClaim`. It is the other half of a 2→1 merge in the design
 *   as first drafted; `deploy` surviving as a verb means it is now a plain
 *   rename, but its two-ceremony prepare (`approve` *and* `authorizeFee`) is
 *   what the collapsed `authorize()` has to reproduce.
 * - `EvmClaim` → `EvmClaim`. **The one method whose meaning is reassigned**:
 *   `evm.deposit()` claims a notarised deposit in 5.x and mints in 6.0.0, so
 *   what is recorded here is what the *old* name did.
 * - `EvmCancelWithdraw` keeps its name, so its snapshot is a pure regression net.
 *
 * Do not update these snapshots to make a refactor pass. A diff means either the
 * refactor changed observable behaviour, or the change is intended and breaking
 * and belongs in the same commit as a CHANGELOG `### Breaking` entry.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../contract-functions', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  claimLBTC: vi.fn(),
  depositToken: vi.fn(),
}));
vi.mock('../../../contract-functions/deposit', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  depositToken: vi.fn(),
}));
vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    // `retrieveTokenProperties` reads symbol and decimals through multicall,
    // so a client without it fails before the action's own logic runs.
    multicall: vi.fn(async () => [
      { status: 'success', result: 'BTC.b' },
      { status: 'success', result: 8 },
    ]),
    readContract: vi.fn(async () => 0n),
    simulateContract: vi.fn(async () => ({ request: {} })),
    waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
  })),
}));
vi.mock('../../../chains/evm/shared/feeAuth', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  checkFeeAuthorization: vi.fn(),
}));

// Imports below intentionally sit after the vi.mock calls above; the sorter
// already accepts this order, so no disable directive is needed.
import { EvmClaim } from '../../../chains/evm/actions/claim/EvmClaim';
import { EvmDepositBtcb } from '../../../chains/evm/actions/deposit-btcb/EvmDepositBtcb';
import { EvmCancelWithdraw } from '../../../chains/evm/actions/withdraw-vault/EvmCancelWithdraw';
import { checkFeeAuthorization } from '../../../chains/evm/shared/feeAuth';
import { claimLBTC } from '../../../contract-functions';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import {
  createChainActionHarness,
  MOCK_TX_HASH,
} from '../../harness/createChainActionHarness';

const AMOUNT = '0.001';
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

/** Record what a lifecycle did, or why it refused. A refusal is behaviour too,
 *  and for these classes it is often the *only* behaviour reachable without a
 *  live chain — so it is captured rather than skipped. */
async function outcomeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return 'resolved';
  } catch (e) {
    return `threw: ${(e as Error).message.slice(0, 120)}`;
  }
}

describe('golden baseline — the remaining EVM actions on 5.x', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimLBTC).mockResolvedValue(MOCK_TX_HASH as never);
    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: undefined,
      feeFormatted: undefined,
      expirationDate: undefined,
    } as never);
  });

  it('EvmDepositBtcb (BTC.b → LBTC) records its prepare lifecycle', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmDepositBtcb(h.ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE,
      destChain: Chain.AVALANCHE,
    });
    h.observe(action);

    const outcome = await outcomeOf(() => action.prepare({ amount: AMOUNT }));

    expect({
      outcome,
      statuses: h.statuses,
      calls: h.calls.sequence(),
      progress: progressShape(h.progress),
      // The two-ceremony shape the collapsed authorize() must reproduce.
      needsApproval: action.needsApproval,
      feeAuthRequiresAuth: action.feeAuth.requiresAuth,
    }).toMatchSnapshot();
  });

  it('EvmClaim — the CLAIM action, which 6.0.0 renames to EvmClaim', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmClaim(h.ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.ETHEREUM,
    });
    h.observe(action);

    await action.prepare({ amount: AMOUNT, recipient: EVM_RECIPIENT });

    // execute() without claim data is the state a consumer who upgrades and
    // keeps calling evm.deposit() lands in. Recording it is the whole point:
    // it must throw rather than mint.
    const withoutClaimData = await outcomeOf(() => action.execute());

    action.setClaimData('0xdata', '0xproof');
    const withClaimData = await outcomeOf(() => action.execute());

    expect({
      withoutClaimData,
      withClaimData,
      statuses: h.statuses,
      progress: progressShape(h.progress),
      claimLBTCCalls: vi.mocked(claimLBTC).mock.calls.length,
    }).toMatchSnapshot();
  });

  it('EvmCancelWithdraw keeps its name, so this is a pure regression net', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmCancelWithdraw(h.ctx, {
      protocol: DeployProtocol.Veda,
      chain: Chain.ETHEREUM,
    });
    h.observe(action);

    const outcome = await outcomeOf(() => action.prepare());

    expect({
      outcome,
      statuses: h.statuses,
      progress: progressShape(h.progress),
    }).toMatchSnapshot();
  });
});
