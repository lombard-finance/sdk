import { describe, expect, it } from 'vitest';

import {
  buildAssetGlossary,
  LOMBARD_ASSETS,
  LOMBARD_ASSETS_GLOSSARY,
  resolveAssetByAddress,
  resolveAssetByName,
} from '../assets';
import { LOMBARD_SYSTEM_PROMPT } from '../prompt';

describe('LOMBARD_ASSETS', () => {
  it('includes LBTC, BTC.b, and BTCe at minimum', () => {
    const symbols = LOMBARD_ASSETS.map((a) => a.symbol);
    expect(symbols).toContain('LBTC');
    expect(symbols).toContain('BTC.b');
    expect(symbols).toContain('BTCe');
  });

  it('marks LBTC and BTCe as yield-bearing and BTC.b as not', () => {
    const lbtc = LOMBARD_ASSETS.find((a) => a.symbol === 'LBTC');
    const btcb = LOMBARD_ASSETS.find((a) => a.symbol === 'BTC.b');
    const btce = LOMBARD_ASSETS.find((a) => a.symbol === 'BTCe');
    expect(lbtc?.isYieldBearing).toBe(true);
    expect(btcb?.isYieldBearing).toBe(false);
    expect(btce?.isYieldBearing).toBe(true);
  });

  it('has BTCe addresses on Ethereum, Base, and BSC', () => {
    const btce = LOMBARD_ASSETS.find((a) => a.symbol === 'BTCe');
    expect(btce?.addresses[1]).toBeTruthy(); // ethereum
    expect(btce?.addresses[8453]).toBeTruthy(); // base
    expect(btce?.addresses[56]).toBeTruthy(); // bsc
  });

  it('has LBTC addresses on Ethereum mainnet and Sepolia (pulled from SDK)', () => {
    const lbtc = LOMBARD_ASSETS.find((a) => a.symbol === 'LBTC');
    expect(lbtc?.addresses[1]).toBeTruthy(); // ethereum
    expect(lbtc?.addresses[11155111]).toBeTruthy(); // sepolia
  });
});

describe('resolveAssetByName', () => {
  it('resolves canonical symbols (case-insensitive)', () => {
    expect(resolveAssetByName('LBTC')?.symbol).toBe('LBTC');
    expect(resolveAssetByName('lbtc')?.symbol).toBe('LBTC');
    expect(resolveAssetByName('BTC.b')?.symbol).toBe('BTC.b');
    expect(resolveAssetByName('BTCe')?.symbol).toBe('BTCe');
  });

  it('resolves common aliases', () => {
    expect(resolveAssetByName('BTCb')?.symbol).toBe('BTC.b');
    expect(resolveAssetByName('Lombard BTC')?.symbol).toBe('LBTC');
    expect(resolveAssetByName('Bitcoin Earn vault share')?.symbol).toBe('BTCe');
    expect(resolveAssetByName('Bitcoin Earn token')?.symbol).toBe('BTCe');
  });

  it('returns undefined for unknown tokens', () => {
    expect(resolveAssetByName('DOGE')).toBeUndefined();
    expect(resolveAssetByName('')).toBeUndefined();
    expect(resolveAssetByName('   ')).toBeUndefined();
  });
});

describe('resolveAssetByAddress', () => {
  it('resolves a known BTCe address on Ethereum', () => {
    const btce = LOMBARD_ASSETS.find((a) => a.symbol === 'BTCe');
    const addr = btce?.addresses[1];
    expect(addr).toBeTruthy();
    expect(resolveAssetByAddress(1, addr!)?.symbol).toBe('BTCe');
    // case-insensitive
    expect(resolveAssetByAddress(1, addr!.toUpperCase())?.symbol).toBe('BTCe');
  });

  it('returns undefined when the address is on a different chain', () => {
    const btce = LOMBARD_ASSETS.find((a) => a.symbol === 'BTCe');
    const addr = btce?.addresses[1];
    // ChainId 42 (kovan, defunct) — no BTCe deployed
    expect(resolveAssetByAddress(42, addr!)).toBeUndefined();
  });

  it('returns undefined for an unknown address', () => {
    expect(
      resolveAssetByAddress(1, '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'),
    ).toBeUndefined();
  });
});

describe('buildAssetGlossary / LOMBARD_ASSETS_GLOSSARY', () => {
  it("contains every asset's symbol", () => {
    const glossary = buildAssetGlossary();
    for (const a of LOMBARD_ASSETS) {
      expect(glossary).toContain(`**${a.symbol}**`);
    }
  });

  it('is included in LOMBARD_SYSTEM_PROMPT (auto-injected)', () => {
    expect(LOMBARD_SYSTEM_PROMPT).toContain(LOMBARD_ASSETS_GLOSSARY);
    expect(LOMBARD_SYSTEM_PROMPT).toContain('**BTCe**');
    expect(LOMBARD_SYSTEM_PROMPT).toContain('Bitcoin Earn vault share');
  });
});
