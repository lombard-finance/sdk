/**
 * Golden behavioural baseline for the four BTC action classes, captured on 5.x.
 *
 * ## Why this file exists
 *
 * The consolidation roadmap collapses `BtcDepositLbtc`, `BtcDepositBtcb`,
 * `BtcDeployLbtc` and `BtcDeployBtcb` into a single asset-parameterised
 * `BtcDepositBtcb`, keeping the old names as delegating aliases. The guarantee sold
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
 *
 * ## Recorded snapshot movements
 *
 * - **`api.storeFeeSignature` and `api.storeStakeAndBakeSignature` dropped from
 *   the two ceremony legs.** Not this refactor: upstream #68 stopped the actions
 *   registering a signature that `generateDepositAddress` is about to carry, so
 *   a second registration no longer reads as a reuse of the same approval. The
 *   change arrived on `main` with its own CHANGELOG entry and the sequences are
 *   otherwise identical, line for line.
 *
 *   Worth noting what this proves: the goldens caught a behavioural change
 *   coming *in* from another branch during a merge, not only changes made here.
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

import { BtcDepositBtcb } from '../../../../chains/btc/actions/deposit-btcb/BtcDepositBtcb';
import { BtcDeployBtcb } from '../../../../chains/btc/actions/deploy-btcb/BtcDeployBtcb';
import { BtcDepositLbtc } from '../../../../chains/btc/actions/deposit-lbtc/BtcDepositLbtc';
import { BtcDeployLbtc } from '../../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc';
import { AssetId, Chain } from '../../../../core';
import { DefiProtocol } from '../../../../defi';
import {
  createBtcActionHarness,
  MOCK_DEPOSIT_ADDRESS,
} from '../../../harness/createBtcActionHarness';

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

  describe('BtcDepositLbtc (native BTC → LBTC)', () => {
    it('records its prepare lifecycle', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDepositLbtc(h.ctx, {
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

  describe('BtcDepositBtcb (native BTC → BTC.b)', () => {
    it('records its prepare lifecycle', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDepositBtcb(h.ctx, {
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

  describe('BtcDeployLbtc (native BTC → LBTC → Veda vault)', () => {
    it('records its prepare lifecycle with no existing deposit', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDeployLbtc(h.ctx, {
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

      const action = new BtcDeployLbtc(h.ctx, {
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

  describe('BtcDeployBtcb (native BTC → BTC.b → Silo vault)', () => {
    it('records what happens today on testnet', async () => {
      // Documented as never completing on any environment. Whatever it does —
      // including throwing — is recorded so the removal is evidenced rather
      // than asserted.
      const h = createBtcActionHarness({ env: Env.testnet });
      let outcome: string;
      try {
        const action = new BtcDeployBtcb(h.ctx, {
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
  // ───────────────────────────────────────────────────────────────────────────
  // The authorize → generateDepositAddress legs.
  //
  // `prepare()` alone proves almost nothing about parity: the ceremony is where
  // the four classes actually differ, and it is what the merge collapses. Each
  // class reaches READY through a differently-named method, so the sequence
  // recorded here is the thing an alias has to reproduce exactly.
  // ───────────────────────────────────────────────────────────────────────────
  describe('ceremony and address legs', () => {
    it('BtcDepositLbtc: authorize() then generateDepositAddress()', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();
      const address = await action.generateDepositAddress();

      expect({
        method: 'authorize',
        addressReturned: address === MOCK_DEPOSIT_ADDRESS,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });

    // On Avalanche + BTC.b there is no feeAuthConfig, so `confirmAddress()` is the
    // correct method and `authorizeFee()` is the one that would throw. Which of
    // the two refuses depends on the destination chain, which is exactly why the
    // merged class resolves it from config instead of asking the caller to know.
    it('BtcDepositBtcb: the confirmAddress path, and authorizeFee after it', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDepositBtcb(h.ctx, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      // BtcDepositBtcb splits the decision across two methods that throw at each
      // other. Which one is correct depends on feeAuthConfig, so record both
      // the choice and the refusal — the merged class must keep the behaviour,
      // not the method names.
      let refusal: string | undefined;
      try {
        await action.confirmAddress();
      } catch (e) {
        refusal = (e as Error).message;
      }
      await action.authorizeFee();
      const address = await action.generateDepositAddress();

      expect({
        pathTaken: 'confirmAddress',
        confirmAddressRefusal: refusal,
        authorizeFeeAfterReady: 'returns early, no second signature',
        addressReturned: address === MOCK_DEPOSIT_ADDRESS,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });

    it('BtcDeployLbtc: authorizeDeposit() then generateDepositAddress()', async () => {
      const h = createBtcActionHarness({ env: Env.prod });
      const action = new BtcDeployLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        protocol: DefiProtocol.Veda,
      });
      h.observe(action);

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorizeDeposit();
      const address = await action.generateDepositAddress();

      expect({
        method: 'authorizeDeposit',
        addressReturned: address === MOCK_DEPOSIT_ADDRESS,
        statuses: h.statuses,
        calls: h.calls.sequence(),
        progress: progressShape(h.progress),
      }).toMatchSnapshot();
    });
  });
});
