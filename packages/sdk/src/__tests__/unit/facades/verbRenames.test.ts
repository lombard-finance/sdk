/**
 * The three-verb vocabulary
 *
 * Nine overlapping verbs became three. In 6.0.0 the old names are **gone** — no
 * deprecated delegators — so this pins two things: that each surviving verb
 * builds the right action, and that the removed names are actually absent rather
 * than quietly still there.
 *
 * The dispatch is the part worth testing hardest, because picking the wrong
 * class does not fail at the call. It fails later, inside a flow the caller has
 * already started, possibly after a signature.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { btcActions } from '../../../chains/btc/BtcActions';
import { evmActions } from '../../../chains/evm/EvmActions';
import { solanaActions } from '../../../chains/solana/SolanaActions';
import { starknetActions } from '../../../chains/starknet/StarknetActions';
import { suiActions } from '../../../chains/sui/SuiActions';
import { AssetId, Chain } from '../../../core';
import type { AnyModule } from '../../../modules';

/**
 * The facades build their context lazily and the capability registry refuses an
 * unregistered module, so every chain a facade might reach has to be present.
 * The services are irrelevant here: this asserts which class a verb resolves
 * to, not anything a service does.
 */
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

describe('the removed verbs are gone', () => {
  /**
   * Asserted by name rather than left to the compiler.
   *
   * A consumer on plain JavaScript gets no type error from calling a verb that
   * no longer exists — they get `undefined is not a function` at the call site.
   * And a delegator quietly left behind would keep the old vocabulary alive in
   * every example anyone copies, which is what this release is for.
   */
  const removed = {
    btc: ['stake', 'stakeAndDeploy', 'depositAndDeploy'],
    evm: ['stake', 'unstake', 'redeem'],
    solana: ['stake', 'unstake', 'redeem'],
    sui: ['unstake'],
    starknet: ['unstake'],
  } as const;

  const facades: Record<string, object> = {
    btc: btcActions(config),
    evm: evmActions(config),
    solana: solanaActions(config),
    sui: suiActions(config),
    starknet: starknetActions(config),
  };

  for (const [chain, verbs] of Object.entries(removed)) {
    for (const verb of verbs) {
      it(`${chain}.${verb}() no longer exists`, () => {
        expect(
          (facades[chain] as Record<string, unknown>)[verb],
        ).toBeUndefined();
      });
    }
  }
});

describe('btc.deposit()', () => {
  const btc = btcActions(config);
  const base = { destChain: Chain.ETHEREUM };

  /**
   * The two BTC deposit routes were `stake` (LBTC) and `deposit` (BTC.b). Their
   * parameters are identical apart from the output asset, so one verb
   * dispatching on it is the whole difference.
   */
  it('routes an LBTC deposit to the stake action', () => {
    expect(
      btc.deposit({ ...base, assetOut: AssetId.LBTC }).constructor.name,
    ).toBe('BtcDepositLbtc');
  });

  it('routes a BTC.b deposit to the deposit action', () => {
    expect(
      btc.deposit({ ...base, assetOut: AssetId.BTCb }).constructor.name,
    ).toBe('BtcDepositBtcb');
  });

  it('rejects an asset neither route mints, rather than guessing', () => {
    expect(() =>
      btc.deposit({ ...base, assetOut: AssetId.WBTC as never }),
    ).toThrow(/Cannot deposit BTC as/);
  });

  it('names the assets it does support', () => {
    expect(() =>
      btc.deposit({ ...base, assetOut: AssetId.WBTC as never }),
    ).toThrow(/LBTC/);
  });
});

describe('btc.deploy()', () => {
  const btc = btcActions(config);
  const base = {
    destChain: Chain.ETHEREUM,
    protocol: 'veda' as never,
    recipient: '0x1111111111111111111111111111111111111111',
  };

  it('routes an LBTC deploy to the stake-and-deploy action', () => {
    expect(
      btc.deploy({ ...base, assetOut: AssetId.LBTC }).constructor.name,
    ).toBe('BtcDeployLbtc');
  });

  it('routes a BTC.b deploy to the deposit-and-deploy action', () => {
    expect(
      btc.deploy({
        ...base,
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
        protocol: 'silo' as never,
      }).constructor.name,
    ).toBe('BtcDeployBtcb');
  });

  // The two intermediate assets differ in whether the signed amount is
  // ratio-adjusted, so dispatching to the wrong one signs the wrong figure.
  it('rejects an asset with no vault route', () => {
    expect(() =>
      btc.deploy({ ...base, assetOut: AssetId.WBTC as never }),
    ).toThrow(/Cannot deploy through/);
  });
});

