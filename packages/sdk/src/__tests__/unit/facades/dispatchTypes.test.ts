/**
 * The dispatching verbs must return the type they actually construct
 *
 * `verbRenames.test.ts` asserts the class each verb builds, which is a runtime
 * fact. It passed while the static types were wrong, and that gap hid a real
 * defect: `evm.withdraw` had three overloads, and because `EvmUnstakeParams` and
 * `EvmRedeemParams` were structurally identical, the third was unreachable. A
 * BTC.b withdrawal resolved to `IEvmUnstake` while returning an `EvmRedeem` at
 * runtime — so the compiler *forbade* `approve()`, the step that route requires.
 *
 * The fix was to type each discriminant as the literal the facade dispatches on.
 * These are the assertions that keep it true. They are compile-time checks
 * written as runtime tests so a regression shows up as a failing build with a
 * name attached, rather than as a type nobody inspected.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import type { BtcAssetDeployParams } from '../../../chains/btc/BtcActions';
import { btcActions } from '../../../chains/btc/BtcActions';
import type { EvmAssetWithdrawParams } from '../../../chains/evm/EvmActions';
import { evmActions } from '../../../chains/evm/EvmActions';
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

    assertExact<typeof action, ReturnType<typeof evm.unstake>>(true);
    expect(action.constructor.name).toBe('EvmUnstake');
  });

  /**
   * The case that was broken. `approve()` exists on the redeem interface and
   * not on unstake's, so a mis-resolved overload does not merely mislabel the
   * result — it removes the method the caller has to call.
   */
  it('types a BTC.b withdrawal as a redeem, with approve() reachable', () => {
    const action = evm.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, ReturnType<typeof evm.redeem>>(true);
    expect(typeof action.approve).toBe('function');
    expect(action.constructor.name).toBe('EvmRedeem');
  });

  it('types a vault exit as a withdraw', () => {
    const action = evm.withdraw({
      protocol: 'veda' as never,
      sourceChain: Chain.ETHEREUM,
      recipient: '0x1111111111111111111111111111111111111111',
    });

    assertExact<typeof action, ReturnType<typeof evm.unstake>>(false as never);
    expect(action.constructor.name).toBe('EvmWithdraw');
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
      ReturnType<typeof evm.unstake> | ReturnType<typeof evm.redeem>
    >(true);
    expect(action.constructor.name).toBe('EvmRedeem');
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

    assertExact<typeof action, ReturnType<typeof solana.unstake>>(true);
    expect(action.constructor.name).toBe('SolanaUnstake');
  });

  it('types a BTC.b withdrawal as a redeem', () => {
    const action = solana.withdraw({
      ...chains,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    assertExact<typeof action, ReturnType<typeof solana.redeem>>(true);
    expect(action.constructor.name).toBe('SolanaRedeem');
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
      ReturnType<typeof solana.unstake> | ReturnType<typeof solana.redeem>
    >(true);
    expect(action.constructor.name).toBe('SolanaUnstake');
  });
});

describe('btc.deploy', () => {
  const btc = btcActions(config);
  const base = {
    destChain: Chain.ETHEREUM,
    protocol: 'veda' as never,
    recipient: '0x1111111111111111111111111111111111111111',
  };

  it('types an LBTC deploy as stake-and-deploy', () => {
    const action = btc.deploy({ ...base, assetOut: AssetId.LBTC });

    assertExact<typeof action, ReturnType<typeof btc.stakeAndDeploy>>(true);
    expect(action.constructor.name).toBe('BtcStakeAndDeploy');
  });

  it('types a BTC.b deploy as deposit-and-deploy', () => {
    const action = btc.deploy({
      ...base,
      assetOut: AssetId.BTCb,
      destChain: Chain.AVALANCHE,
      protocol: 'silo' as never,
    });

    assertExact<typeof action, ReturnType<typeof btc.depositAndDeploy>>(true);
    expect(action.constructor.name).toBe('BtcDepositAndDeploy');
  });

  it('hands a runtime asset back the union', () => {
    const fromAForm: BtcAssetDeployParams = {
      ...base,
      assetOut: AssetId.LBTC as AssetId,
    };

    const action = btc.deploy(fromAForm);

    assertExact<
      typeof action,
      | ReturnType<typeof btc.stakeAndDeploy>
      | ReturnType<typeof btc.depositAndDeploy>
    >(true);
    expect(action.constructor.name).toBe('BtcStakeAndDeploy');
  });
});

/**
 * The deprecated verbs must keep accepting what v5 accepted
 *
 * A deprecated delegator exists so existing callers keep compiling. Narrowing
 * `assetIn` for the dispatching verbs initially narrowed these too, which broke
 * the exact shape a v5 caller has: one params object built once, with the method
 * chosen by a boolean, so `assetIn` is a union of both literals. The app does
 * precisely that, and it stopped compiling.
 *
 * These take the widened parameters instead. Each one builds a single known
 * class, so it has no dispatching to do and no need of the discriminant.
 */
describe('the deprecated verbs', () => {
  const evm = evmActions(config);
  const solana = solanaActions(config);
  const btc = btcActions(config);

  it('accept an asset that is only known at runtime', () => {
    // The v5 shape: built once, method picked separately.
    const params = {
      assetIn: AssetId.LBTC as AssetId,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    };

    expect(evm.unstake(params).constructor.name).toBe('EvmUnstake');
    expect(evm.redeem(params).constructor.name).toBe('EvmRedeem');
  });

  it('still return the precise interface, since the route is fixed by the name', () => {
    const params = {
      assetIn: AssetId.LBTC as AssetId,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    };

    // Widening the input must not widen the output: `redeem` is still the only
    // arm with `approve()`, and a caller of it needs to reach that.
    assertExact<ReturnType<typeof evm.redeem>, ReturnType<typeof evm.unstake>>(
      false as never,
    );
    expect(typeof evm.redeem(params).approve).toBe('function');
  });

  it('does the same on solana', () => {
    const chains = {
      sourceChain: Chain.SOLANA_MAINNET,
      destChain: Chain.BITCOIN_MAINNET,
    };

    expect(
      solana.unstake({
        ...chains,
        assetIn: AssetId.LBTC as AssetId,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('SolanaUnstake');
    expect(
      solana.redeem({
        ...chains,
        assetIn: AssetId.BTCb as AssetId,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('SolanaRedeem');
  });

  it('does the same for the two BTC deploys', () => {
    expect(
      btc.stakeAndDeploy({
        assetOut: AssetId.LBTC as AssetId,
        destChain: Chain.ETHEREUM,
        protocol: 'veda' as never,
      }).constructor.name,
    ).toBe('BtcStakeAndDeploy');
    expect(
      btc.depositAndDeploy({
        assetOut: AssetId.BTCb as AssetId,
        destChain: Chain.AVALANCHE,
        protocol: 'silo' as never,
      }).constructor.name,
    ).toBe('BtcDepositAndDeploy');
  });

  /**
   * Widening is type-level only. Each of these builds one route and still
   * validates the asset it was handed, so a caller that widened the type has
   * not also switched the guard off — the first version of this file passed the
   * same object to both methods and was rejected at runtime by exactly that.
   */
  it('still rejects an asset its own route cannot serve', () => {
    expect(() =>
      btc.depositAndDeploy({
        assetOut: AssetId.LBTC as AssetId,
        destChain: Chain.AVALANCHE,
        protocol: 'silo' as never,
      }),
    ).toThrow(/not supported for deposit and deploy/);
  });
});
