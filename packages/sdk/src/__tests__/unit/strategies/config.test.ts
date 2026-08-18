import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import {
  DEFAULT_STRATEGY_ID,
  findStaticDepositAsset,
  getStrategyChainIds,
  getStrategyDefinition,
  getStrategyDeployment,
  resolveStrategy,
  STRATEGIES,
} from '../../../strategies/lib/config';

describe('strategies/config', () => {
  it('registers BTCoc as the default strategy', () => {
    expect(DEFAULT_STRATEGY_ID).toBe('btcoc');
    expect(STRATEGIES[DEFAULT_STRATEGY_ID]).toBeDefined();
    expect(getStrategyDefinition().name).toBe('BTCoc');
  });

  it('resolves prod → Ethereum mainnet (BTCoc)', () => {
    const dep = getStrategyDeployment(Env.prod);
    expect(dep.chainId).toBe(ChainId.ethereum);
    expect(dep.contract).toBe('0xf14F678d9c05798ba61652a950a05D74aD2E0A6C');
  });

  it('resolves stage → Base Sepolia', () => {
    const dep = getStrategyDeployment(Env.stage);
    expect(dep.chainId).toBe(ChainId.baseSepoliaTestnet);
    expect(dep.contract).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('getStrategyChainIds lists the env chains', () => {
    expect(getStrategyChainIds(Env.prod)).toEqual([ChainId.ethereum]);
    expect(getStrategyChainIds(Env.stage)).toEqual([
      ChainId.baseSepoliaTestnet,
    ]);
  });

  it('resolveStrategy exposes all env chains', () => {
    expect(resolveStrategy({ env: Env.prod }).chainIds).toEqual([
      ChainId.ethereum,
    ]);
  });

  it('resolves testnet → Ethereum Sepolia', () => {
    const dep = getStrategyDeployment(Env.testnet);
    expect(dep.chainId).toBe(ChainId.sepolia);
    expect(dep.contract).toBe('0x22bB7F9FBa8Ca935E3d94732aFbF3bD38B3C2980');
    const symbols = dep.depositAssets.map((a) => a.symbol);
    expect(symbols).toEqual(['BTC.b', 'LBTC']);
  });

  it('throws for an environment with no deployment', () => {
    expect(() => getStrategyDeployment(Env.dev)).toThrow(/not deployed in env/);
  });

  it('throws for an unknown strategy id', () => {
    expect(() => getStrategyDefinition('does-not-exist')).toThrow(
      /Unknown strategy id/,
    );
  });

  it('share decimals is 8 (BTC-denominated shares)', () => {
    expect(getStrategyDefinition().decimals).toBe(8);
    expect(resolveStrategy({ env: Env.stage }).decimals).toBe(8);
  });

  it('resolveStrategy honors an explicit address override on the resolved chain', () => {
    const override = '0x0000000000000000000000000000000000009999' as const;
    const resolved = resolveStrategy({ env: Env.stage, strategy: override });
    expect(resolved.address).toBe(override);
    expect(resolved.chainId).toBe(ChainId.baseSepoliaTestnet);
  });

  it('findStaticDepositAsset resolves catalog entries case-insensitively', () => {
    const { depositAssets } = getStrategyDeployment(Env.stage);
    const lbtc = depositAssets.find((a) => a.symbol === 'LBTC');
    expect(lbtc).toBeDefined();

    const found = findStaticDepositAsset(
      depositAssets,
      lbtc!.token.toUpperCase() as `0x${string}`,
    );
    expect(found?.symbol).toBe('LBTC');
    expect(found?.decimals).toBe(8);
  });

  it('findStaticDepositAsset returns undefined for unknown asset', () => {
    const { depositAssets } = getStrategyDeployment(Env.stage);
    const res = findStaticDepositAsset(
      depositAssets,
      '0x0000000000000000000000000000000000000001',
    );
    expect(res).toBeUndefined();
  });

  it('Base Sepolia (stage) catalog contains v1 assets: LBTC, BTC.b, USDT, wETH', () => {
    const symbols = getStrategyDeployment(Env.stage).depositAssets.map(
      (a) => a.symbol,
    );
    for (const s of ['LBTC', 'BTC.b', 'USDT', 'wETH']) {
      expect(symbols).toContain(s);
    }
  });
});
