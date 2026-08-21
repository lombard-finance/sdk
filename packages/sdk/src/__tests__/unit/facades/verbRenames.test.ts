/**
 * The three-verb facade methods
 *
 * Nine overlapping verbs become three. Where the new name was free the old one
 * becomes a deprecated delegator; where two old methods describe the same verb
 * the new one dispatches on the parameter that actually distinguished them.
 *
 * The dispatch is the part worth testing hardest, because picking the wrong
 * class does not fail at the call — it fails later, inside a flow the caller has
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

describe('btc.deploy()', () => {
  const btc = btcActions(config);
  const base = {
    destChain: Chain.ETHEREUM,
    protocol: 'veda' as never,
    recipient: '0x1111111111111111111111111111111111111111',
  };

  it('routes an LBTC deploy to the stake-and-deploy action', () => {
    const action = btc.deploy({ ...base, assetOut: AssetId.LBTC });

    expect(action.constructor.name).toBe('BtcStakeAndDeploy');
  });

  it('routes a BTC.b deploy to the deposit-and-deploy action', () => {
    const action = btc.deploy({
      ...base,
      assetOut: AssetId.BTCb,
      destChain: Chain.AVALANCHE,
      protocol: 'silo' as never,
    });

    expect(action.constructor.name).toBe('BtcDepositAndDeploy');
  });

  // The two intermediate assets differ in whether the signed amount is
  // ratio-adjusted, so dispatching to the wrong one signs the wrong figure.
  it('rejects an asset with no vault route rather than guessing', () => {
    expect(() => btc.deploy({ ...base, assetOut: AssetId.WBTC })).toThrow(
      /Cannot deploy through/,
    );
  });

  it('names the assets it does support', () => {
    expect(() => btc.deploy({ ...base, assetOut: AssetId.WBTC })).toThrow(
      /LBTC/,
    );
  });

  it('keeps both old names working', () => {
    expect(
      btc.stakeAndDeploy({ ...base, assetOut: AssetId.LBTC }).constructor.name,
    ).toBe('BtcStakeAndDeploy');
    expect(
      btc.depositAndDeploy({
        ...base,
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
        protocol: 'silo' as never,
      }).constructor.name,
    ).toBe('BtcDepositAndDeploy');
  });
});

describe('solana.withdraw()', () => {
  const solana = solanaActions(config);
  const base = {
    sourceChain: Chain.SOLANA_MAINNET,
    destChain: Chain.BITCOIN_MAINNET,
  } as never;

  it('routes an LBTC withdrawal to the unstake action', () => {
    const action = solana.withdraw({
      ...(base as object),
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    } as never);

    expect(action.constructor.name).toBe('SolanaUnstake');
  });

  it('routes a BTC.b withdrawal to the redeem action', () => {
    const action = solana.withdraw({
      ...(base as object),
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    } as never);

    expect(action.constructor.name).toBe('SolanaRedeem');
  });

  it('rejects an asset it cannot withdraw', () => {
    expect(() =>
      solana.withdraw({
        ...(base as object),
        assetIn: AssetId.WBTC,
        assetOut: AssetId.BTC,
      } as never),
    ).toThrow(/Cannot withdraw/);
  });
});

describe('solana.deposit()', () => {
  const solana = solanaActions(config);

  it('is the new name for stake', () => {
    const params = {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      chain: Chain.SOLANA_MAINNET,
    } as never;

    expect(solana.deposit(params).constructor.name).toBe('SolanaStake');
    expect(solana.stake(params).constructor.name).toBe('SolanaStake');
  });
});

describe('the single-action chains', () => {
  const params = {
    assetIn: AssetId.LBTC,
    assetOut: AssetId.BTC,
    sourceChain: Chain.SUI_MAINNET,
    destChain: Chain.BITCOIN_MAINNET,
  } as never;

  it('sui exposes withdraw, with unstake delegating', () => {
    const sui = suiActions(config);

    expect(sui.withdraw(params).constructor.name).toBe('SuiUnstake');
    expect(sui.unstake(params).constructor.name).toBe('SuiUnstake');
  });

  it('starknet exposes withdraw, with unstake delegating', () => {
    const starknet = starknetActions(config);
    const starknetParams = {
      ...(params as object),
      sourceChain: Chain.STARKNET_MAINNET,
    } as never;

    expect(starknet.withdraw(starknetParams).constructor.name).toBe(
      'StarknetUnstake',
    );
    expect(starknet.unstake(starknetParams).constructor.name).toBe(
      'StarknetUnstake',
    );
  });
});

describe('evm.withdraw()', () => {
  const evm = evmActions(config);
  const assetArm = {
    sourceChain: Chain.ETHEREUM,
    destChain: Chain.BITCOIN_MAINNET,
  };

  it('keeps its 5.x meaning for the vault arm, so no existing call moves', () => {
    const action = evm.withdraw({
      protocol: 'veda' as never,
      sourceChain: Chain.ETHEREUM,
      recipient: '0x1111111111111111111111111111111111111111',
    });

    expect(action.constructor.name).toBe('EvmWithdraw');
  });

  it('routes an LBTC withdrawal to the unstake action', () => {
    const action = evm.withdraw({
      ...assetArm,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });

    expect(action.constructor.name).toBe('EvmUnstake');
  });

  it('routes a BTC.b withdrawal to the redeem action', () => {
    const action = evm.withdraw({
      ...assetArm,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
    });

    expect(action.constructor.name).toBe('EvmRedeem');
  });

  // The absence of assetIn is what marks a vault exit: the shares it burns have
  // no AssetId. Reading a protocol instead would misfire on a future route that
  // carried both.
  it('separates the arms on whether assetIn is present at all', () => {
    const vault = evm.withdraw({
      protocol: 'veda' as never,
      sourceChain: Chain.ETHEREUM,
      recipient: '0x1111111111111111111111111111111111111111',
    });
    const asset = evm.withdraw({
      ...assetArm,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });

    expect(vault.constructor.name).not.toBe(asset.constructor.name);
  });

  it('rejects an asset it cannot withdraw', () => {
    expect(() =>
      evm.withdraw({
        ...assetArm,
        assetIn: AssetId.WBTC,
        assetOut: AssetId.BTC,
      }),
    ).toThrow(/Cannot withdraw/);
  });

  it('keeps both absorbed names working', () => {
    expect(
      evm.unstake({ ...assetArm, assetIn: AssetId.LBTC, assetOut: AssetId.BTC })
        .constructor.name,
    ).toBe('EvmUnstake');
    expect(
      evm.redeem({ ...assetArm, assetIn: AssetId.BTCb, assetOut: AssetId.BTC })
        .constructor.name,
    ).toBe('EvmRedeem');
  });
});

describe('evm.claim()', () => {
  const evm = evmActions(config);
  const params = {
    assetIn: AssetId.BTCb,
    assetOut: AssetId.LBTC,
    sourceChain: Chain.ETHEREUM,
    destChain: Chain.ETHEREUM,
  };

  it('is the new name for what deposit() has always done', () => {
    expect(evm.claim(params).constructor.name).toBe('EvmDeposit');
    expect(evm.deposit(params).constructor.name).toBe('EvmDeposit');
  });

  /**
   * The reason `deposit` is not reassigned to the BTC.b-to-LBTC route in this
   * major. If these two param types ever diverge, a runtime guard becomes
   * possible and the name can move — so the identity is asserted, not assumed.
   */
  it('cannot be told apart from stake() by its parameters', () => {
    const asStake = evm.stake(params);
    const asClaim = evm.claim(params);

    expect(asStake.constructor.name).toBe('EvmStake');
    expect(asClaim.constructor.name).toBe('EvmDeposit');
    // Same input, two different actions. Nothing in the parameters distinguishes
    // them, which is why reassigning the name would be silent.
    expect(asStake.constructor.name).not.toBe(asClaim.constructor.name);
  });
});
