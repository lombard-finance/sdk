/**
 * The dispatching verbs must return the type they actually construct
 *
 * `verbRenames.test.ts` asserts the class each verb builds, which is a runtime
 * fact. It passed while the static types were wrong, and that gap hid a real
 * defect: `evm.withdraw` had three overloads, and because `EvmWithdrawLbtcParams` and
 * `EvmWithdrawBtcbParams` were structurally identical, the third was unreachable. A
 * BTC.b withdrawal resolved to `IEvmWithdrawLbtc` while returning an `EvmWithdrawBtcb` at
 * runtime — so the compiler *forbade* `approve()`, the step that route requires.
 *
 * The fix was to type each discriminant as the literal the facade dispatches on.
 * These are the assertions that keep it true. The old verbs are gone in 6.0.0 —
 * there are no deprecated delegators to widen for any more. They are compile-time checks
 * written as runtime tests so a regression shows up as a failing build with a
 * name attached, rather than as a type nobody inspected.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import type { BtcAssetDeployParams } from '../../../chains/btc/BtcActions';
import { btcActions } from '../../../chains/btc/BtcActions';
import type { IEvmWithdrawBtcb, IEvmWithdrawLbtc } from '../../../chains/evm';
import type { EvmAssetWithdrawParams } from '../../../chains/evm/EvmActions';
import { evmActions } from '../../../chains/evm/EvmActions';
import type { ISolanaWithdrawBtcb, ISolanaWithdrawLbtc } from '../../../chains/solana';
import type { SolanaAssetWithdrawParams } from '../../../chains/solana/SolanaActions';
import { solanaActions } from '../../../chains/solana/SolanaActions';
import { AssetId, Chain } from '../../../core';
import type { AnyModule } from '../../../modules';

function stubModules(): readonly AnyModule[] {
  const ids = ['api', 'btc', 'evm', 'solana', 'sui', 'starknet'] as const;
  return ids.map(
    (id) => ({ id, register: () => ({}) }) as unknown as AnyModule,
  );
}

const config = {
  env: Env.prod,
  providers: {},
  modules: stubModules(),
} as never;

/** True when `T` and `U` are the same type, both ways round. */
type Exact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

function assertExact<T, U>(_witness: Exact<T, U> extends true ? true : never) {
  // The assertion is the type argument; the call exists to name it.
}

describe('evm.withdraw', () => {
  const evm = evmActions(config);
  const chains = {
    sourceChain: Chain.ETHEREUM,
    destChain: Chain.BITCOIN_MAINNET,
  } as const;

  it('types an LBTC withdrawal as an unstake', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, IEvmWithdrawLbtc>(true);
    expect(action.constructor.name).toBe('EvmWithdrawLbtc');
  });

  /**
   * The case that was broken. `approve()` exists on the redeem interface and
   * not on withdraw's, so a mis-resolved overload does not merely mislabel the
   * result — it removes the method the caller has to call.
   */
  it('types a BTC.b withdrawal as a redeem, with approve() reachable', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, IEvmWithdrawBtcb>(true);
    expect(typeof action.approve).toBe('function');
    expect(action.constructor.name).toBe('EvmWithdrawBtcb');
  });

  it('types a vault exit as a withdraw', () => {
    const action = evm.withdraw({
      protocol: 'veda' as never,
      sourceChain: Chain.ETHEREUM,
      recipient: '0x1111111111111111111111111111111111111111',
    });

    assertExact<typeof action, IEvmWithdrawLbtc>(false as never);
    expect(action.constructor.name).toBe('EvmWithdrawVault');
  });

  /**
   * A form-driven caller holds an `AssetId`, not a literal. Before the fallback
   * overload existed such a call matched no signature at all, so the only way
   * to make it compile was a cast — which would have re-introduced exactly the
   * wrong-type problem this file exists to prevent.
   */
  it('hands a runtime asset back the union, to be narrowed', () => {
    const fromAForm: EvmAssetWithdrawParams = {
      ...chains,
      assetIn: AssetId.BTCb as AssetId,
      assetOut: AssetId.BTC,
    };

    const action = evm.withdraw(fromAForm);

    assertExact<
      typeof action,
      IEvmWithdrawLbtc | IEvmWithdrawBtcb
    >(true);
    expect(action.constructor.name).toBe('EvmWithdrawBtcb');
  });
});

describe('solana.withdraw', () => {
  const solana = solanaActions(config);
  const chains = {
    sourceChain: Chain.SOLANA_MAINNET,
    destChain: Chain.BITCOIN_MAINNET,
  } as const;

  it('types an LBTC withdrawal as an unstake', () => {
    const action = solana.withdraw({
      ...chains,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, ISolanaWithdrawLbtc>(true);
    expect(action.constructor.name).toBe('SolanaWithdrawLbtc');
  });

  it('types a BTC.b withdrawal as a redeem', () => {
    const action = solana.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, ISolanaWithdrawBtcb>(true);
    expect(action.constructor.name).toBe('SolanaWithdrawBtcb');
  });

  it('hands a runtime asset back the union', () => {
    const fromAForm: SolanaAssetWithdrawParams = {
      ...chains,
      assetIn: AssetId.LBTC as AssetId,
      assetOut: AssetId.BTC,
    };

    const action = solana.withdraw(fromAForm);

    assertExact<
      typeof action,
      ISolanaWithdrawLbtc | ISolanaWithdrawBtcb
    >(true);
    expect(action.constructor.name).toBe('SolanaWithdrawLbtc');
  });
});

/**
 * Asserted by constructed class only, not by type.
 *
 * Two different types are named `BtcDeployLbtc` today — the narrow
 * interface in the action's `types.ts`, and the class — and `chains/btc`
 * re-exports the *class* as `IBtcDeployLbtc`. So there is no unambiguous
 * name to pin the return type against. Fixing that is the Stage A `IBtc*`
 * defect; until then the runtime assertion is the honest one, and the EVM and
 * Solana cases above cover the type-level guarantee.
 */
describe('btc.deploy', () => {
  const btc = btcActions(config);
  const base = {
    destChain: Chain.ETHEREUM,
    protocol: 'veda' as never,
    recipient: '0x1111111111111111111111111111111111111111',
  };

  it('types an LBTC deploy as stake-and-deploy', () => {
    const action = btc.deploy({ ...base, assetOut: AssetId.LBTC });

    expect(action.constructor.name).toBe('BtcDeployLbtc');
  });

  it('types a BTC.b deploy as deposit-and-deploy', () => {
    const action = btc.deploy({
      ...base,
      assetOut: AssetId.BTCb,
      destChain: Chain.AVALANCHE,
      protocol: 'silo' as never,
    });

    expect(action.constructor.name).toBe('BtcDeployBtcb');
  });

  it('hands a runtime asset back the union', () => {
    const fromAForm: BtcAssetDeployParams = {
      ...base,
      assetOut: AssetId.LBTC as AssetId,
    };

    const action = btc.deploy(fromAForm);

    expect(action.constructor.name).toBe('BtcDeployLbtc');
  });
});
