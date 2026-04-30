/**
 * Tests for shared types and enums
 *
 * These tests verify the structure and behavior of core SDK types.
 */

import { describe, expect, it } from 'vitest';

import {
  AssetId,
  Chain,
  type RouteParams,
  StepStatus,
  type StrategyProgress,
  StrategyStatus } from '../../core';

describe('Shared Types', () => {
  describe('AssetId Enum', () => {
    it('should define core assets', () => {
      expect(AssetId.BTC).toBe('BTC');
      expect(AssetId.LBTC).toBe('LBTC');
      expect(AssetId.BTCb).toBe('BTC.b');
      expect(AssetId.ETH).toBe('ETH');
      expect(AssetId.L_ETH).toBe('L-ETH');
    });

    it('should define V1 assets', () => {
      expect(AssetId.ZEC).toBe('ZEC');
      expect(AssetId.L_ZEC).toBe('L-ZEC');
      expect(AssetId.XRP).toBe('XRP');
      expect(AssetId.L_XRP).toBe('L-XRP');
      expect(AssetId.DOGE).toBe('DOGE');
      expect(AssetId.L_DOGE).toBe('L-DOGE');
      expect(AssetId.SOL).toBe('SOL');
      expect(AssetId.L_SOL).toBe('L-SOL');
    });

    it('should define wrapped assets', () => {
      expect(AssetId.WBTC).toBe('WBTC');
    });
  });

  describe('Chain Enum', () => {
    it('should define Bitcoin chains', () => {
      // BIP122 uses first 32 chars of genesis block hash
      expect(Chain.BITCOIN_MAINNET).toBe(
        'bip122:000000000019d6689c085ae165831e93',
      );
      expect(Chain.BITCOIN_SIGNET).toBe(
        'bip122:00000008819873e925422c1ff0f99f7c',
      );
    });

    it('should define EVM chains', () => {
      expect(Chain.ETHEREUM).toBe('eip155:1');
      expect(Chain.BASE).toBe('eip155:8453');
      expect(Chain.BSC).toBe('eip155:56');
      expect(Chain.AVALANCHE).toBe('eip155:43114');
    });

    it('should define other chains', () => {
      // Solana uses first 32 chars of genesis hash
      expect(Chain.SOLANA_MAINNET).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(Chain.SOLANA_DEVNET).toBe(
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      );
      expect(Chain.SUI_MAINNET).toBe('sui:mainnet');
      expect(Chain.STARKNET_MAINNET).toBe('starknet:SN_MAIN');
      expect(Chain.ZCASH_MAINNET).toBe('zcash:mainnet');
      expect(Chain.ZCASH_TESTNET).toBe('zcash:testnet');
      expect(Chain.RIPPLE_MAINNET).toBe('ripple:mainnet');
      expect(Chain.DOGECOIN_MAINNET).toBe('dogecoin:mainnet');
    });
  });

  describe('StrategyStatus Enum', () => {
    it('should define common statuses', () => {
      expect(StrategyStatus.IDLE).toBe('idle');
      expect(StrategyStatus.PREPARING).toBe('preparing');
      expect(StrategyStatus.READY).toBe('ready');
      expect(StrategyStatus.EXECUTING).toBe('executing');
      expect(StrategyStatus.COMPLETED).toBe('completed');
      expect(StrategyStatus.FAILED).toBe('failed');
    });
  });

  describe('StepStatus Enum', () => {
    it('should define step statuses', () => {
      expect(StepStatus.IDLE).toBe('idle');
      expect(StepStatus.PENDING).toBe('pending');
      expect(StepStatus.COMPLETE).toBe('complete');
      expect(StepStatus.FAILED).toBe('failed');
    });
  });

  describe('StrategyProgress Interface', () => {
    it('should accept valid progress objects', () => {
      const progress: StrategyProgress<StrategyStatus> = {
        status: StrategyStatus.EXECUTING,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.PENDING },
        metadata: {
          txHash: '0x123' } };

      expect(progress.status).toBe(StrategyStatus.EXECUTING);
      expect(progress.steps.approval).toBe(StepStatus.COMPLETE);
      expect(progress.metadata?.txHash).toBe('0x123');
    });

    it('should allow confirmations tracking', () => {
      const progress: StrategyProgress<StrategyStatus> = {
        status: StrategyStatus.EXECUTING,
        steps: {},
        confirmations: 2,
        requiredConfirmations: 6 };

      expect(progress.confirmations).toBe(2);
      expect(progress.requiredConfirmations).toBe(6);
    });
  });

  describe('RouteParams Interface', () => {
    it('should accept basic route params', () => {
      const params: RouteParams = {
        assetIn: AssetId.BTC,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_MAINNET,
        destChain: Chain.ETHEREUM };

      expect(params.assetIn).toBe(AssetId.BTC);
      expect(params.assetOut).toBe(AssetId.LBTC);
      expect(params.sourceChain).toBe(Chain.BITCOIN_MAINNET);
      expect(params.destChain).toBe(Chain.ETHEREUM);
    });

    it('should allow optional fields', () => {
      const params: RouteParams = {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM };

      expect(params.assetOut).toBe(AssetId.LBTC);
      expect(params.assetIn).toBeUndefined();
    });
  });
});