describe('evm.deposit() and evm.claim()', () => {
  const evm = evmActions(config);
  const params = {
    assetIn: AssetId.BTCb,
    assetOut: AssetId.LBTC,
    sourceChain: Chain.ETHEREUM,
    destChain: Chain.ETHEREUM,
  };

  /**
   * `deposit` is the former `stake`: an asset becomes its L-asset, which is what
   * the verb means everywhere else.
   */
  it('deposit builds the stake action', () => {
    expect(evm.deposit(params).constructor.name).toBe('EvmDepositBtcb');
  });

  /**
   * And `claim` is the former `deposit` — claiming a pending BTC.b deposit as
   * LBTC. Reassigning `deposit` was only safe once `claim` existed to carry the
   * old meaning, because the two take identical parameters: nothing but the verb
   * name distinguishes them.
   */
  it('claim builds the deposit action', () => {
    expect(evm.claim(params).constructor.name).toBe('EvmClaim');
  });

  it('they are different actions for the same parameters', () => {
    expect(evm.deposit(params).constructor.name).not.toBe(
      evm.claim(params).constructor.name,
    );
  });
});

describe('evm.withdraw()', () => {
  const evm = evmActions(config);
  const assetArm = {
    sourceChain: Chain.ETHEREUM,
    destChain: Chain.BITCOIN_MAINNET,
  };

  it('routes an LBTC withdrawal to the unstake action', () => {
    expect(
      evm.withdraw({
        ...assetArm,
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('EvmWithdrawLbtc');
  });

  it('routes a BTC.b withdrawal to the redeem action', () => {
    expect(
      evm.withdraw({
        ...assetArm,
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('EvmWithdrawBtcb');
  });

  /**
   * The vault exit keeps this verb too. The absence of `assetIn` is what marks
   * it: the shares it burns have no `AssetId`. Reading a protocol instead would
   * misfire on a future route that carried both.
   */
  it('routes a vault exit to the withdraw action', () => {
    expect(
      evm.withdraw({
        protocol: 'veda' as never,
        sourceChain: Chain.ETHEREUM,
        recipient: '0x1111111111111111111111111111111111111111',
      }).constructor.name,
    ).toBe('EvmWithdrawVault');
  });

  it('rejects an asset it cannot withdraw', () => {
    expect(() =>
      evm.withdraw({
        ...assetArm,
        assetIn: AssetId.WBTC as never,
        assetOut: AssetId.BTC,
      }),
    ).toThrow(/Cannot withdraw/);
  });
});

describe('the non-EVM chains', () => {
  it('solana.deposit builds the stake action', () => {
    const solana = solanaActions(config);

    expect(
      solana.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        chain: Chain.SOLANA_MAINNET,
      } as never).constructor.name,
    ).toBe('SolanaDepositBtcb');
  });

  it('solana.withdraw dispatches on assetIn', () => {
    const solana = solanaActions(config);
    const chains = {
      sourceChain: Chain.SOLANA_MAINNET,
      destChain: Chain.BITCOIN_MAINNET,
    };

    expect(
      solana.withdraw({
        ...chains,
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('SolanaWithdrawLbtc');
    expect(
      solana.withdraw({
        ...chains,
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
      }).constructor.name,
    ).toBe('SolanaWithdrawBtcb');
  });

  // One withdrawal each, so nothing to dispatch on.
  it('sui.withdraw and starknet.withdraw build their single action', () => {
    const params = {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      destChain: Chain.BITCOIN_MAINNET,
    };

    expect(
      suiActions(config).withdraw({
        ...params,
        sourceChain: Chain.SUI_MAINNET,
      } as never).constructor.name,
    ).toBe('SuiWithdraw');
    expect(
      starknetActions(config).withdraw({
        ...params,
        sourceChain: Chain.STARKNET_MAINNET,
      } as never).constructor.name,
    ).toBe('StarknetWithdraw');
  });
});
