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
