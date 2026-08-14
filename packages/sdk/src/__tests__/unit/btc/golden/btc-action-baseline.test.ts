/**
 * Golden behavioural baseline for the four BTC action classes, captured on 5.x.
 *
 * ## Why this file exists
 *
 * The consolidation roadmap collapses `BtcStake`, `BtcDeposit`,
 * `BtcStakeAndDeploy` and `BtcDepositAndDeploy` into a single asset-parameterised
 * `BtcDeposit`, keeping the old names as delegating aliases. The guarantee sold
 * to integrators is that an alias behaves identically to its 5.x original.
 *
 * That guarantee **cannot be verified after the fact** — once the merge lands,
 * the reference behaviour no longer exists. So it is recorded here, now, while
 * 5.x is still the code: for each class, the ordered status transitions, the
 * ordered service calls, and the emitted progress shape.
 *
 * ## How to use it during the migration
 *
 * Do not update these snapshots to make a refactor pass. A diff here means one
 * of two things:
 *
 *   1. The refactor changed observable behaviour — fix the refactor, or
 *   2. The change is intended and breaking — then update the snapshot **in the
 *      same commit as a CHANGELOG `### Breaking` entry** explaining it.
 *
 * These are also the first tests in the repository to construct a BTC action at
 * all; the eleven sibling files under `__tests__/unit/btc/` assert on object
 * literals and never import a class.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `restoreStakeAndBakeSignature` reaches the backend through a **module-level**
 * import rather than `ctx.api`, so a context-only harness cannot influence it
 * and the resume path silently falls through to re-authorisation. Mocking the
 * module is the only way to capture the resume branch — a concrete instance of
 * why the harness contract needs module seams and not just service stubs.
 */
vi.mock('../../../../api-functions/getUserStakeAndBakeSignature', () => ({
  getUserStakeAndBakeSignature: vi.fn(),
}));

// eslint-disable-next-line simple-import-sort/imports -- must follow the vi.mock above
import { getUserStakeAndBakeSignature } from '../../../../api-functions/getUserStakeAndBakeSignature';

import { BtcDeposit } from '../../../../chains/btc/actions/deposit/BtcDeposit';
import { BtcDepositAndDeploy } from '../../../../chains/btc/actions/depositAndDeploy/BtcDepositAndDeploy';
import { BtcStake } from '../../../../chains/btc/actions/stake/BtcStake';
import { BtcStakeAndDeploy } from '../../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy';
import { AssetId, Chain } from '../../../../core';
import { DefiProtocol } from '../../../../defi';
import { createBtcActionHarness } from '../../../harness/createBtcActionHarness';

const AMOUNT = '0.001';
const RECIPIENT = '0x1111111111111111111111111111111111111111';

/** Normalise a progress payload to just its shape, so addresses and hashes
 *  don't make the snapshot brittle. The *keys* are the contract. */
function progressShape(payloads: unknown[]): string[] {
  return payloads.map((p) => {
    const o = p as { status?: string; steps?: Record<string, string> };
    const steps = o.steps ? Object.keys(o.steps).sort().join(',') : '—';
    return `${o.status ?? '?'} [${steps}]`;
  });
}

const mockRestore = vi.mocked(getUserStakeAndBakeSignature);

describe('golden baseline — BTC actions on 5.x', () => {
  beforeEach(() => {
    // Default: no stored signature on the server.
    mockRestore.mockReset();
    mockRestore.mockRejectedValue(new Error('not found'));
  });

  describe('BtcStake (native BTC → LBTC)', () => {
    it('records its prepare lifecycle', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcStake(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect({
        statusAfterPrepare: action.status,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });
  });

  describe('BtcDeposit (native BTC → BTC.b)', () => {
    it('records its prepare lifecycle', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDeposit(h.ctx, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
        sourceChain: Chain.BITCOIN_MAINNET,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect({
        statusAfterPrepare: action.status,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });
  });

  describe('BtcStakeAndDeploy (native BTC → LBTC → Veda vault)', () => {
    it('records its prepare lifecycle with no existing deposit', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcStakeAndDeploy(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
        protocol: DefiProtocol.Veda,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect({
        statusAfterPrepare: action.status,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });

    it('records the resume path when a deposit address already exists', async () => {
      // This is the branch the consolidation makes load-bearing: after the
      // merge it is the only resume implementation. Capturing it now is the
      // whole point of this file.
      const h = createBtcActionHarness({
        env: Env.prod,
        api: {
          getDepositAddress: async () =>
            'tb1qexistingdeposit0000000000000000000000',
        },
      });
      // A stored signature that is still valid — the branch that reaches
      // ADDRESS_READY, which is where the resume bugs live.
      mockRestore.mockResolvedValue({
        signature: '0xstoredsignature',
        expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
      } as Awaited<ReturnType<typeof getUserStakeAndBakeSignature>>);

      const action = new BtcStakeAndDeploy(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
        protocol: DefiProtocol.Veda,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect({
        statusAfterPrepare: action.status,
        depositAddress: action.depositAddress,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });
  });

  describe('BtcDepositAndDeploy (native BTC → BTC.b → Silo vault)', () => {
    it('records what happens today on testnet', async () => {
      // Documented as never completing on any environment. Whatever it does —
      // including throwing — is recorded so the removal is evidenced rather
      // than asserted.
      const h = createBtcActionHarness({ env: Env.testnet });
      let outcome: string;
      try {
        const action = new BtcDepositAndDeploy(h.ctx, {
          assetOut: AssetId.BTCb,
          destChain: Chain.AVALANCHE_FUJI,
          sourceChain: Chain.BITCOIN_SIGNET,
          protocol: DefiProtocol.Silo,
        });
        h.observe(action);
        await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
        outcome = `prepared: ${action.status}`;
      } catch (error) {
        outcome = `threw: ${(error as Error).constructor.name}`;
      }

      expect({
        outcome,
        calls: h.calls.sequence(),
      }).toMatchSnapshot();
    });
  });
});
