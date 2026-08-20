/**
 * `BtcDeposit.authorize()` and the two methods it replaces
 *
 * Stage C collapses `authorizeFee()` and `confirmAddress()` into one
 * `authorize()` that picks its ceremony from the route. The two old names stay
 * as deprecated delegators, and the promise sold to integrators is that they
 * behave identically — including the guards, which are the part a delegation
 * is most likely to lose.
 *
 * The goldens cover the sequences. This covers the equivalence: same service
 * calls, same terminal status, same throw on the wrong route.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it } from 'vitest';

import { BtcDeposit } from '../../../chains/btc/actions/deposit/BtcDeposit';
import { AssetId, Chain } from '../../../core';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import { createBtcActionHarness } from '../../harness/createBtcActionHarness';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const AMOUNT = '0.01';

/**
 * Avalanche + BTC.b has no fee auth config, so the route confirms an address.
 * That is the branch `confirmAddress()` served.
 */
function addressRoute() {
  const harness = createBtcActionHarness({ env: Env.prod });
  const action = new BtcDeposit(harness.ctx, {
    assetOut: AssetId.BTCb,
    destChain: Chain.AVALANCHE,
  });
  harness.observe(action);
  return { harness, action };
}

describe('the address-confirmation route', () => {
  let subject: ReturnType<typeof addressRoute>;

  beforeEach(() => {
    subject = addressRoute();
  });

  it('reaches NEEDS_ADDRESS_CONFIRMATION after prepare', async () => {
    await subject.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

    expect(subject.action.status).toBe(
      BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION,
    );
  });

  it('authorize() and confirmAddress() make the same calls', async () => {
    const viaNew = addressRoute();
    await viaNew.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
    await viaNew.action.authorize();

    const viaOld = addressRoute();
    await viaOld.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
    await viaOld.action.confirmAddress();

    expect(viaNew.harness.calls.sequence()).toEqual(
      viaOld.harness.calls.sequence(),
    );
    expect(viaNew.action.status).toBe(viaOld.action.status);
    expect(viaNew.action.status).toBe(BtcActionStatus.READY);
  });

  it('authorize() and confirmAddress() emit the same statuses', async () => {
    const viaNew = addressRoute();
    await viaNew.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
    await viaNew.action.authorize();

    const viaOld = addressRoute();
    await viaOld.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
    await viaOld.action.confirmAddress();

    expect(viaNew.harness.statuses).toEqual(viaOld.harness.statuses);
  });

  // The guard is the whole reason the two methods existed separately. A
  // delegation that dropped it would let a caller sign the wrong thing.
  it('authorizeFee() still refuses a route that needs no fee', async () => {
    await subject.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

    await expect(subject.action.authorizeFee()).rejects.toThrow(
      /not required for this destination/,
    );
  });

  it('is idempotent at READY, for all three spellings', async () => {
    await subject.action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
    await subject.action.authorize();

    const afterFirst = subject.harness.calls.sequence().length;

    await subject.action.authorize();
    await subject.action.confirmAddress();
    await subject.action.authorizeFee();

    // No further signing: a retry after partial failure and a double-click both
    // cost one signature.
    expect(subject.harness.calls.sequence()).toHaveLength(afterFirst);
    expect(subject.action.status).toBe(BtcActionStatus.READY);
  });

  it('rejects authorize() before prepare()', async () => {
    await expect(subject.action.authorize()).rejects.toThrow();
  });
});

describe('what authorize() replaces', () => {
  it('is declared on the action, alongside both deprecated names', () => {
    const { action } = addressRoute();

    expect(typeof action.authorize).toBe('function');
    expect(typeof action.authorizeFee).toBe('function');
    expect(typeof action.confirmAddress).toBe('function');
  });
});
