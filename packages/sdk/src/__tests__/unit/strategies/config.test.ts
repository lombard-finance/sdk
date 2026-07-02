import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import {
  findStaticDepositAsset,
  getDefaultStrategyAddress,
  isLombardStrategyChain,
  LOMBARD_STRATEGY,
  LOMBARD_STRATEGY_CHAINS,
  LOMBARD_STRATEGY_CONTRACTS,
  LOMBARD_STRATEGY_DECIMALS,
  LOMBARD_STRATEGY_DEPOSIT_ASSETS,
} from '../../../strategies/lib/config';

describe('strategies/config', () => {
  it('supports Ethereum mainnet (BTCoc) and Base Sepolia', () => {
    expect([...LOMBARD_STRATEGY_CHAINS]).toEqual([
      ChainId.ethereum,
      ChainId.baseSepoliaTestnet,
    ]);
  });

  it('isLombardStrategyChain narrows correctly', () => {
    expect(isLombardStrategyChain(ChainId.baseSepoliaTestnet)).toBe(true);
    expect(isLombardStrategyChain(ChainId.ethereum)).toBe(true);
    expect(isLombardStrategyChain(0)).toBe(false);
  });

  it('mainnet BTCoc strategy address is registered', () => {
    const addr = getDefaultStrategyAddress(ChainId.ethereum);
    expect(addr).toBe('0xf14F678d9c05798ba61652a950a05D74aD2E0A6C');
  });

  it('getDefaultStrategyAddress matches the canonical contract map', () => {
    const addr = getDefaultStrategyAddress(ChainId.baseSepoliaTestnet);
    expect(addr).toBe(LOMBARD_STRATEGY_CONTRACTS[ChainId.baseSepoliaTestnet]);
    expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('share decimals constant is 8 (BTC-denominated shares)', () => {
    expect(LOMBARD_STRATEGY_DECIMALS).toBe(8);
    expect(LOMBARD_STRATEGY.decimals).toBe(8);
  });

  it('findStaticDepositAsset resolves catalog entries case-insensitively', () => {
    const lbtc = LOMBARD_STRATEGY_DEPOSIT_ASSETS[
      ChainId.baseSepoliaTestnet
    ].find((a) => a.symbol === 'LBTC');
    expect(lbtc).toBeDefined();

    const found = findStaticDepositAsset(
      ChainId.baseSepoliaTestnet,
      lbtc!.token.toUpperCase() as `0x${string}`,
    );
    expect(found?.symbol).toBe('LBTC');
    expect(found?.decimals).toBe(8);
  });

  it('findStaticDepositAsset returns undefined for unknown asset', () => {
    const res = findStaticDepositAsset(
      ChainId.baseSepoliaTestnet,
      '0x0000000000000000000000000000000000000001',
    );
    expect(res).toBeUndefined();
  });

  it('catalog contains v1 assets: LBTC, BTC.b, USDT, wETH', () => {
    const symbols = LOMBARD_STRATEGY_DEPOSIT_ASSETS[
      ChainId.baseSepoliaTestnet
    ].map((a) => a.symbol);
    for (const s of ['LBTC', 'BTC.b', 'USDT', 'wETH']) {
      expect(symbols).toContain(s);
    }
  });
});
