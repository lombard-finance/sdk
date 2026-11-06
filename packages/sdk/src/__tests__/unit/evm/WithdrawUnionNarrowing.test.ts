/**
 * The shape the migration guide tells callers to use
 *
 * A caller holding a runtime `AssetId` matches `withdraw`'s fallback overload
 * and gets the union back, so the guide recommends narrowing by capability:
 *
 *   if ('approve' in action) await action.approve();
 *
 * That pattern used to throw on the BTC.b arm every single time. `approve()`
 * asserted `NEEDS_APPROVAL`, and that route prepares straight to `READY` — the
 * allowance is read and granted inside `execute()` instead — so the status it
 * asserted was one the route never reaches. A recommended recipe that always
 * fails is worse than no recipe, and nothing covered it because the tests drove
 * each class through its own happy path rather than through the union.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { evmActions } from '../../../chains/evm/EvmActions';
import { AssetId, Chain } from '../../../core';
import type { AnyModule } from '../../../modules';

function stubModules(): readonly AnyModule[] {
  return (['api', 'btc', 'evm'] as const).map(
    (id) => ({ id, register: () => ({}) }) as unknown as AnyModule,
  );
}

const config = {
  env: Env.prod,
  providers: {},
  modules: stubModules(),
} as never;

const chains = {
  sourceChain: Chain.ETHEREUM,
  destChain: Chain.BITCOIN_MAINNET,
};

describe('narrowing the withdraw union by capability', () => {
  const evm = evmActions(config);

  it('the BTC.b arm carries approve', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    expect('approve' in action).toBe(true);
  });

  /**
   * The regression. Resolving quietly is the contract: the route needs an
   * allowance, but `execute()` is what grants it, so there is nothing here for
   * the caller to drive and nothing to fail about.
   */
  it('calling approve on the BTC.b arm resolves instead of throwing', async () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    await expect(
      (action as unknown as { approve(): Promise<void> }).approve(),
    ).resolves.toBeUndefined();
  });

  it('and leaves the action where it was, having done nothing', async () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });
    const before = action.status;

    await (action as unknown as { approve(): Promise<void> }).approve();

    expect(action.status).toBe(before);
  });

  /**
   * `needsApproval` reports false on this route for the same reason. It is not
   * a stale default: there is no approval for the caller to make.
   */
  it('reports no approval step, because execute() owns it', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    expect(
      (action as unknown as { needsApproval: boolean }).needsApproval,
    ).toBe(false);
  });

  it('the LBTC arm has no approve to narrow onto', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });

    expect('approve' in action).toBe(false);
  });
});
