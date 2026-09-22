/**
 * The status an authorization ceremony reports when a deposit address is
 * already held.
 *
 * The resume path restores a deposit address in `prepare()` and then, if the
 * authorization has lapsed, asks for it again. `authorize()` resolved to READY
 * unconditionally, and READY means "authorized, address still to generate" —
 * so a consumer reading the status offered to generate an address it was
 * displaying on the same screen. The address was never at risk: the SDK
 * returned the held one without a network call. Only the reported state
 * disagreed with reality, and every consumer sees that state.
 *
 * The golden baseline covers this path only as far as `prepare()`, which is why
 * nothing caught it. These tests carry on into the ceremony itself.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api-functions/getUserStakeAndBakeSignature', () => ({
  getUserStakeAndBakeSignature: vi.fn(),
}));

import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature';
import { BtcDeployLbtc } from '../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc';
import { BtcDepositBtcb } from '../../../chains/btc/actions/deposit-btcb/BtcDepositBtcb';
import { BtcDepositLbtc } from '../../../chains/btc/actions/deposit-lbtc/BtcDepositLbtc';
import { AssetId, Chain } from '../../../core';
import { DefiProtocol } from '../../../defi';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import { createBtcActionHarness } from '../../harness/createBtcActionHarness';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const HELD_ADDRESS = 'tb1qexistingdeposit0000000000000000000000';
const AMOUNT = '0.001';

/**
 * The precondition every test here shares: a deposit address exists for this
 * recipient, and the authorization that produced it has lapsed. `held: false`
 * gives the same route with no stored address, which is the control.
 */
function harnessFor(held: boolean) {
  return createBtcActionHarness({
    env: Env.prod,
    api: {
      getDepositAddress: async () => (held ? HELD_ADDRESS : undefined),
      // Lapsed: the server holds no usable fee approval.
      getFeeSignature: async () => ({ hasSignature: false }),
    },
  });
}

describe('authorize() with a deposit address already held', () => {
  beforeEach(() => {
    // No stored stake-and-bake signature, so the deploy route has to sign.
    vi.mocked(getUserStakeAndBakeSignature).mockRejectedValue(
      new Error('not found'),
    );
  });

  describe('BtcDepositLbtc — the route the defect was reported on', () => {
    it('resolves to ADDRESS_READY, not READY', async () => {
      const h = harnessFor(true);
      const action = new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      expect(action.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);

      await action.authorize();

      // The whole defect in one assertion.
      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
      expect(action.depositAddress).toBe(HELD_ADDRESS);
    });

    it('still resolves to READY when no address is held', async () => {
      const h = harnessFor(false);
      const action = new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();

      expect(action.status).toBe(BtcActionStatus.READY);
      expect(action.depositAddress).toBeUndefined();
    });

    it('generateDepositAddress() returns the held address and calls no API', async () => {
      const h = harnessFor(true);
      const action = new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();

      // The documented sequence — prepare, authorize, generate — must still
      // work now that authorize() lands on ADDRESS_READY. Asserting READY
      // inside generateDepositAddress() before returning the held address is
      // what would make this throw INVALID_STATE.
      await expect(action.generateDepositAddress()).resolves.toBe(HELD_ADDRESS);
      expect(h.calls.of('api', 'generateDepositAddress')).toHaveLength(0);
    });

    it('accepts a second authorize() as a no-op rather than re-signing', async () => {
      const h = harnessFor(true);
      const action = new BtcDepositLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();
      const signaturesAfterFirst = h.calls.of('evm', 'signNetworkFee').length;

      await expect(action.authorize()).resolves.toBeUndefined();

      expect(h.calls.of('evm', 'signNetworkFee')).toHaveLength(
        signaturesAfterFirst,
      );
      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
    });
  });

  /**
   * The BTC.b route reaches the same state by a different door. Its
   * destinations are all subsidized — fee authorization is required only on
   * Ethereum and Sepolia, which carry no BTC.b — so a resume never has a
   * lapsed approval to re-sign and `prepare()` reports ADDRESS_READY directly.
   *
   * That made ADDRESS_READY the status a consumer holds when it calls
   * `authorize()`, the documented next step, and ADDRESS_READY was missing
   * from the accepted list: the call threw INVALID_STATE on the resume path it
   * exists to serve.
   */
  describe('BtcDepositBtcb — authorize() at the status a resume produces', () => {
    it('is a no-op rather than an INVALID_STATE throw', async () => {
      const h = harnessFor(true);
      const action = new BtcDepositBtcb(h.ctx, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);

      await expect(action.authorize()).resolves.toBeUndefined();

      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
      // A no-op, not a silent second ceremony.
      expect(h.calls.of('evm', 'signLbtcDestination')).toHaveLength(0);
    });

    it('still resolves to READY when no address is held', async () => {
      const h = harnessFor(false);
      const action = new BtcDepositBtcb(h.ctx, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();

      expect(action.status).toBe(BtcActionStatus.READY);
      expect(h.calls.of('evm', 'signLbtcDestination')).toHaveLength(1);
    });
  });

  describe('BtcDeployLbtc — the deploy route reaches the same branch', () => {
    it('resolves to ADDRESS_READY, not READY', async () => {
      const h = harnessFor(true);
      const action = new BtcDeployLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
        protocol: DefiProtocol.BitcoinEarn,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      expect(action.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);

      await action.authorize();

      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
      expect(action.depositAddress).toBe(HELD_ADDRESS);
    });

    it('still resolves to READY when no address is held', async () => {
      const h = harnessFor(false);
      const action = new BtcDeployLbtc(h.ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        sourceChain: Chain.BITCOIN_MAINNET,
        protocol: DefiProtocol.BitcoinEarn,
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await action.authorize();

      expect(action.status).toBe(BtcActionStatus.READY);
    });
  });
});
