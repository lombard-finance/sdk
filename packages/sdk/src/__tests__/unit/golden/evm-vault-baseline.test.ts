/**
 * Golden behavioural baseline for the two EVM vault actions, captured on 5.x.
 *
 * ## Why this file exists
 *
 * These complete the sixteen-class capture, and they are the two the design is
 * most opinionated about:
 *
 * - `EvmDeploy` keeps its name in 6.0.0, because `deploy` survives as a verb.
 *   Its `asset` param was accepted and never read, every call site hardcoding
 *   `Token.LBTC`; A2 fixed that, and this snapshot pins the action-level
 *   behaviour the fix had to leave alone.
 * - `EvmWithdrawVault` becomes `EvmVaultWithdraw`, and its terminal status changes
 *   from `COMPLETED` to `QUEUED`. That is **the one break no compiler catches**,
 *   because `evm.withdraw()` keeps its name. What is recorded here is the
 *   `COMPLETED` a consumer is reading today.
 *
 * Both reach the chain through module-level clients, so the seams are
 * `makePublicClient` and `makeWalletClient` rather than anything on `ctx`.
 *
 * Do not update these snapshots to make a refactor pass. A diff means either the
 * refactor changed observable behaviour, or the change is intended and breaking
 * and belongs in the same commit as a CHANGELOG `### Breaking` entry.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const readContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    multicall: vi.fn(async () => [
      { status: 'success', result: 'LBTC' },
      { status: 'success', result: 8 },
    ]),
    simulateContract: vi.fn(async () => ({ request: {} })),
    waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
  })),
}));
vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract: vi.fn(async () => '0xhash') })),
}));

// Imports below intentionally sit after the vi.mock calls above; the sorter
// already accepts this order, so no disable directive is needed.
import { EvmDeploy } from '../../../chains/evm/actions/deploy/EvmDeploy';
import { EvmWithdrawVault } from '../../../chains/evm/actions/withdraw-vault/EvmWithdrawVault';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

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

async function outcomeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return 'resolved';
  } catch (e) {
    return `threw: ${(e as Error).message.slice(0, 120)}`;
  }
}

describe('golden baseline — the EVM vault actions on 5.x', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A generous allowance and balance, so prepare() takes the no-approval
    // path. The approval path is a separate branch and is recorded separately.
    readContract.mockResolvedValue(10n ** 20n);
  });

  it('EvmDeploy: prepare with a covering allowance, and the ignored asset param', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmDeploy(h.ctx, {
      // BTC.b is deliberate. Before the A2 fix the class accepted it and then
      // deposited LBTC, because params.asset was read zero times. The observable
      // action behaviour is unchanged by the fix, which is why the dedicated
      // test in unit/evm/EvmDeployAssetParam covers the token lookup instead.
      asset: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      protocol: DeployProtocol.Veda,
      recipient: EVM_RECIPIENT,
    });
    h.observe(action);

    const outcome = await outcomeOf(() =>
      action.prepare({ amount: AMOUNT, protocol: DeployProtocol.Veda }),
    );

    expect({
      outcome,
      assetPassed: AssetId.BTCb,
      needsApproval: action.needsApproval,
      statuses: h.statuses,
      progress: progressShape(h.progress),
    }).toMatchSnapshot();
  });

  it('EvmDeploy: prepare when the allowance does not cover — the approval branch', async () => {
    readContract.mockResolvedValue(0n);
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmDeploy(h.ctx, {
      asset: AssetId.LBTC,
      sourceChain: Chain.ETHEREUM,
      protocol: DeployProtocol.Veda,
      recipient: EVM_RECIPIENT,
    });
    h.observe(action);

    const outcome = await outcomeOf(() =>
      action.prepare({ amount: AMOUNT, protocol: DeployProtocol.Veda }),
    );

    expect({
      outcome,
      needsApproval: action.needsApproval,
      statuses: h.statuses,
      progress: progressShape(h.progress),
    }).toMatchSnapshot();
  });

  it('EvmWithdrawVault: the vault exit whose terminal COMPLETED becomes QUEUED', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawVault(h.ctx, {
      protocol: DeployProtocol.Veda,
      sourceChain: Chain.ETHEREUM,
      recipient: EVM_RECIPIENT,
    });
    h.observe(action);

    const outcome = await outcomeOf(() => action.prepare({ amount: AMOUNT }));

    expect({
      outcome,
      needsApproval: action.needsApproval,
      statuses: h.statuses,
      progress: progressShape(h.progress),
    }).toMatchSnapshot();
  });

  it('EvmWithdrawVault: refuses on a chain with no Veda vault', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawVault(h.ctx, {
      protocol: DeployProtocol.Veda,
      sourceChain: Chain.AVALANCHE,
      recipient: EVM_RECIPIENT,
    });
    h.observe(action);

    const outcome = await outcomeOf(() => action.prepare({ amount: AMOUNT }));

    expect({ outcome, statuses: h.statuses }).toMatchSnapshot();
  });
});
